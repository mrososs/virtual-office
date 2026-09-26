# Avatar system

Every person in the office — the local player, scripted (NPC) teammates and
remote players in other tabs — is drawn by **one** layered avatar renderer
from a small piece of data: their `AvatarProfile`. There are no pre-rendered
character images and no per-role sprites.

Two rules drive the design:

- **Role is business data, the avatar is identity.** `Employee.role`
  (`GENERAL_MANAGER`, `DEVELOPER`, …) decides labels and the default work
  area; it never influences appearance. A General Manager and a Developer
  customize with exactly the same options.
- **Store configuration, render from it.** A profile is a set of option ids
  (`hair-curly`, `copper`, `top-hoodie`, …). Renderers turn ids into
  pictures, so options can be added without touching stored data.

## 1. Data model (`shared`)

`shared/src/types/avatar.types.ts`

```ts
interface AvatarAppearance {   // what the renderer needs
  bodyType: string;  skinTone: string;
  hairStyle: string; hairColor: string;
  topStyle: string;  topColor: string;
  bottomStyle: string; bottomColor: string;
  shoesStyle: string;
  accessory: string | null;    // null = none
}

interface AvatarProfile extends AvatarAppearance {  // what is persisted (1 per employee)
  id: UUID; employeeId: UUID; updatedAt: ISODateString;
}
```

`Employee` has no avatar fields: the profile is keyed by `employeeId`
(one-to-one), so there is a single source of truth for a person's look.

`shared/src/domain/avatar-catalog.ts` is the **catalog**: every option that
exists (ids, labels, and hex values for color options), plus:

| Helper                          | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `DEFAULT_AVATAR_APPEARANCE`     | The fallback look                                                        |
| `normalizeAvatarAppearance(x)`  | Any input → a valid appearance; unknown/missing values fall back **per field** |
| `normalizeAvatarProfile(x, id)` | Same for untrusted profiles (network, storage); forces the owner id     |
| `randomAvatarAppearance()`      | A random look built only from catalog values                            |
| `avatarAppearanceKey(a)`        | Stable identity of a look (diffing, caching)                            |
| `avatarColorHex(slot, id)`      | Color option → hex (never throws)                                        |

Because normalization is per field, a corrupted or outdated setting can
change one cosmetic but can never make a character disappear. The backend
uses the same catalog to validate realtime payloads.

## 2. Layered rendering (`frontend/src/game/avatars`)

```
game/avatars/
├── avatar.types.ts              slots, views, poses, paint context   ┐
├── avatar-frame.ts              frame geometry, pose offsets, body   │ framework-free:
│                                shapes, limb positions               │ used by Phaser AND
├── painters/*.ts                Canvas 2D drawing per layer/option   │ the Vue creator
├── AvatarAssetRegistry.ts       catalog id → painter, layer order,   │
│                                bands, texture keys                  │
├── avatar-canvas.ts             sheet painting / frame compositing   │
├── AvatarAnimationController.ts one clock for all layers             ┘
├── AvatarTextureCache.ts        refcounted, shared layer textures    ┐
├── AvatarRenderer.ts            layer sprites inside a Container     │ Phaser only
└── AvatarFactory.ts             builds renderer + controller         ┘
```

### Layers

Back to front — one sprite per slot, all children of the avatar's Container:

| Slot        | Drawn from                        | Texture key depends on             |
| ----------- | --------------------------------- | ---------------------------------- |
| `hairBack`  | long hair behind the shoulders    | hair style, hair color             |
| `body`      | skin: head, face, arms, hands, legs | body type, skin tone             |
| `bottom`    | trousers / jeans / joggers / shorts / skirt | style, color, body type  |
| `shoes`     | shoe style (color is part of it)  | style, body type                   |
| `top`       | T-shirt / polo / shirt / sweater / hoodie / blazer | style, color, body type |
| `hair`      | hair or head wrap                 | hair style, hair color             |
| `accessory` | glasses / sunglasses / headphones / lanyard | accessory, body type     |

A key only contains the inputs that layer actually depends on, so everyone
with short brown hair shares **one** hair texture regardless of clothes.

**Occlusion without coupling.** Some skin must appear *in front of*
clothing: the head over a collar, the near arm swinging in front of the
torso in the side view, hands in front of the hips. Instead of making a
shirt know the skin tone, clothing painters *cut those shapes out of
themselves* (`carve`, Canvas `destination-out`), letting the body layer
underneath show through — the same idea layered sprite kits use. Each layer
therefore stays independent and cacheable on its own. (It is also why the
compositor paints each layer on its own canvas: carving on a shared canvas
would erase the layers beneath.)

