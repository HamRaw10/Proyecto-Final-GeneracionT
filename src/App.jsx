import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

// ====== Config ======
const IMG_BASE = "https://image.tmdb.org/t/p/"; // tamaños: w185, w342, w500, original
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='750'>
      <rect width='100%' height='100%' fill='#111827'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
            fill='#9CA3AF' font-size='24' font-family='sans-serif'>
        Sin póster
      </text>
    </svg>`
  );

// Si pones la key en .env, se lee de VITE_TMDB_API_KEY. Si no, podés pegarla en el widget y queda guardada en localStorage.
function useApiKey() {
  const [apiKey, setApiKey] = useState(
    () =>
      import.meta.env.VITE_TMDB_API_KEY ||
      localStorage.getItem("tmdb_api_key") ||
      ""
  );
  useEffect(() => {
    if (apiKey) localStorage.setItem("tmdb_api_key", apiKey);
  }, [apiKey]);
  return [apiKey, setApiKey];
}

export default function App() {
  const [apiKey, setApiKey] = useApiKey();
  const [section, setSection] = useState("popular"); // popular | now_playing | top_rated | upcoming | search
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null); // detalle

  const endpoint = useMemo(() => {
    if (!apiKey) return null;
    const base = "https://api.themoviedb.org/3";
    const lang = "es-ES";
    const common = `language=${lang}&include_adult=false&page=${page}`;
    if (section === "search" && query.trim()) {
      const q = encodeURIComponent(query.trim());
      return `${base}/search/movie?query=${q}&${common}`;
    }
    if (section === "popular") return `${base}/movie/popular?${common}`;
    if (section === "now_playing")
      return `${base}/movie/now_playing?${common}&region=AR`;
    if (section === "top_rated") return `${base}/movie/top_rated?${common}`;
    if (section === "upcoming")
      return `${base}/movie/upcoming?${common}&region=AR}`;
    return `${base}/discover/movie?sort_by=popularity.desc&${common}`;
  }, [apiKey, section, page, query]);

  useEffect(() => {
    let abort = false;
    async function run() {
      if (!endpoint) return;
      setLoading(true);
      setErr("");
      try {
        // 1) intento con Bearer (key v4)
        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${
              apiKey.startsWith("eyJ") || apiKey.startsWith("Bearer ")
                ? apiKey.replace(/^Bearer\s+/i, "")
                : ""
            }`,
          },
        });
        let data = null;
        if (!res.ok) {
          // 2) fallback con api_key v3
          const url =
            endpoint +
            (endpoint.includes("?") ? "&" : "?") +
            `api_key=${apiKey}`;
          const res2 = await fetch(url);
          if (!res2.ok) throw new Error("Error al consultar TMDB");
          data = await res2.json();
        } else {
          data = await res.json();
        }
        if (!abort) {
          setItems(data.results || []);
          setTotalPages(Math.min(data.total_pages || 1, 500));
        }
      } catch (e) {
        if (!abort) setErr(e.message || "Error desconocido");
      } finally {
        if (!abort) setLoading(false);
      }
    }
    run();
    return () => {
      abort = true;
    };
  }, [endpoint, apiKey]);

  function onSearchSubmit(e) {
    e.preventDefault();
    setSection("search");
    setPage(1);
  }
  function clearSearch() {
    setQuery("");
    setSection("popular");
    setPage(1);
  }

  async function openDetails(movie) {
    if (!apiKey) return;
    setSelected({ loading: true, data: null, err: null });
    const base = "https://api.themoviedb.org/3";
    const url = `${base}/movie/${movie.id}?append_to_response=credits,release_dates,external_ids&language=es-ES`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${
            apiKey.startsWith("eyJ") || apiKey.startsWith("Bearer ")
              ? apiKey.replace(/^Bearer\s+/i, "")
              : ""
          }`,
        },
      });
      let data = null;
      if (!res.ok) {
        const res2 = await fetch(url + `&api_key=${apiKey}`);
        if (!res2.ok) throw new Error("No se pudo cargar el detalle");
        data = await res2.json();
      } else {
        data = await res.json();
      }
      setSelected({ loading: false, data, err: null });
    } catch (e) {
      setSelected({ loading: false, data: null, err: e.message });
    }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="brand">
          <span className="brand-badge">IMDb-ish</span>
          <span className="brand-sub">Catálogo (TMDB)</span>
        </div>

        <form onSubmit={onSearchSubmit} className="search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar película…"
          />
          <button type="submit">Buscar</button>
          {section === "search" && (
            <button type="button" className="ghost" onClick={clearSearch}>
              Limpiar
            </button>
          )}
        </form>

        <ApiKeyWidget apiKey={apiKey} setApiKey={setApiKey} />
      </header>

      {/* Filtros */}
      <div className="filters">
        <Tab id="popular" cur={section} set={() => setSection("popular")}>
          Populares
        </Tab>
        <Tab id="now_playing" cur={section} set={() => setSection("now_playing")}>
          En cartelera
        </Tab>
        <Tab id="top_rated" cur={section} set={() => setSection("top_rated")}>
          Mejor valoradas
        </Tab>
        <Tab id="upcoming" cur={section} set={() => setSection("upcoming")}>
          Próximos estrenos
        </Tab>
      </div>

      {/* Hero */}
      <Hero item={items?.[0]} />

      {/* Estado */}
      <div className="bar">
        <h2 className="title">
          {section === "search" && query
            ? `Resultados para: “${query}”`
            : labelForSection(section)}
        </h2>
        <div className="muted">
          Página {page} de {totalPages}
        </div>
      </div>

      {err && <div className="alert error">{err}</div>}

      {/* Grid */}
      {loading ? (
        <div className="grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid">
          {items?.map((m) => (
            <MovieCard key={m.id} m={m} onOpen={() => openDetails(m)} />
          ))}
        </div>
      )}

      {/* Paginación */}
      <div className="pager">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Anterior
        </button>
        <button
          className="primary"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Siguiente
        </button>
      </div>

      {/* Detalle */}
      {selected && <DetailModal selected={selected} onClose={() => setSelected(null)} />}

      <footer className="footer">
        Datos por TMDB. Este producto usa la API de TMDB pero no está respaldado por TMDB.
      </footer>
    </div>
  );
}

function labelForSection(id) {
  return (
    {
      popular: "Populares",
      now_playing: "En cartelera",
      top_rated: "Mejor valoradas",
      upcoming: "Próximos estrenos",
    }[id] || "Películas"
  );
}

function Tab({ id, cur, set, children }) {
  return (
    <button className={`chip ${cur === id ? "chip-active" : ""}`} onClick={set}>
      {children}
    </button>
  );
}

function ApiKeyWidget({ apiKey, setApiKey }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="apikey">
      <button className="ghost" onClick={() => setOpen((v) => !v)}>
        API Key
      </button>
      {open && (
        <div className="apikey-pop">
          <p className="muted">
            Pega tu API Key de TMDB (v3 o v4 Bearer). Se guarda localmente.
          </p>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key aquí"
          />
        </div>
      )}
    </div>
  );
}

function Hero({ item }) {
  if (!item) return null;
  const backdrop = item.backdrop_path ? `${IMG_BASE}original${item.backdrop_path}` : null;
  return (
    <div className="hero">
      {backdrop && (
        <div
          className="hero-bg"
          style={{ backgroundImage: `url(${backdrop})` }}
          aria-hidden
        />
      )}
      <div className="hero-content">
        <div className="hero-left">
          <h1>{item.title}</h1>
          <p className="muted">{item.overview || "Sin sinopsis."}</p>
          <div className="hero-meta">
            <span>Estreno: {item.release_date || "—"}</span>
            <span>★ {item.vote_average?.toFixed?.(1) ?? "—"}</span>
            <span>Votos: {item.vote_count ?? "—"}</span>
          </div>
        </div>
        <div className="hero-right">
          <img
            alt={item.title}
            src={item.poster_path ? `${IMG_BASE}w342${item.poster_path}` : PLACEHOLDER}
          />
        </div>
      </div>
    </div>
  );
}

function MovieCard({ m, onOpen }) {
  return (
    <button className="card" onClick={onOpen}>
      <div className="card-img">
        <img
          alt={m.title}
          src={m.poster_path ? `${IMG_BASE}w500${m.poster_path}` : PLACEHOLDER}
        />
        <div className="card-rating">★ {m.vote_average?.toFixed?.(1) ?? "—"}</div>
      </div>
      <div className="card-body">
        <div className="card-title">{m.title}</div>
        <div className="muted small">{m.release_date || "—"}</div>
        <p className="muted small">{m.overview || "Sin sinopsis."}</p>
      </div>
    </button>
  );
}

function DetailModal({ selected, onClose }) {
  const { loading, data, err } = selected || {};
  const g = (data?.genres || []).map((x) => x.name).join(" · ");
  const runtime = data?.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : "";
  const directors = (data?.credits?.crew || []).filter((c) => c.job === "Director");
  const cast = (data?.credits?.cast || []).slice(0, 6);

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-poster">
            {data?.poster_path ? (
              <img src={`${IMG_BASE}w342${data.poster_path}`} alt={data?.title} />
            ) : (
              <img src={PLACEHOLDER} alt="Sin póster" />
            )}
          </div>
          <div className="modal-titlebox">
            <div className="modal-title">
              <h3>{data?.title || "Cargando…"}</h3>
              <button className="ghost" onClick={onClose}>
                Cerrar
              </button>
            </div>
            <div className="muted small wrap">
              {!!data?.release_date && <span>Estreno: {data.release_date}</span>}
              {!!runtime && <span>{runtime}</span>}
              {!!data?.original_language && (
                <span>Idioma: {data.original_language.toUpperCase()}</span>
              )}
              {!!g && <span>{g}</span>}
            </div>
            <p className="modal-overview">{data?.overview || "Sin sinopsis."}</p>
          </div>
        </div>

        <div className="modal-body">
          <section>
            <h4>Reparto principal</h4>
            <div className="cast">
              {cast?.length ? (
                cast.map((c) => (
                  <div key={c.cast_id || c.credit_id} className="cast-item">
                    <img
                      alt={c.name}
                      src={
                        c.profile_path ? `${IMG_BASE}w185${c.profile_path}` : PLACEHOLDER
                      }
                    />
                    <div>
                      <div className="small b">{c.name}</div>
                      <div className="small muted">{c.character}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted small">No disponible.</div>
              )}
            </div>
          </section>

          <section>
            <h4>Dirección</h4>
            {directors?.length ? (
              directors.map((d) => (
                <div key={d.credit_id} className="small">
                  {d.name}
                </div>
              ))
            ) : (
              <div className="muted small">No disponible.</div>
            )}
          </section>

          <section>
            <h4>Calificaciones</h4>
            <div className="small">
              <span>★ {data?.vote_average?.toFixed?.(1) ?? "—"} / 10</span>{" "}
              <span>· Votos: {data?.vote_count ?? "—"}</span>{" "}
              {data?.status && <span>· Estado: {data.status}</span>}
            </div>
          </section>

          <section>
            <h4>Enlaces</h4>
            <div className="links">
              {data?.homepage && (
                <a href={data.homepage} target="_blank" rel="noreferrer">
                  Sitio oficial
                </a>
              )}
              {data?.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${data.imdb_id}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  IMDb
                </a>
              )}
              {!!data?.id && (
                <a
                  href={`https://www.themoviedb.org/movie/${data.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  TMDB
                </a>
              )}
            </div>
          </section>

          {loading && <div className="muted small">Cargando…</div>}
          {err && <div className="alert error">{err}</div>}
        </div>
      </div>
    </div>
  );
}
