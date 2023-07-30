import { CONFIG_DEFAULT } from "./config";
import { Config, Entry, EntryData, Key, Storage } from "./types";

interface Args {
  config?: Partial<Config>;
  preloadedStorage?: Storage;
}

export class CacheService {
  private storage: Storage;
  private config: Config;

  constructor({ config, preloadedStorage }: Args) {
    this.storage = preloadedStorage || {};
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

  private markStale(key: Key): void {
    this.storage[key].isStale = true;
  }

  private async withLock<T>(key: Key, fn: () => Promise<T>): Promise<T> {
    this.storage[key].isExecuting = true;
    const result = await fn();
    this.storage[key].isExecuting = false;
    return result;
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
      isExecuting: false,
    };
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

  public remove(key: Key, exact: boolean = true) {
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
      this.markStale(key);
    }
    if (!exact) {
      const keysToMark = this.findKeysByPattern(key);
      if (keysToMark.length > 0) {
        keysToMark.forEach((k) => {
          this.markStale(k);
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
    const isEntryExists = key in this.storage;

    const currentConfig = {
      ...this.config,
      ...this.storage[key]?.config,
      ...config,
    };

    if (isEntryExists) {
      const isStale =
        this.storage[key].isStale ||
        +new Date() >= this.storage[key].timestamp + currentConfig.staleTime;

      if (this.storage[key].isExecuting || !isStale) {
        return Promise.resolve(this.storage[key].data as T);
      }
    }

    return await this.withLock(key, async () => {
      const freshEntryData = await fn();
      this.storage[key] = this.createEntry(freshEntryData, currentConfig);
      return freshEntryData;
    });
  }
}
