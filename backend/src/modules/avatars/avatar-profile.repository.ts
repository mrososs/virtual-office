import { Injectable } from '@nestjs/common';
import type { AvatarAppearance, AvatarProfile, UUID } from '@virtual-office/shared';
import { unwrap, unwrapRow } from '../../common/supabase/database.error';
import { SupabaseService } from '../../common/supabase/supabase.service';

interface AvatarProfileRow {
  id: string;
  employee_id: string;
  body_type: string;
  skin_tone: string;
  hair_style: string;
  hair_color: string;
  top_style: string;
  top_color: string;
  bottom_style: string;
  bottom_color: string;
  shoes_style: string;
  accessory: string | null;
  updated_at: string;
}

const COLUMNS =
  'id, employee_id, body_type, skin_tone, hair_style, hair_color, top_style, top_color, bottom_style, bottom_color, shoes_style, accessory, updated_at';

function toProfile(row: AvatarProfileRow): AvatarProfile {
  return {
    id: row.id,
    employeeId: row.employee_id,
    bodyType: row.body_type,
    skinTone: row.skin_tone,
    hairStyle: row.hair_style,
    hairColor: row.hair_color,
    topStyle: row.top_style,
    topColor: row.top_color,
    bottomStyle: row.bottom_style,
    bottomColor: row.bottom_color,
    shoesStyle: row.shoes_style,
    accessory: row.accessory,
    updatedAt: row.updated_at,
  };
}

/**
 * Persistence adapter for the existing avatar system: `AvatarProfile` in and
 * out, `public.avatar_profiles` underneath. Values are stored exactly as the
 * shared catalog ids — nothing here knows how avatars are drawn.
 */
@Injectable()
export class AvatarProfileRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private get table() {
    return this.supabase.client.from('avatar_profiles');
  }

  async findByEmployeeId(employeeId: UUID): Promise<AvatarProfile | null> {
    const row = unwrap(await this.table.select(COLUMNS).eq('employee_id', employeeId).maybeSingle<AvatarProfileRow>(), 'avatar_profiles.findByEmployeeId');
    return row ? toProfile(row) : null;
  }

  async listAll(): Promise<AvatarProfile[]> {
    const rows = unwrap(await this.table.select(COLUMNS).returns<AvatarProfileRow[]>(), 'avatar_profiles.listAll');
    return (rows ?? []).map(toProfile);
  }

  /** One profile per employee: the first save creates it, later saves update it in place. */
  async upsert(employeeId: UUID, appearance: AvatarAppearance): Promise<AvatarProfile> {
    const row = unwrapRow(
      await this.table
        .upsert(
          {
            employee_id: employeeId,
            body_type: appearance.bodyType,
            skin_tone: appearance.skinTone,
            hair_style: appearance.hairStyle,
            hair_color: appearance.hairColor,
            top_style: appearance.topStyle,
            top_color: appearance.topColor,
            bottom_style: appearance.bottomStyle,
            bottom_color: appearance.bottomColor,
            shoes_style: appearance.shoesStyle,
            accessory: appearance.accessory,
          },
          { onConflict: 'employee_id' },
        )
        .select(COLUMNS)
        .single<AvatarProfileRow>(),
      'avatar_profiles.upsert',
    );
    return toProfile(row);
  }
}
