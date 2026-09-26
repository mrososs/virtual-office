import type { ActivityType, RoomType } from '@virtual-office/shared';
import {
  Briefcase,
  ClipboardList,
  Compass,
  FlaskConical,
  Code,
  Coffee,
  Crown,
  DoorOpen,
  Eye,
  Gamepad2,
  Hammer,
  Laptop,
  Moon,
  Bug,
  CircleCheck,
  CircleDashed,
  TriangleAlert,
  Users,
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
  TESTING: FlaskConical,
  BLOCKED: TriangleAlert,
  MEETING: Video,
  FOCUS: Moon,
  BREAK: Coffee,
  OFFLINE: WifiOff,
  UNKNOWN: CircleDashed,
};

export const ROOM_ICONS: Record<RoomType, LucideIcon> = {
  MANAGEMENT: Crown,
  PROJECT_MANAGEMENT: ClipboardList,
  TEAM_LEAD: Compass,
  DEVELOPMENT: Code,
  QA: Bug,
  MEETING: Users,
  CODE_REVIEW: Eye,
  BREAK: Gamepad2,
  GENERAL: DoorOpen,
};

export const WORK_ICON = Briefcase;
