import type { z } from 'zod';

/**
 * Typed, versioned localStorage access for a single value.
 *
 * Everything read back is validated against the schema, so a shape change or a
 * hand-edited value degrades to "nothing stored" instead of injecting a
 * malformed domain object into the runner.
 */
export interface PersistedValue<T> {
  readonly load: () => T | null;
  readonly save: (value: T) => void;
  readonly clear: () => void;
  /**
   * Notifies when another tab writes this key. `storage` only fires in *other*
   * documents, so this never echoes the caller's own writes.
   */
  readonly subscribe: (onChange: (value: T | null) => void) => () => void;
}

export function createPersistedValue<T>(options: {
  key: string;
  version: number;
  /** Accepts `unknown` input so branded and `.readonly()` schemas fit. */
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
}): PersistedValue<T> {
  const { key, version, schema } = options;

  const isAvailable = () => typeof window !== 'undefined';

  const api: PersistedValue<T> = {
    load: () => {
      if (!isAvailable()) return null;

      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return null;

        const envelope: unknown = JSON.parse(raw);
        if (
          typeof envelope !== 'object' ||
          envelope === null ||
          !('version' in envelope) ||
          !('value' in envelope)
        ) {
          return null;
        }

        // A version bump discards old data rather than guessing at a migration.
        if (envelope.version !== version) return null;

        const parsed = schema.safeParse(envelope.value);
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },

    save: (value) => {
      if (!isAvailable()) return;
      try {
        window.localStorage.setItem(key, JSON.stringify({ version, value }));
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

    subscribe: (onChange) => {
      if (!isAvailable()) return () => {};

      const handler = (event: StorageEvent) => {
        if (event.key !== null && event.key !== key) return;
        onChange(api.load());
      };

      window.addEventListener('storage', handler);
      return () => window.removeEventListener('storage', handler);
    },
  };

  return api;
}
