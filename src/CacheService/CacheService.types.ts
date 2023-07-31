export type CacheKey = string;
export type CacheEntryData = unknown;

export interface CacheConfig {
  staleTime: number;
}

export type CacheEntry<T = CacheEntryData> = {
  data: T;
  config: CacheConfig;
  timestamp: number;
  isStale: boolean;
};

export interface CacheStorage {
  [key: CacheKey]: CacheEntry;
}
