import { scheduleSchema, type Schedule } from '@/domain/schedule';
import { createPersistedCollection } from './persisted-collection';

const STORAGE_PREFIX = 'soundboard';

/** Bump when the persisted shape changes; stored data is discarded, not migrated. */
const SCHEDULES_VERSION = 1;

export const schedulesStorage = createPersistedCollection<Schedule>({
  key: `${STORAGE_PREFIX}:schedules`,
  version: SCHEDULES_VERSION,
  schema: scheduleSchema,
});
