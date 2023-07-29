import { CONFIG_DEFAULT } from "./config";
import { Config, Entry, EntryData, Key, Storage } from "./types";

interface Args {
  config?: Config;
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
    const entry = this.storage[key];
    this.storage = {
      ...this.storage,
      [key]: {
        ...entry,
        config: {
          ...entry.config,
          isStale: true,
        },
      },
    };
  }

  private createEntry(data: EntryData, config?: Config): Entry {
    const nextConfig = config || CONFIG_DEFAULT;
    return {
      data,
      config: {
        ...nextConfig,
        timestamp: +new Date(),
        isStale: nextConfig.staleTime === 0,
      },
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

  public set(key: Key, data: EntryData, config?: Config): void {
    this.storage = {
      ...this.storage,
      [key]: this.createEntry(data, config),
    };
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

  // public cache<T = EntryData>(
  //   key: Key,
  //   fn: () => T | Promise<T>,
  //   config?: Config,
  // ): T | Promise<T> {
  //   const currentConfig = {
  //     ...this.config,
  //     ...config,
  //   };
  //   try {
  //     let entryData = fn();
  //     if (entryData instanceof Promise) {
  //       entryData.then((result) => {
  //         entryData = result;
  //       });
  //     }
  //     if (key in this.storage) {
  //       const entry = this.storage[key];
  //     }
  //   } catch (e) {}
  // }
}
