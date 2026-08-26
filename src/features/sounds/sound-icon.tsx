import {
  Bell,
  Crosshair,
  Drum,
  Frown,
  Laugh,
  Music,
  Shuffle,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { SoundIconKey } from '@/domain/sound-icon';
import { cn } from '@/lib/utils';

/**
 * The single place where a serializable icon key becomes a component. Domain
 * objects carry the key; only this module knows about lucide.
 */
const ICON_BY_KEY: Readonly<Record<SoundIconKey, LucideIcon>> = {
  clock: Timer,
  applause: ThumbsUp,
  boo: ThumbsDown,
  drum: Drum,
  bell: Bell,
  trophy: Trophy,
  laugh: Laugh,
  gunshot: Crosshair,
  sad: Frown,
  music: Music,
  shuffle: Shuffle,
};

export function SoundIcon({
  iconKey,
  className,
}: {
  iconKey: SoundIconKey;
  className?: string;
}) {
  const Icon = ICON_BY_KEY[iconKey];
  return <Icon className={cn('h-6 w-6', className)} aria-hidden />;
}
