import { describe, it, expect } from "vitest";
import tk from "timekeeper";
import { CacheService } from "./CacheService";
import { CacheConfig, CacheStorage } from "./CacheService.types";
import { CONFIG_DEFAULT } from "./CacheService.config";

// =========================================================

describe("createKey", () => {
  it("should return created key", () => {
    const cacheService = new CacheService();
    expect(cacheService.createKey(["foo", "bar", 1, 2])).toBe("foo-bar-1-2");
  });
});

// =========================================================

describe("get", () => {
  const preloadedStorage: CacheStorage = {
    foo: {
      data: 123,
      timestamp: 987654321,
      config: {
        staleTime: 1000,
      },
      isStale: false,
    },
  };

  const cacheService = new CacheService({
    preloadedStorage,
  });

  it("should return available cache entry", () => {
    expect(cacheService.get("foo")).toBe(preloadedStorage.foo.data);
  });

  it("should return undefined if key is not in storage", () => {
    expect(cacheService.get("baz")).toEqual(undefined);
  });
});

// =========================================================

describe("set", () => {
  it("should create a new cache entry with default config", () => {
    const cacheService = new CacheService();
    const cachedData = { foo: 1 };
    const timestamp = 1330688329321;
    tk.freeze(new Date(timestamp));
    cacheService.set("foo", cachedData);
    expect(cacheService.dump()).toEqual({
      foo: {
        data: cachedData,
        timestamp,
        isStale: CONFIG_DEFAULT.staleTime === 0,
        config: CONFIG_DEFAULT,
      },
    });
    tk.reset();
  });

  it("should create a new cache entry with custom config", () => {
    const cacheService = new CacheService();
    const cachedData = { foo: 1 };
    const config: CacheConfig = {
      staleTime: 2000,
    };
    const timestamp = 1330688329321;
    tk.freeze(new Date(timestamp));
    cacheService.set("foo", cachedData, config);
    expect(cacheService.dump()).toEqual({
      foo: {
        data: cachedData,
        timestamp,
        isStale: false,
        config,
      },
    });
    tk.reset();
  });
});

// =========================================================

describe("remove", () => {
  it("should remove cached entry from storage by exact key match", () => {
    const preloadedStorage: CacheStorage = {
      foo: {
        data: 123,
        timestamp: 987654321,
        config: {
          staleTime: 1000,
        },
        isStale: false,
      },
      foo2: {
        data: 223,
        timestamp: 987654322,
        config: {
          staleTime: 2000,
        },
        isStale: false,
      },
    };
    const cacheService = new CacheService({
      preloadedStorage,
    });
    cacheService.remove("foo", true);
    expect(cacheService.dump()).toEqual({
      foo2: preloadedStorage.foo2,
    });
  });

  it("should remove cached entries from storage by partial key match", () => {
    const preloadedStorage: CacheStorage = {
      foo: {
        data: 123,
        timestamp: 987654321,
        config: {
          staleTime: 1000,
        },
        isStale: false,
      },
      foo2: {
        data: 223,
        timestamp: 987654322,
        config: {
          staleTime: 2000,
        },
        isStale: false,
      },
    };
    const cacheService = new CacheService({
      preloadedStorage,
    });
    cacheService.remove("foo", false);
    expect(cacheService.dump()).toEqual({});
  });
});

// =========================================================

describe("invalidate", () => {
  it("should invalidate cached entry from storage by exact key match", () => {
    const preloadedStorage: CacheStorage = {
      foo: {
        data: 123,
        timestamp: 987654321,
        config: {
          staleTime: 1000,
        },
        isStale: false,
      },
      foo2: {
        data: 223,
        timestamp: 987654322,
        config: {
          staleTime: 2000,
        },
        isStale: false,
      },
    };
    const cacheService = new CacheService({
      preloadedStorage,
    });
    cacheService.invalidate("foo", true);
    expect(cacheService.dump()).toEqual({
      ...preloadedStorage,
      foo: {
        ...preloadedStorage.foo,
        isStale: true,
      },
    });
  });

  it("should invalidate cached entries from storage by partial key match", () => {
    const preloadedStorage: CacheStorage = {
      foo: {
        data: 123,
        timestamp: 987654321,
        config: {
          staleTime: 1000,
        },
        isStale: false,
      },
      foo2: {
        data: 223,
        timestamp: 987654322,
        config: {
          staleTime: 2000,
        },
        isStale: false,
      },
    };
    const cacheService = new CacheService({
      preloadedStorage,
    });
    cacheService.invalidate("foo", false);
    expect(cacheService.dump()).toEqual({
      foo: {
        ...preloadedStorage.foo,
        isStale: true,
      },
      foo2: {
        ...preloadedStorage.foo2,
        isStale: true,
      },
    });
  });
});

// =========================================================

describe("dump", () => {
  it("should return current storage", () => {
    const preloadedStorage: CacheStorage = {
      foo: {
        data: 123,
        timestamp: 987654321,
        config: {
          staleTime: 1000,
        },
        isStale: false,
      },
    };
    const cacheService = new CacheService({
      preloadedStorage,
    });
    expect(cacheService.dump()).toEqual(preloadedStorage);
  });
});

// =========================================================

