'use client';

import { useEffect } from 'react';
import { setFavicon } from './favicon';

/**
 * Keeps the tab's icon pointed at `href`.
 *
 * The head is outside React's tree here, so this is a genuine subscription to
 * the document rather than state that could have been derived during render.
 */
export function useFavicon(href: string): void {
  useEffect(() => setFavicon(href), [href]);
}
