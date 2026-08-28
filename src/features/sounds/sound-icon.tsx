import {
  AlarmClock,
  Bell,
  Bug,
  Coffee,
  Crosshair,
  Drum,
  Megaphone,
  MicSignal,
  Monitor,
  Music,
  PartyPopper,
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
  applause: PartyPopper,
  bell: Bell,
  boo: ThumbsDown,
  bug: Bug,
  coffee: Coffee,
  drum: Drum,
  gunshot: Crosshair,
  'human-voice': MicSignal,
  laugh: Smile,
  megaphone: Megaphone,
  monitor: Monitor,
  music: Music,
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
