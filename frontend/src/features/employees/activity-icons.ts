import type { ActivityType, RoomType } from '@virtual-office/shared';
import {
  Briefcase,
  Code,
  Coffee,
  Crown,
  DoorOpen,
  Eye,
  Gamepad2,
  Hammer,
  Laptop,
  Moon,
  Palette,
  Bug,
  CircleCheck,
  CircleDashed,
  TriangleAlert,
  Users,
  Utensils,
  Video,
  WifiOff,
  type LucideIcon,
} from 'lucide-vue-next';

export const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  AVAILABLE: CircleCheck,
  WORKING: Laptop,
  CODING: Code,
  CODE_REVIEW: Eye,
  BUILDING: Hammer,
  BLOCKED: TriangleAlert,
  MEETING: Video,
  FOCUS: Moon,
  BREAK: Coffee,
  OFFLINE: WifiOff,
  UNKNOWN: CircleDashed,
};

export const ROOM_ICONS: Record<RoomType, LucideIcon> = {
  DEVELOPMENT: Code,
  DESIGN: Palette,
  QA: Bug,
  CODE_REVIEW: Eye,
  MEETING: Users,
  MANAGER: Crown,
  FOCUS: Moon,
  GAME: Gamepad2,
  KITCHEN: Utensils,
  LOUNGE: Coffee,
  GENERAL: DoorOpen,
};

export const WORK_ICON = Briefcase;
