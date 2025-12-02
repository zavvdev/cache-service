export type Key = string;
export type KeyCandidate = (string | number | bigint | boolean)[];
export type EntryData = unknown;

export interface Config {
  staleTime: number;
}

export type Entry<T = EntryData> = {
  data: T;
  config: Config;
  timestamp: number;
  isStale: boolean;
};

export type Storage = Map<Key, Entry>;

export type PendingBuffer = Set<Key>;
