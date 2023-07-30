import { useState } from "react";
import { Book, api } from "./api";
import { CacheService } from "./CacheService/CacheService";

let counter = 1;

const cacheService = new CacheService({
  config: {
    staleTime: 0.1 * 60 * 1000,
  },
});

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBooks = () => {
    setIsLoading(true);
    api
      .getBooks()
      .then((res) => setBooks(res.data))
      .finally(() => {
        setIsLoading(false);
      });
  };

  const updateCounter = () => {
    const next = counter++;
    console.log(next);
    return next;
  };

  return (
    <div>
      <h1>http-cache</h1>
      <div>
        <button onClick={fetchBooks}>fetch books</button>
        {isLoading && <div>loading..</div>}
        {!isLoading &&
          books.map((book) => (
            <div key={book.id}>
              {book.id} | {book.title}
            </div>
          ))}
      </div>
      <hr />
      <div>
        <button
          onClick={() => {
            const cached = cacheService.cacheSync("123", updateCounter);
            console.log("cached:", cached);
          }}
        >
          update counter (sync)
        </button>
      </div>
    </div>
  );
}

export default App;
