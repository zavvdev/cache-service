import { http } from "./http";

export interface Book {
  id: number;
  title: string;
}

class Api {
  async getBooks() {
    return http.get<Book[]>("/books");
  }
}

export const api = new Api();
