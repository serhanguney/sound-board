import type { SoundTagOrUntagged } from '@/domain/sound-tag';
import { cn } from '@/lib/utils';

/**
 * Tag colours resolve through a CSS custom property named after the tag, so
 * adding a tag to `SOUND_TAGS` needs no change here — only an optional
 * `--sb-tag-<name>` token in `globals.css`. A tag with no token falls back to
 * the neutral ink colour rather than rendering an invisible dot.
 *
 * This is deliberately not a Tailwind class map: Tailwind only emits classes it
 * can see literally at build time, which would make every new tag a four-file
 * edit and a silently colourless dot when one was missed.
 */
const tagColor = (tag: SoundTagOrUntagged): string =>
  `hsl(var(--sb-tag-${tag}, var(--sb-ink-3)))`;

export function TagDot({
  tag,
  className,
}: {
  tag: SoundTagOrUntagged;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', className)}
      style={{ backgroundColor: tagColor(tag) }}
      aria-hidden
    />
  );
}

/** Pill used by the filter rows and the queue dialog. */
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

  if (!onClick) return <span className={classes}>{content}</span>;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={classes}
    >
      {content}
    </button>
  );
}
