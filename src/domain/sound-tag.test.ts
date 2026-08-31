import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  isSoundTag,
  joinTagSuffix,
  SOUND_TAGS,
  splitTagSuffix,
  UNTAGGED,
} from './sound-tag';

describe('splitTagSuffix', () => {
  it('splits a recognised suffix off the name', () => {
    expect(splitTagSuffix('air-horn--chaos')).toEqual({
      name: 'air-horn',
      tag: 'chaos',
    });
  });

  it('uses the final separator so a name may contain one', () => {
    expect(splitTagSuffix('a--b--cats')).toEqual({ name: 'a--b', tag: 'cats' });
  });

  it('leaves the name intact when the suffix is not a known tag', () => {
    // The trap here is a single dash: `pour-coffee-mundane` is a name, not a
    // tagged file, and must not be silently truncated.
    expect(splitTagSuffix('pour-coffee-mundane')).toEqual({
      name: 'pour-coffee-mundane',
      tag: UNTAGGED,
    });
  });

  it('treats a missing suffix as untagged', () => {
    expect(splitTagSuffix('applause')).toEqual({
      name: 'applause',
      tag: UNTAGGED,
    });
  });

  it('round-trips through joinTagSuffix', () => {
    for (const tag of SOUND_TAGS) {
      expect(splitTagSuffix(joinTagSuffix('some-sound', tag))).toEqual({
        name: 'some-sound',
        tag,
      });
    }
  });

  it('leaves an untagged sound without a suffix', () => {
    expect(joinTagSuffix('some-sound', UNTAGGED)).toBe('some-sound');
  });
});

describe('isSoundTag', () => {
  it('accepts every known tag and rejects anything else', () => {
    for (const tag of SOUND_TAGS) expect(isSoundTag(tag)).toBe(true);
    expect(isSoundTag('nonsense')).toBe(false);
    expect(isSoundTag(UNTAGGED)).toBe(false);
  });
});

describe('tag theme tokens', () => {
  const css = readFileSync(
    fileURLToPath(new URL('../app/globals.css', import.meta.url)),
    'utf8'
  );

  // Colours resolve at runtime through `--sb-tag-<name>`, which falls back to a
  // neutral grey. That fallback keeps the UI working but makes a forgotten
  // token invisible — two tags would quietly render the same dot. This is the
  // check that makes it loud instead.
  it.each(SOUND_TAGS)('%s has a colour token', (tag) => {
    expect(css).toContain(`--sb-tag-${tag}:`);
  });

  it.each(SOUND_TAGS)('%s has a soft colour token', (tag) => {
    expect(css).toContain(`--sb-tag-${tag}-soft:`);
  });

  it('gives every tag a distinct colour', () => {
    const values = SOUND_TAGS.map((tag) => {
      const match = css.match(new RegExp(`--sb-tag-${tag}:\\s*([^;]+);`));
      return match?.[1]?.trim();
    });

    expect(new Set(values).size).toBe(SOUND_TAGS.length);
  });
});
