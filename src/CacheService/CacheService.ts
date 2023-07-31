import { CONFIG_DEFAULT } from "./CacheService.config";
import {
  CacheConfig,
  CacheEntry,
  CacheEntryData,
  CacheKey,
  CacheStorage,
} from "./CacheService.types";

interface Args {
  config?: Partial<CacheConfig>;
  preloadedStorage?: CacheStorage;
}

export class CacheService {
  private storage: CacheStorage;
  private pendingBuffer: Set<string>;
  private config: CacheConfig;

  constructor({ config, preloadedStorage }: Args = {}) {
    this.storage = preloadedStorage || {};
    this.pendingBuffer = new Set([]);
    this.config = {
      ...CONFIG_DEFAULT,
      ...config,
    };
  }

  // PRIVATE

  private findKeysByPattern(pattern: string): CacheKey[] {
    const keys = Object.keys(this.storage);
    return keys.filter((key) => key.includes(pattern));
  }

  private syncEntryConfig(
    key: CacheKey,
    config?: Partial<CacheConfig>,
  ): CacheConfig {
    return {
      ...this.config,
      ...this.storage[key]?.config,
      ...config,
    };
  }

  private createEntry(
    data: CacheEntryData,
    config?: Partial<CacheConfig>,
  ): CacheEntry {
    const nextConfig = {
      ...this.config,
      ...config,
    };
    return {
      data,
      config: nextConfig,
      timestamp: +new Date(),
      isStale: nextConfig.staleTime === 0,
    };
  }

  private getCachedIfFresh<T>(
    key: CacheKey,
    config: CacheConfig,
  ): T | undefined {
    if (key in this.storage) {
      const entry = this.storage[key];
      const isExpired = +new Date() >= entry.timestamp + config.staleTime;
      const isStale = entry.isStale || isExpired;
      if (this.pendingBuffer.has(key) || !isStale) {
        return this.storage[key].data as T;
      }
    }
  }

  private async refresh<T>(
    key: CacheKey,
    fn: () => Promise<T>,
    config: CacheConfig,
  ): Promise<T> {
    try {
      this.pendingBuffer.add(key);
      const freshEntryData = await fn();
      this.storage[key] = this.createEntry(freshEntryData, config);
      return freshEntryData;
    } catch (e) {
      delete this.storage[key];
      throw e;
    } finally {
      this.pendingBuffer.delete(key);
    }
  }

  private refreshSync<T>(key: CacheKey, fn: () => T, config: CacheConfig): T {
    try {
      this.pendingBuffer.add(key);
      const freshEntryData = fn();
      this.storage[key] = this.createEntry(freshEntryData, config);
      return freshEntryData;
    } catch (e) {
      delete this.storage[key];
      throw e;
    } finally {
      this.pendingBuffer.delete(key);
    }
  }

  // PUBLIC

  public createKey(key: (string | number)[]): CacheKey {
    return key.join("-");
  }

  public get<T = CacheEntryData>(key: CacheKey): T | undefined {
    if (key in this.storage) {
      return this.storage[key].data as T;
    }
  }

  public set(
    key: CacheKey,
    data: CacheEntryData,
    config?: Partial<CacheConfig>,
  ): void {
    this.storage[key] = this.createEntry(data, config);
  }

  public remove(key: CacheKey, exact: boolean = true): void {
    if (exact && key in this.storage) {
      delete this.storage[key];
    }
    if (!exact) {
      const keysToRemove = this.findKeysByPattern(key);
      if (keysToRemove.length > 0) {
        keysToRemove.forEach((k) => {
          delete this.storage[k];
        });
      }
    }
  }

  public invalidate(key: CacheKey, exact: boolean = true): void {
    if (exact && key in this.storage) {
      this.storage[key].isStale = true;
    }
    if (!exact) {
      const keysToInvalidate = this.findKeysByPattern(key);
      if (keysToInvalidate.length > 0) {
        keysToInvalidate.forEach((k) => {
          this.storage[k].isStale = true;
        });
      }
    }
  }

  public dump(): CacheStorage {
    return this.storage;
  }

  public drop(): void {
    this.storage = {};
  }

  public async cache<T = CacheEntryData>(
    key: CacheKey,
    fn: () => Promise<T>,
    config?: Partial<CacheConfig>,
  ): Promise<T> {
    const currentConfig = this.syncEntryConfig(key, config);
    return (
      this.getCachedIfFresh<T>(key, currentConfig) ||
      this.refresh<T>(key, fn, currentConfig)
    );
  }

  public cacheSync<T = CacheEntryData>(
    key: CacheKey,
    fn: () => T,
    config?: Partial<CacheConfig>,
  ): T {
    const currentConfig = this.syncEntryConfig(key, config);
    return (
      this.getCachedIfFresh<T>(key, currentConfig) ||
      this.refreshSync<T>(key, fn, currentConfig)
    );
  }
}
