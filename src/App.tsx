import { useState } from "react";
import { CacheService } from "./CacheService/CacheService";
import { CacheConfig, CacheStorage } from "./CacheService/CacheService.types";

const config: CacheConfig = {
  staleTime: 5000,
};

const cacheService = new CacheService({
  config,
});

const CACHE_KEYS = {
  prices: "prices",
  counter: "counter",
};

const delay = (ms: number) =>
  new Promise((res) => setTimeout(() => res(1), ms));

// ================================

function App() {
  const [storage, setStorage] = useState<CacheStorage>(cacheService.dump());

  const [prices, setPrices] = useState<string[]>([]);
  const [isPricesLoading, setIsPricesLoading] = useState(false);

  const [counter, setCounter] = useState(0);

  const updateStoragePreview = () => {
    setStorage(JSON.parse(JSON.stringify(cacheService.dump())));
  };

  // PRICES

  const fetchPrices = () => {
    const fn = async () => {
      console.log("CALL FETCH PRICES");
      setIsPricesLoading(true);
      const bases = [10, 100, 150];
      await delay(1000);
      setIsPricesLoading(false);
      return bases.map((b) => `$${(b * Math.random()).toFixed(2)}`);
    };
    cacheService.cache(CACHE_KEYS.prices, fn).then((data) => {
      setPrices(data);
      updateStoragePreview();
    });
  };

  const removePricesCache = () => {
    cacheService.remove(CACHE_KEYS.prices);
    updateStoragePreview();
  };

  const invalidatePricesCache = () => {
    cacheService.invalidate(CACHE_KEYS.prices);
    updateStoragePreview();
  };

  // COUNTER

  const updateCounter = () => {
    const nextCounter = cacheService.cacheSync(CACHE_KEYS.counter, () => {
      console.log("CALL UPDATE COUNTER");
      return counter + 1;
    });
    setCounter(nextCounter);
    updateStoragePreview();
  };

  const removeCounterCache = () => {
    cacheService.remove(CACHE_KEYS.counter);
    updateStoragePreview();
  };

  const invalidateCounterCache = () => {
    cacheService.invalidate(CACHE_KEYS.counter);
    updateStoragePreview();
  };

  // ================================

  return (
    <div>
      <h1>cache-service</h1>

      <div style={{ margin: "30px 0" }}>
        Config: <pre>{JSON.stringify(config)}</pre>
      </div>

      <div style={{ margin: "30px 0" }}>
        <hr />
        <button onClick={fetchPrices}>fetch prices (async)</button>
        <button onClick={removePricesCache}>remove</button>
        <button onClick={invalidatePricesCache}>invalidate</button>
        <br />
        {isPricesLoading && <div>loading..</div>}
        {!isPricesLoading && JSON.stringify(prices)}
      </div>

      <hr />

      <div style={{ margin: "30px 0" }}>
        <button onClick={updateCounter}>update counter (sync)</button>
        <button onClick={removeCounterCache}>remove</button>
        <button onClick={invalidateCounterCache}>invalidate</button>
        <br />
        Counter: {counter}
        <hr />
      </div>

      <div style={{ margin: "30px 0" }}>
        Cache: <pre>{JSON.stringify(storage, null, 2)}</pre>
      </div>
    </div>
  );
}

export default App;
