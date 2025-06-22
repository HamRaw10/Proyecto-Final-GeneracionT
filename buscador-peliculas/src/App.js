import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [reviews, setReviews] = useState({});
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });

  const API_KEY = '66727c3594adb5a203c0c9237284a8fe';

  const searchMovies = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${searchQuery}&language=es-MX`
      );
      const data = await response.json();
      setMovies(data.results || []);
    } catch (error) {
      console.error('Error al buscar películas:', error);
    }
  };

  const saveReview = () => {
    if (!selectedMovie || !newReview.comment.trim()) return;
    const updatedReviews = {
      ...reviews,
      [selectedMovie.id]: [...(reviews[selectedMovie.id] || []), newReview]
    };
    setReviews(updatedReviews);
    localStorage.setItem('movieReviews', JSON.stringify(updatedReviews));
    setNewReview({ rating: 0, comment: '' });
  };

  useEffect(() => {
    const savedReviews = JSON.parse(localStorage.getItem('movieReviews')) || {};
    setReviews(savedReviews);
  }, []);

  return (
    <div className="App">
      <h1>Busquea la pelicula que desea</h1>
      
      {       }
      <div className="search-box">
        <input
          type="text"
          placeholder="Escribe el título de una película..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchMovies()}
        />
        <button onClick={searchMovies}>Buscar</button>
      </div>

      {             }
      {!selectedMovie ? (
        <div className="movie-list">
          {movies.map((movie) => (
            <div 
              key={movie.id} 
              className="movie-card"
              onClick={() => setSelectedMovie(movie)}
            >
              <img
                src={
                  movie.poster_path
                    ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
                    : 'https://via.placeholder.com/200x300?text=No+Poster'
                }
                alt={movie.title}
              />
              <h3>{movie.title}</h3>
              <p>⭐ {movie.vote_average?.toFixed(1) || 'N/A'}</p>
            </div>
          ))}
        </div>
      ) : (
       
        <div className="movie-details">
          <button onClick={() => setSelectedMovie(null)}>← Volver</button>
          <h2>{selectedMovie.title}</h2>
          <img
            src={
              selectedMovie.poster_path
                ? `https://image.tmdb.org/t/p/w300${selectedMovie.poster_path}`
                : 'https://via.placeholder.com/300x450?text=No+Poster'
            }
            alt={selectedMovie.title}
          />
          <p>{selectedMovie.overview || 'Descripción no disponible.'}</p>

          {         }
          <div className="reviews-section">
            <h3>🌟 Deja tu reseña</h3>
            <div className="stars">
              {[1, 2, 3, 4, 5, 6, 7].map((star) => (
                <span
                  key={star}
                  className={star <= newReview.rating ? 'star-active' : ''}
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                >
                  ★
                </span>
              ))}
            </div>
            <textarea
              placeholder="¿Qué te pareció la película?..."
              value={newReview.comment}
              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
            />
            <button onClick={saveReview}>Guardar Reseña</button>

            <div className="reviews-list">
              <h3>Reseñas de la pelicula</h3>
              {(reviews[selectedMovie.id] || []).map((review, index) => (
                <div key={index} className="review">
                  <p>{'★'.repeat(review.rating)}</p>
                  <p>{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;