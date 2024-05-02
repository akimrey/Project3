import React from "react";
import { createRoot } from "react-dom/client";

// FilmEntry component to display each film as a list item with a link
function FilmEntry({ id, title, description }) {
  return (
    <p>
      <a href={`/film/${id}`}>{title}</a>: {description}
    </p>
  );
}

// Main function to fetch film data from the API and render it
async function main() {
  const filmsResponse = await fetch("/api/v1/films"); // Fetch data from your API endpoint
  const films = await filmsResponse.json(); // Convert the response to JSON

  const rootElt = document.getElementById("app"); // Get the root element in your HTML
  const root = createRoot(rootElt); // Create a root container

  // Render the list of films using the FilmEntry component for each film
  root.render(
    <div>
      <h1 className="header-title">List of Films</h1>
      <ul>
        {films.map((film) => (
          <li key={film.id}>
            <FilmEntry
              id={film.id}
              title={film.title}
              description={film.description}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

window.onload = main; // Ensure the main function runs after the page is fully loaded