### Frames and textures

- Frame: 32 × 42 logical px, feet at y = 40 (the sprite origin, so `y` is
  also the Y-sort depth key). Three drawn views (`down`, `left`, `up`);
  facing right is the `left` view with `flipX`. Four poses: `idle`,
  `breathe`, `stepA`, `stepB`.
- Each layer is rasterized once into a sheet (poses across, views down) at
  the device texture scale (2–3×, crisp at any zoom). Sheets only cover the
  layer's vertical band (hair never needs the feet), which roughly halves
  texture memory.
- `AvatarTextureCache` shares sheets between avatars, reference-counts them
  and removes a sheet when the last avatar using it changes or leaves. Keys
  are namespaced per cache, so two caches can never delete each other's
  textures. Nothing is redrawn per frame.

### Animation

`AvatarAnimationController` is the single clock (walk at 9 fps:
`stepA, idle, stepB, idle`; idle: `idle` 1.5 s / `breathe` 0.7 s, with a
random phase so people don't breathe in unison). Each frame it decides one
`(view, pose, flip)` and hands it to the renderer, which applies it to
**every** layer at once — layers cannot drift apart, and there is no
per-layer movement or animation logic. It has no Phaser dependency: the
creator's preview runs the very same controller.

## 3. Phaser integration

```
AvatarProfile ─normalize─▶ AvatarFactory.create(container, appearance)
                                 ├─ AvatarRenderer   (7 layer sprites in the container)
                                 └─ AvatarAnimationController
```

- `Player` (and `RemotePlayer`) is a size-less **Container** at the
  avatar's feet that hosts the layers. It is the object that moves, sorts,
  fades and follows the camera; `EmployeeAvatar` still composes it with the
  shadow, ring, status badge and name label.
- The local player's Arcade body is attached to the Container: a 14 × 7 px
  feet box offset relative to the feet point (`PlayerManager`). Pointer
  hover/click uses an explicit hit rectangle (`InteractionSystem`).
- One `AvatarFactory` per office world (created in `OfficeScene`, passed to
  `PlayerManager` and `EmployeeManager`); it is destroyed with the world.
- `EmployeeAvatar.setAppearance()` re-skins in place: only layers whose key
  changed get a new texture. No scene or world reload.

## 4. Avatar Creator (Vue)

Routes:

- `/avatar` — first-time setup (and a standalone editor), onboarding layout.
- `/office/avatar` — **Edit avatar** as an overlay over the running office
  (profile menu → Edit avatar, or Settings → My profile). The office stays
  mounted and connected, so saving re-skins you live for everyone. Key
  presses stay inside the overlay (arrow keys never walk you around).

Components (`features/avatar/`): `AvatarCreator` (two columns on desktop,
stacked on small screens), `AvatarPreview` (animated, turnable, walk
toggle), `AvatarOptionGroup` (accessible radio groups: arrow keys move
and select), `AvatarOptionThumb` (each card shows *your* avatar wearing that
option). Sections come from `avatar-creator.sections.ts`, and the options
inside them always come from `AVATAR_CATALOG` — nothing is listed in
templates.

The preview, thumbnails and the small portraits used by every avatar badge
in the app (`avatar-portrait.ts`, cached data URLs) are drawn with
`drawAvatarFrame` — the same painters, layer order and controller as the
office. There is exactly one avatar rendering implementation.

Buttons: **Randomize** (catalog values only), **Reset** (discard unsaved
changes), **Save Avatar**, **Enter Office** (saves first when needed).
Changes apply to a local draft and only persist on save
(`useAvatarDraft`).

### First-time flow

```
sign in ─▶ /office ─▶ requireAvatarGuard ─▶ avatarStore.ensureLoaded()
                          ├─ profile exists ─▶ office
                          └─ none yet ───────▶ /avatar?redirect=/office ─▶ save ─▶ office
```

The check is cached per identity, so nobody recreates their avatar each
session. If profiles cannot be loaded (e.g. the API is unavailable), the
office still opens and renders the default look.

## 5. State flow and realtime sync

```
Avatar Creator ─save─▶ avatarStore ─▶ AvatarProfileRepository (demo: localStorage · prod: API)
                            │
                            ▼
                     employeeStore.avatarProfilesById  ◀── REMOTE_AVATAR_RECEIVED (bridge)
                            │ appearance key diff (useOfficeWorldSync)            ▲
                            ▼                                                     │
                GameBridge SET_EMPLOYEE_APPEARANCE ─▶ OfficeScene                  │
                            ├─ avatar.setAppearance()  (re-skin in place)          │
                            └─ local player? ─▶ AvatarSync.publish ─▶ server ─▶ other clients
```

- **On join** the client sends its profile once in `office:join`; the server
  keeps it in `OfficePresenceRegistry` and includes it in `player:joined`,
  both to peers and in the snapshot a late joiner receives.
- **On change** the client emits `player:avatar_update`; the server checks
  the owner against the token, normalizes the profile with the shared
  catalog, stores it and broadcasts `player:avatar_updated` to the rest of
  the office.
- **Movement packets never carry appearance** (`player:move` /
  `player:position` stay `{ employeeId, position, direction }`).
- Received profiles go through the employee store (one source of truth, so
  UI badges update too) and come back to Phaser as a normal appearance diff.

## 6. Persistence

- **Demo mode**: teammates' looks are seeded (`DEMO_AVATAR_LOOKS`), and the
  looks you save are kept in `localStorage` by the demo-only
  `demo-avatar-profile.repository.ts` (lazily loaded, not in non-demo
  bundles). Your own profile only exists once you saved it in this browser,
  so the first visit as any demo identity goes through setup.
- **Production**: `AvatarProfileRepository` is the boundary; the API
  implementation is stubbed with clear TODOs (`GET/PUT
  /api/avatar-profiles/me`). Nothing in the app assumes local storage.

Recommended table (see [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md)):

```
avatar_profiles
  id            uuid pk
  employee_id   uuid unique not null → employees.id
  body_type, skin_tone, hair_style, hair_color,
  top_style, top_color, bottom_style, bottom_color,
  shoes_style   text not null        -- catalog ids
  accessory     text null            -- null = none
  created_at, updated_at timestamptz
```

Plain columns rather than JSONB, to match the existing (fully columnar)
schema and keep the row 1:1 with `AvatarProfile`. Ids are validated in the
application against the catalog (so adding an option needs no migration);
only adding a new *slot* adds a nullable column. If the number of slots ever
grows well beyond a dozen, moving the cosmetics into one `appearance jsonb`
column is a straightforward migration.

## 7. Extending the catalog

All steps are data plus one painter; the compiler flags any catalog id
without artwork (painter maps are typed with the catalog's id unions).

**New hairstyle**
1. Add `{ id: 'hair-mohawk', label: 'Mohawk' }` to `AVATAR_CATALOG.hairStyle`.
2. Add `'hair-mohawk': { front: …, back: null }` to `HAIR_STYLES` in
   `painters/hair.painters.ts` (use `hairPainter` / `hairCap`; handle the
   `down`, `left` and `up` views; `carveEar` if the ear should show).

**New top**
1. Add `{ id: 'top-jacket', label: 'Jacket' }` to `AVATAR_CATALOG.topStyle`.
2. Add `'top-jacket': topPainter({ sleeves: 'long', details })` to
   `TOP_STYLES` in `painters/top.painters.ts`. `topPainter` already draws
   sleeves/torso for every body type and cuts out the head and near arm.

**New accessory**
1. Add `{ id: 'acc-cap', label: 'Cap' }` to `AVATAR_CATALOG.accessory`.
2. Add a painter to `ACCESSORY_STYLES` in `painters/accessory.painters.ts`.

**New color**
Add `{ id: 'mint', label: 'Mint', hex: '#34d399' }` to the palette
(`skinTone`, `hairColor`, `topColor` or `bottomColor`). No code needed.

**New body type** — add it to the catalog and a `BodyShape` in
`avatar-frame.ts`; clothing adapts automatically.

**New slot** (e.g. hats as their own slot) — add the field to
`AvatarAppearance`, a catalog list, a slot in `AVATAR_LAYER_ORDER` /
`AVATAR_LAYER_BANDS`, its entry in `resolveAvatarLayers`, a creator section,
and a nullable DB column.

Never rename or reuse a persisted id — add a new one; normalization maps
removed ids to the default.

## 8. Performance

Measured in Chrome (dev build, 1440 × 900, WebGL, 11 avatars, demo
simulation running, walking):

- ~60 fps (59.9 average, p95 frame 16.9 ms); Phaser step (update + render
  submission) ≈ 2.0–2.3 ms per frame.
- 11 avatars = 77 layer sprites sharing ~61 layer textures. Hiding every
  layer except the body (the old one-sprite-per-avatar equivalent) made no
  measurable difference to frame cost.
- A never-seen look costs 3.5–7 ms once (rasterizing its new layers); a look
  whose layers are cached costs ~0.2 ms.
- The per-frame path allocates nothing: frame names are precomputed, and the
  renderer only touches sprites when the visible frame actually changes.
