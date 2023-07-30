import { CONFIG_DEFAULT } from "./config";
import { Config, Entry, EntryData, Key, Storage } from "./types";

interface Args {
  config?: Partial<Config>;
  preloadedStorage?: Storage;
}

export class CacheService {
  private storage: Storage;
  private pendingBuffer: Set<string>;
  private config: Config;

  constructor({ config, preloadedStorage }: Args) {
    this.storage = preloadedStorage || {};
    this.pendingBuffer = new Set([]);
    this.config = {
      ...CONFIG_DEFAULT,
      ...config,
    };
  }

  // PRIVATE

  private findKeysByPattern(pattern: string): Key[] {
    const keys = Object.keys(this.storage);
    return keys.filter((key) => key.includes(pattern));
  }

  private syncEntryConfig(key: Key, config?: Partial<Config>): Config {
    return {
      ...this.config,
      ...this.storage[key]?.config,
      ...config,
    };
  }

  private isStale(key: Key, staleTime: number): boolean {
    return (
      this.storage[key].isStale ||
      +new Date() >= this.storage[key].timestamp + staleTime
    );
  }

  private createEntry(data: EntryData, config?: Partial<Config>): Entry {
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

  private getCachedIfFresh<T>(key: Key, config: Config): T | undefined {
    if (key in this.storage) {
      const isStale = this.isStale(key, config.staleTime);
      if (this.pendingBuffer.has(key) || !isStale) {
        return this.storage[key].data as T;
      }
    }
  }

  private async refresh<T>(
    key: Key,
    fn: () => Promise<T>,
    config: Config,
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

  private refreshSync<T>(key: Key, fn: () => T, config: Config): T {
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

  public createKey(key: (string | number)[]): Key {
    return key.join("-");
  }

  public get<T = EntryData>(key: Key): T | undefined {
    if (key in this.storage) {
      return this.storage[key].data as T;
    }
  }

  public set(key: Key, data: EntryData, config?: Partial<Config>): void {
    this.storage[key] = this.createEntry(data, config);
  }

  public remove(key: Key, exact: boolean = true): void {
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

  public invalidate(key: Key, exact: boolean = true): void {
    if (exact && key in this.storage) {
      this.storage[key].isStale = true;
    }
    if (!exact) {
      const keysToMark = this.findKeysByPattern(key);
      if (keysToMark.length > 0) {
        keysToMark.forEach((k) => {
          this.storage[k].isStale = true;
        });
      }
    }
  }

  public drop(): void {
    this.storage = {};
  }

  public async cache<T = EntryData>(
    key: Key,
    fn: () => Promise<T>,
    config?: Partial<Config>,
  ): Promise<T> {
    const currentConfig = this.syncEntryConfig(key, config);
    return (
      this.getCachedIfFresh<T>(key, currentConfig) ||
      this.refresh<T>(key, fn, currentConfig)
    );
  }

  public cacheSync<T = EntryData>(
    key: Key,
    fn: () => T,
    config?: Partial<Config>,
  ): T {
    const currentConfig = this.syncEntryConfig(key, config);
    return (
      this.getCachedIfFresh<T>(key, currentConfig) ||
      this.refreshSync<T>(key, fn, currentConfig)
    );
  }
}
