export type Key = string;
export type EntryData = unknown;

interface EntryConfig extends Config {
  timestamp: number;
  isStale: boolean;
}

export type Entry<T = EntryData> = {
  data: T;
  config: EntryConfig;
};

export interface Storage {
  [key: Key]: Entry;
}

export interface Config {
  cacheTime: number;
  staleTime: number;
}