describe("drop", () => {
  it("should remove all data from storage", () => {
    const preloadedStorage: CacheStorage = {
      foo: {
        data: 123,
        timestamp: 987654321,
        config: {
          staleTime: 1000,
        },
        isStale: false,
      },
    };
    const cacheService = new CacheService({
      preloadedStorage,
    });
    cacheService.drop();
    expect(cacheService.dump()).toEqual({});
  });
});

// =========================================================

describe("cache", () => {
  it("should return fresh data on each call if staleTime=0", async () => {
    const cacheService = new CacheService();
    const config: CacheConfig = {
      staleTime: 0,
    };

    const timestamp = 1330688329321;
    tk.freeze(new Date(timestamp));

    let numberOfCalls = 0;
    const fn = async () => (numberOfCalls += 1);
    const cacheKey = "foo";
    const cachedFn = () => cacheService.cache(cacheKey, fn, config);

    const attempt1 = await cachedFn();
    expect(numberOfCalls).toBe(1);
    expect(attempt1).toBe(1);
    expect(cacheService.dump()).toEqual({
      [cacheKey]: {
        data: 1,
        timestamp,
        isStale: true,
        config,
      },
    });

    const attempt2 = await cachedFn();
    expect(numberOfCalls).toBe(2);
    expect(attempt2).toBe(2);
    expect(cacheService.dump()).toEqual({
      [cacheKey]: {
        data: 2,
        timestamp,
        isStale: true,
        config,
      },
    });
  });

  it("should cache fn result", async () => {
    const cacheService = new CacheService();
    const config: CacheConfig = {
      staleTime: 1000,
    };

    const timestamp = 1330688329321;
    tk.freeze(new Date(timestamp));

    let numberOfCalls = 0;
    const fn = async () => (numberOfCalls += 1);
    const cacheKey = "foo";
    const cachedFn = () => cacheService.cache(cacheKey, fn, config);

    const attempt1 = await cachedFn();
    expect(numberOfCalls).toBe(1);
    expect(attempt1).toBe(1);
    expect(cacheService.dump()).toEqual({
      [cacheKey]: {
        data: 1,
        timestamp,
        isStale: false,
        config,
      },
    });

    tk.reset();
    tk.freeze(new Date(timestamp + config.staleTime / 2));

    const attempt2 = await cachedFn();
    expect(numberOfCalls).toBe(1);
    expect(attempt2).toBe(1);
    expect(cacheService.dump()).toEqual({
      [cacheKey]: {
        data: 1,
        timestamp,
        isStale: false,
        config,
      },
    });

    tk.reset();
    tk.freeze(new Date(timestamp + config.staleTime));

    const attempt3 = await cachedFn();
    expect(numberOfCalls).toBe(2);
    expect(attempt3).toBe(2);
    expect(cacheService.dump()).toEqual({
      [cacheKey]: {
        data: 2,
        timestamp: timestamp + config.staleTime,
        isStale: false,
        config,
      },
    });
  });
});

// =========================================================

describe("cacheSync", () => {
  it("should return fresh data on each call if staleTime=0", () => {
    const cacheService = new CacheService();
    const config: CacheConfig = {
      staleTime: 0,
    };

    const timestamp = 1330688329321;
    tk.freeze(new Date(timestamp));

    let numberOfCalls = 0;
    const fn = () => (numberOfCalls += 1);
    const cacheKey = "foo";
    const cachedFn = () => cacheService.cacheSync(cacheKey, fn, config);

    const attempts = [1, 2, 3];

    attempts.forEach((attempt) => {
      const result = cachedFn();
      expect(numberOfCalls).toBe(attempt);
      expect(result).toBe(attempt);
      expect(cacheService.dump()).toEqual({
        [cacheKey]: {
          data: attempt,
          timestamp,
          isStale: true,
          config,
        },
      });
    });
  });

  it("should cache fn result", () => {
    const cacheService = new CacheService();
    const config: CacheConfig = {
      staleTime: 1000,
    };

    const timestamp = 1330688329321;
    tk.freeze(new Date(timestamp));

    let numberOfCalls = 0;
    const fn = () => (numberOfCalls += 1);
    const cacheKey = "foo";
    const cachedFn = () => cacheService.cacheSync(cacheKey, fn, config);

    const attempt1 = cachedFn();
    expect(numberOfCalls).toBe(1);
    expect(attempt1).toBe(1);
    expect(cacheService.dump()).toEqual({
      [cacheKey]: {
        data: 1,
        timestamp,
        isStale: false,
        config,
      },
    });

    tk.reset();
    tk.freeze(new Date(timestamp + config.staleTime / 2));

    const attempt2 = cachedFn();
    expect(numberOfCalls).toBe(1);
    expect(attempt2).toBe(1);
    expect(cacheService.dump()).toEqual({
      [cacheKey]: {
        data: 1,
        timestamp,
        isStale: false,
        config,
      },
    });

    tk.reset();
    tk.freeze(new Date(timestamp + config.staleTime));

    const attempt3 = cachedFn();
    expect(numberOfCalls).toBe(2);
    expect(attempt3).toBe(2);
    expect(cacheService.dump()).toEqual({
      [cacheKey]: {
        data: 2,
        timestamp: timestamp + config.staleTime,
        isStale: false,
        config,
      },
    });
  });
});

// =========================================================
