import {
  Config,
  Entry,
  EntryData,
  Key,
  KeyCandidate,
  PendingBuffer,
  Storage,
} from "./CacheService.types";
import { CONFIG_DEFAULT } from "./CacheService.config";

interface Parameters {
  config?: Partial<Config>;
  preloadedStorage?: Storage;
}

export class CacheService {
  private storage: Storage;
  private readonly pendingBuffer: PendingBuffer;
  private readonly config: Config;

  constructor({ config, preloadedStorage }: Parameters = {}) {
    this.storage = new Map(preloadedStorage || []);
    this.pendingBuffer = new Set([]);
    this.config = {
      ...CONFIG_DEFAULT,
      ...config,
    };
  }

  // PRIVATE

  private findKeysByPattern(pattern: Key): Key[] {
    return [...this.storage.keys()].filter((key) => key.startsWith(pattern));
  }

  private normalizeConfig(config: Config): Config {
    const nextConfig = { ...config };
    if (nextConfig.staleTime < 0) {
      nextConfig.staleTime = CONFIG_DEFAULT.staleTime;
    }
    return nextConfig;
  }

  private syncEntryConfig(key: Key, config?: Partial<Config>): Config {
    return this.normalizeConfig({
      ...this.config,
      ...this.storage.get(key)?.config,
      ...config,
    });
  }

  private createEntry(data: EntryData, config?: Partial<Config>): Entry {
    const nextConfig = this.normalizeConfig({
      ...this.config,
      ...config,
    });
    return {
      data,
      config: nextConfig,
      timestamp: Date.now(),
      isStale: nextConfig.staleTime === 0,
    };
  }

  private getCachedIfFresh<T>(key: Key, config: Config): T | undefined {
    const entry = this.storage.get(key);
    if (entry) {
      const isExpired = Date.now() >= entry.timestamp + config.staleTime;
      const isStale = entry.isStale || isExpired;
      if (this.pendingBuffer.has(key) || !isStale) {
        return entry.data as T;
      }
    }
  }

  private refresh<T>(
    key: Key,
    function_: () => Promise<T>,
    config: Config,
  ): Promise<T> {
    this.pendingBuffer.add(key);
    return function_()
      .then((freshEntryData) => {
        this.storage.set(key, this.createEntry(freshEntryData, config));
        this.pendingBuffer.delete(key);
        return freshEntryData;
      })
      .catch((error) => {
        const entry = this.storage.get(key);
        if (entry) {
          entry.isStale = true;
        }
        this.pendingBuffer.delete(key);
        throw error;
      });
  }

  private refreshSync<T>(key: Key, function_: () => T, config: Config): T {
    try {
      this.pendingBuffer.add(key);
      const freshEntryData = function_();
      this.storage.set(key, this.createEntry(freshEntryData, config));
      return freshEntryData;
    } catch (error) {
      const entry = this.storage.get(key);
      if (entry) {
        entry.isStale = true;
      }
      this.pendingBuffer.delete(key);
      throw error;
    } finally {
      this.pendingBuffer.delete(key);
    }
  }

  // PUBLIC

  public createKey(value: KeyCandidate): Key {
    return value.join("::");
  }

  public get<T = EntryData>(key: Key): T | undefined {
    const entry = this.storage.get(key);
    if (entry) {
      return entry.data as T;
    }
  }

  public set(key: Key, data: EntryData, config?: Partial<Config>): void {
    this.storage.set(key, this.createEntry(data, config));
  }

  public remove(key: Key, exact: boolean = true): void {
    if (exact && this.storage.has(key)) {
      this.storage.delete(key);
    }
    if (!exact) {
      this.findKeysByPattern(key).forEach((k) => {
        this.storage.delete(k);
      });
    }
  }

  public invalidate(key: Key, exact: boolean = true): void {
    if (exact) {
      const entry = this.storage.get(key);
      if (entry) {
        entry.isStale = true;
      }
    } else {
      this.findKeysByPattern(key).forEach((k) => {
        const entry = this.storage.get(k);
        if (entry) {
          entry.isStale = true;
        }
      });
    }
  }

  public drop(): void {
    this.storage.clear();
    this.pendingBuffer.clear();
  }

  public dump(): Record<Key, Entry> {
    return Object.fromEntries(this.storage.entries());
  }

  public cache<T = EntryData>(
    key: Key,
    function_: () => Promise<T>,
    config?: Partial<Config>,
  ): Promise<T> {
    const currentConfig = this.syncEntryConfig(key, config);
    const cached = this.getCachedIfFresh<T>(key, currentConfig);

    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    return this.refresh<T>(key, function_, currentConfig);
  }

  public cacheSync<T = EntryData>(
    key: Key,
    function_: () => T,
    config?: Partial<Config>,
  ): T {
    const currentConfig = this.syncEntryConfig(key, config);
    const cached = this.getCachedIfFresh<T>(key, currentConfig);

    if (cached !== undefined) {
      return cached;
    }

    return this.refreshSync<T>(key, function_, currentConfig);
  }
}
