/**
 * Framework-free avatar API (safe for Vue to import). The Phaser classes —
 * AvatarFactory, AvatarRenderer, AvatarTextureCache — are imported directly
 * by game code only.
 */
export * from './avatar.types';
export * from './avatar-frame';
export * from './avatar-canvas';
export * from './AvatarAnimationController';
export * from './AvatarAssetRegistry';
