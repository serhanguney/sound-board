import type { SoundTagOrUntagged } from '@/domain/sound-tag';
import { cn } from '@/lib/utils';

/**
 * Tag colours are theme tokens, not literals. Tailwind needs the full class
 * name at build time, so each tag maps to a fixed class rather than an
 * interpolated one.
 */
const DOT_CLASS: Readonly<Record<SoundTagOrUntagged, string>> = {
  drive: 'bg-tag-drive',
  'low-motivation': 'bg-tag-low-motivation',
  celebration: 'bg-tag-celebration',
  chaos: 'bg-tag-chaos',
  calm: 'bg-tag-calm',
  untagged: 'bg-ink-subtle',
};

export function TagDot({
  tag,
  className,
}: {
  tag: SoundTagOrUntagged;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
        DOT_CLASS[tag],
        className
      )}
      aria-hidden
    />
  );
}

/** Pill used by the filter row and the queue modal's source card. */
export function TagChip({
  tag,
  selected = false,
  onClick,
  className,
}: {
  tag: SoundTagOrUntagged;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <TagDot tag={tag} />
      <span>{tag}</span>
    </>
  );

  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors',
    selected
      ? 'border-ink bg-ink text-surface'
      : 'border-line bg-surface text-ink-muted hover:border-line-strong',
    className
  );

  if (!onClick) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={classes}>
      {content}
    </button>
  );
}
