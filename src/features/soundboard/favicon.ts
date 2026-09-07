/**
 * The brand mark, as a tab icon.
 *
 * Two variants of the logo the top bar renders: the ink tile is filled while a
 * sound is going out and dropped while nothing is playing. It matters more here
 * than a favicon usually would — a queue fires into a call the user is looking
 * at, not at this board, so the tab is often the only part of the app on
 * screen, and the icon is what says whether it just made a noise.
 *
 * Built here rather than checked in as two `.svg` files so the geometry is
 * written once, and so `app/layout.tsx` can serve the idle variant as the
 * document's own icon without a second copy of it.
 */

// `--sb-ink` and `--sb-accent` from globals.css. A tab icon is rendered outside
// the document, so it cannot read the custom properties themselves.
const INK = 'hsl(60, 17%, 7%)';
const ACCENT = 'hsl(25, 95%, 53%)';

/** lucide's `AudioLines`, the icon the top bar draws, in its 24-unit space. */
const BARS = [
  'M2 10v3',
  'M6 6v11',
  'M10 3v18',
  'M14 8v7',
  'M18 5v13',
  'M22 10v3',
] as const;

/**
 * The bars are placed on a 32-unit canvas. Both variants give them far more of
 * it than the top bar's tile does: a favicon is drawn at 16 or 32 pixels, and
 * at the top bar's inset the mark inside the tile collapses into a black square
 * with a smudge in it. The tiled variant keeps a margin, no more than that.
 */
const mark = (options: {
  tile: boolean;
  transform: string;
  strokeWidth: number;
}): string =>
  [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">',
    options.tile ? `<rect width="32" height="32" rx="7" fill="${INK}"/>` : '',
    `<g transform="${options.transform}" fill="none" stroke="${ACCENT}"`,
    ` stroke-width="${options.strokeWidth}" stroke-linecap="round">`,
    ...BARS.map((d) => `<path d="${d}"/>`),
    '</g></svg>',
  ].join('');

const toDataUri = (svg: string): string =>
  `data:image/svg+xml,${encodeURIComponent(svg)}`;

export const FAVICON_TYPE = 'image/svg+xml';

/** Nothing playing: the mark alone, filling the canvas. */
export const FAVICON_IDLE = toDataUri(
  mark({ tile: false, transform: 'translate(-0.2 -0.2) scale(1.35)', strokeWidth: 2 })
);

/** A sound is playing: the mark on its tile, as the top bar shows it. */
export const FAVICON_PLAYING = toDataUri(
  mark({ tile: true, transform: 'translate(2.8 2.8) scale(1.1)', strokeWidth: 2.2 })
);

/**
 * Points the tab's icon at `href`.
 *
 * The link the document was served with is reused rather than added to: two
 * `rel="icon"` elements leave the browser to pick between them, and which one
 * it picks is not something to rely on.
 */
export function setFavicon(href: string): void {
  const existing = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  const link = existing ?? document.createElement('link');

  link.rel = 'icon';
  link.type = FAVICON_TYPE;
  link.href = href;

  if (!existing) document.head.append(link);
}
