import { z } from 'zod';

/**
 * Typed, versioned localStorage access.
 *
 * Everything read back is validated against the schema, so a shape change or a
 * hand-edited value degrades to "empty collection" instead of crashing the app
 * or, worse, injecting malformed domain objects into the scheduler.
 */
export interface PersistedCollection<T> {
  readonly load: () => readonly T[];
  readonly save: (items: readonly T[]) => void;
  readonly clear: () => void;
}

interface Envelope {
  readonly version: number;
  readonly items: unknown;
}

const envelopeSchema = z.object({
  version: z.number().int().nonnegative(),
  items: z.unknown(),
});

export function createPersistedCollection<T>(options: {
  key: string;
  version: number;
  /** Accepts `unknown` input so branded and `.readonly()` schemas fit. */
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
}): PersistedCollection<T> {
  const { key, version, schema } = options;
  const itemsSchema = z.array(schema);

  const isAvailable = (): boolean => typeof window !== 'undefined';

  return {
    load: () => {
      if (!isAvailable()) return [];

      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return [];

        const envelope = envelopeSchema.safeParse(JSON.parse(raw));
        // A version bump discards old data rather than guessing at a migration.
        if (!envelope.success || envelope.data.version !== version) return [];

        const items = itemsSchema.safeParse(envelope.data.items);
        return items.success ? items.data : [];
      } catch {
        return [];
      }
    },

    save: (items) => {
      if (!isAvailable()) return;

      try {
        const envelope: Envelope = { version, items };
        window.localStorage.setItem(key, JSON.stringify(envelope));
      } catch {
        // Quota exceeded or storage disabled — persistence is best-effort.
      }
    },

    clear: () => {
      if (!isAvailable()) return;
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignored
      }
    },
  };
}
