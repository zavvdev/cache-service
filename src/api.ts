import { CacheService } from "./CacheService/CacheService";
import { http } from "./http";

const cacheService = new CacheService({
  config: {
    staleTime: 0.1 * 60 * 1000,
  },
});

export interface Book {
  id: number;
  title: string;
}

class Api {
  async getBooks() {
    return cacheService.cache("books", () => http.get<Book[]>("/books"));
  }
}

export const api = new Api();
