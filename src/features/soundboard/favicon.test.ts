// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FAVICON_IDLE,
  FAVICON_PLAYING,
  FAVICON_TYPE,
  setFavicon,
} from './favicon';

const svgOf = (dataUri: string): string =>
  decodeURIComponent(dataUri.replace('data:image/svg+xml,', ''));

describe('the two variants', () => {
  it('draws the same six bars in both', () => {
    for (const variant of [FAVICON_IDLE, FAVICON_PLAYING]) {
      expect(svgOf(variant).match(/<path /g)).toHaveLength(6);
    }
  });

  it('fills the tile only while something is playing', () => {
    expect(svgOf(FAVICON_PLAYING)).toContain('<rect');
    expect(svgOf(FAVICON_IDLE)).not.toContain('<rect');
  });

  it('encodes the mark so the percentages in its colours survive', () => {
    // Unencoded, `hsl(60, 17%, 7%)` would read as escape sequences in a URI.
    expect(FAVICON_IDLE).not.toContain('%,');
    expect(svgOf(FAVICON_IDLE)).toContain('hsl(25, 95%, 53%)');
  });

  it('parses as SVG', () => {
    const parsed = new DOMParser().parseFromString(
      svgOf(FAVICON_PLAYING),
      'image/svg+xml'
    );
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.documentElement.getAttribute('viewBox')).toBe('0 0 32 32');
  });
});

describe('setFavicon', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('adds a link when the document has none', () => {
    setFavicon(FAVICON_IDLE);

    const links = document.head.querySelectorAll('link[rel~="icon"]');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('type')).toBe(FAVICON_TYPE);
  });

  it('reuses the link the document was served with', () => {
    document.head.innerHTML = `<link rel="icon" href="${FAVICON_IDLE}">`;
    const served = document.head.querySelector('link');

    setFavicon(FAVICON_PLAYING);

    // A second rel="icon" would leave the browser to choose between them.
    expect(document.head.querySelectorAll('link[rel~="icon"]')).toHaveLength(1);
    expect(served?.getAttribute('href')).toBe(FAVICON_PLAYING);
  });

  it('adopts a shorthand rel rather than adding beside it', () => {
    document.head.innerHTML = '<link rel="shortcut icon" href="/favicon.ico">';

    setFavicon(FAVICON_PLAYING);

    expect(document.head.querySelectorAll('link')).toHaveLength(1);
    expect(document.head.querySelector('link')?.rel).toBe('icon');
  });
});
