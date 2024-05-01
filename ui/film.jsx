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

async function deleteFilm(id) {
  const response = await fetch(`/api/v1/film/${id}`, { method: 'DELETE' });
  if (response.ok) {
    return await response.json();
  } else {
    throw new Error('Failed to delete film');
  }
}

function FilmView() {
  const [film, setFilm] = useState(null);
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    const filmId = window.location.pathname.split('/').pop();
    if (!deleted) {
      fetchFilmData(filmId)
        .then(setFilm)
        .catch(e => setError(e.message));
    }
  }, [deleted]);

  const handleDelete = async () => {
    const filmId = window.location.pathname.split('/').pop();
    try {
      const deleteResponse = await deleteFilm(filmId);
      if (deleteResponse.ok) {
        setDeleted(true);
        alert('Film deleted successfully');
        window.location.href = '/';  // Redirect to the home page or film list
      }
    } catch (error) {
      setError(error.message);
    }
  };

  if (deleted) {
    return <p>Film deleted successfully.</p>;
  }

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
      <button onClick={handleDelete}>Delete Film</button>
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
