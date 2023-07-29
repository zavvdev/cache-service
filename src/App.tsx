import { useState } from "react";
import { Book, api } from "./api";

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
    </div>
  );
}

export default App;
