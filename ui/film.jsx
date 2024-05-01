import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

async function fetchFilmData(id) {
  const response = await fetch(`/api/v1/film/${id}`);
  if (response.ok) {
    return await response.json();
  } else {
    throw new Error('Failed to fetch film data');
  }
}

function FilmView() {
  const [film, setFilm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const filmId = window.location.pathname.split('/').pop();
    fetchFilmData(filmId)
      .then(setFilm)
      .catch(e => setError(e.message));
  }, []);

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!film) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>{film.title}</h1>
      <p>{film.description}</p>
      <p><strong>ID:</strong> {film.id}</p>
      <a href="/">Back to list</a>
    </div>
  );
}

function main() {
  const rootElt = document.getElementById("app");
  const root = createRoot(rootElt);
  root.render(<FilmView />);
}

window.onload = main;
