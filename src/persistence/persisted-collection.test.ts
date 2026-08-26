import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createPersistedCollection } from './persisted-collection';

const itemSchema = z.object({ id: z.string(), value: z.number() });
type Item = z.infer<typeof itemSchema>;

const makeStorage = () => {
  const backing = new Map<string, string>();
  return {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => void backing.set(key, value),
    removeItem: (key: string) => void backing.delete(key),
    backing,
  };
};

let storage: ReturnType<typeof makeStorage>;

beforeEach(() => {
  storage = makeStorage();
  vi.stubGlobal('window', { localStorage: storage });
});

const collection = () =>
  createPersistedCollection<Item>({
    key: 'test:items',
    version: 2,
    schema: itemSchema,
  });

describe('createPersistedCollection', () => {
  it('round-trips items', () => {
    const store = collection();
    const items: Item[] = [{ id: 'a', value: 1 }];
    store.save(items);
    expect(store.load()).toEqual(items);
  });

  it('returns an empty collection when nothing is stored', () => {
    expect(collection().load()).toEqual([]);
  });

  it('discards data written under an older version', () => {
    storage.setItem(
      'test:items',
      JSON.stringify({ version: 1, items: [{ id: 'a', value: 1 }] })
    );
    expect(collection().load()).toEqual([]);
  });

  it('discards items that no longer match the schema', () => {
    storage.setItem(
      'test:items',
      JSON.stringify({ version: 2, items: [{ id: 'a', value: 'not-a-number' }] })
    );
    expect(collection().load()).toEqual([]);
  });

  it('survives corrupt json rather than throwing', () => {
    storage.setItem('test:items', '{ not json');
    expect(collection().load()).toEqual([]);
  });

  it('survives a storage that throws on write', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
      },
    });
    expect(() => collection().save([{ id: 'a', value: 1 }])).not.toThrow();
  });

  it('is inert during server rendering', () => {
    vi.stubGlobal('window', undefined);
    const store = collection();
    expect(store.load()).toEqual([]);
    expect(() => store.save([{ id: 'a', value: 1 }])).not.toThrow();
  });
});
