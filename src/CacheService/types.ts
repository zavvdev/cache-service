export type Key = string;
export type EntryData = unknown;

export interface Config {
  staleTime: number;
}

export type Entry<T = EntryData> = {
  data: T;
  config: Config;
  timestamp: number;
  isStale: boolean;
  isExecuting: boolean;
};

export interface Storage {
  [key: Key]: Entry;
}
