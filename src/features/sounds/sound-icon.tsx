import {
  AlarmClock,
  Balloon,
  Bell,
  Bug,
  ChessPawn,
  CircleDotDashed,
  Coffee,
  Crosshair,
  Drum,
  HatGlasses,
  Megaphone,
  Monitor,
  Music,
  PartyPopper,
  PawPrint,
  Plane,
  Shuffle,
  Smile,
  Sparkles,
  ThumbsDown,
  Timer,
  TrendingDown,
  TriangleAlert,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { SoundIconKey } from '@/domain/sound-icon';
import { cn } from '@/lib/utils';

/**
 * The single place where a serializable icon key becomes a component. Domain
 * objects carry the key; only this module knows about lucide.
 */
const ICON_BY_KEY: Readonly<Record<SoundIconKey, LucideIcon>> = {
  alarm: AlarmClock,
  balloon: Balloon,
  bell: Bell,
  boo: ThumbsDown,
  bug: Bug,
  'chess-pawn': ChessPawn,
  'circle-dot-dashed': CircleDotDashed,
  coffee: Coffee,
  drum: Drum,
  gunshot: Crosshair,
  'human-voice': HatGlasses,
  laugh: Smile,
  megaphone: Megaphone,
  monitor: Monitor,
  music: Music,
  'party-popper': PartyPopper,
  'paw-print': PawPrint,
  plane: Plane,
  sad: TrendingDown,
  shuffle: Shuffle,
  sparkles: Sparkles,
  timer: Timer,
  trophy: Trophy,
  wrong: TriangleAlert,
  zap: Zap,
};

export function SoundIcon({
  iconKey,
  className,
}: {
  iconKey: SoundIconKey;
  className?: string;
}) {
  const Icon = ICON_BY_KEY[iconKey];
  return <Icon className={cn('h-[18px] w-[18px]', className)} aria-hidden />;
}
