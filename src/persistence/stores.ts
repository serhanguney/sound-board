import { queueSchema, type Queue } from '@/domain/queue';
import { createPersistedValue } from './persisted-value';

const STORAGE_PREFIX = 'soundboard';

/** Bump when the persisted shape changes; stored data is discarded, not migrated. */
const QUEUE_VERSION = 1;

/**
 * The queue survives a reload so a host can build one before a meeting, close
 * the tab, and come back to it still waiting to be played.
 */
export const queueStorage = createPersistedValue<Queue>({
  key: `${STORAGE_PREFIX}:queue`,
  version: QUEUE_VERSION,
  schema: queueSchema,
});
