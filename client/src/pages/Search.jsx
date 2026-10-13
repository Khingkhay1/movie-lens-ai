import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchTimeoutRef = useRef(null);
  const suggestionRequestRef = useRef(0);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const term = query.trim();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (term.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const requestId = ++suggestionRequestRef.current;

    searchTimeoutRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);

      try {
        const response = await fetch(
          `${API_URL}/movies/search?query=${encodeURIComponent(term)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Suggestion search failed."
          );
        }

        if (requestId === suggestionRequestRef.current) {
          setSuggestions((data.results || []).slice(0, 6));
        }
      } catch (suggestionError) {
        if (requestId === suggestionRequestRef.current) {
          console.error(
            "Search suggestion error:",
            suggestionError
          );

          setSuggestions([]);
        }
      } finally {
        if (requestId === suggestionRequestRef.current) {
          setSuggestionsLoading(false);
        }
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  async function saveSearchHistory(term) {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Search history user error:",
          userError
        );
        return;
      }

      if (!user) {
        return;
      }

      const { error: historyError } = await supabase
        .from("search_history")
        .insert({
          user_id: user.id,
          query: term,
        });

      if (historyError) {
        console.error(
          "Search history save error:",
          historyError
        );
      }
    } catch (historyError) {
      console.error(
        "Search history error:",
        historyError
      );
    }
  }

  async function handleSearch(event) {
    event.preventDefault();

    const term = query.trim();

    if (term.length < 2) {
      setError("Enter at least two characters.");
      return;
    }

    setLoading(true);
    setError("");
    setShowSuggestions(false);

    try {
      const response = await fetch(
        `${API_URL}/movies/search?query=${encodeURIComponent(term)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Search failed."
        );
      }

      setResults(data.results || []);

      // Save only actual submitted searches.
      await saveSearchHistory(term);
    } catch (searchError) {
      setError(searchError.message || "Search failed.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleInputFocus() {
    if (query.trim().length >= 2) {
      setShowSuggestions(true);
    }
  }

  function handleInputChange(event) {
    setQuery(event.target.value);
    setShowSuggestions(true);
    setError("");

    if (event.target.value.trim().length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
    }
  }

  function handleSuggestionClick() {
    setShowSuggestions(false);
  }

  return (
    <main className="min-h-screen bg-[#0F1115] px-6 pb-24 text-[#F4F1EA]">
      <section className="mx-auto max-w-6xl pt-20">

        {/* Page heading */}

        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#D6A85F]">
          Movie discovery
        </p>

        <h1 className="mt-3 text-4xl font-semibold md:text-5xl">
          Find a movie.
        </h1>

        <p className="mt-4 max-w-2xl text-[#737986]">
          Search for a movie or series and MovieLens will help you
          discover exactly what you&apos;re looking for.
        </p>

        {/* Search area */}

        <div className="relative mt-10 max-w-3xl">

          <form
            onSubmit={handleSearch}
            className="flex rounded-2xl border border-white/10 bg-[#171A21] p-2"
          >
            <input
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder="Search for a movie or series..."
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-[#F4F1EA] outline-none placeholder:text-[#555B67]"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#F4F1EA] px-6 py-3 text-sm font-medium text-[#0F1115] transition hover:bg-[#D6A85F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Suggestions dropdown */}

          {showSuggestions && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#171A21] shadow-2xl">

              {suggestionsLoading ? (
                <div className="px-5 py-6 text-sm text-[#737986]">
                  Looking for movies...
                </div>
              ) : suggestions.length > 0 ? (
                <div>

                  <div className="border-b border-white/10 px-5 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#D6A85F]">
                      Suggestions
                    </p>
                  </div>

                  {suggestions.map((movie) => (
                    <Link
                      key={`${movie.type}-${movie.id}`}
                      to={`/movie/${movie.type || "movie"}/${movie.id}`}
                      onClick={handleSuggestionClick}
                      className="flex items-center gap-4 border-b border-white/5 px-5 py-4 transition last:border-b-0 hover:bg-white/[0.04]"
                    >
                      {movie.poster ? (
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="h-16 w-11 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[10px] text-[#737986]">
                          N/A
                        </div>
                      )}

                      <div className="min-w-0 flex-1">

                        <h2 className="truncate font-medium text-[#F4F1EA]">
                          {movie.title}
                        </h2>

                        <p className="mt-1 text-sm text-[#737986]">
                          {movie.year || "Year unknown"} ·{" "}
                          {movie.type === "tv"
                            ? "TV Series"
                            : "Movie"}
                        </p>

                        {movie.rating !== undefined &&
                          movie.rating !== null && (
                            <p className="mt-1 text-xs text-[#D6A85F]">
                              ⭐ {movie.rating}/10
                            </p>
                          )}

                      </div>

                      <span className="text-sm text-[#737986]">
                        →
                      </span>
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="w-full border-t border-white/10 px-5 py-4 text-left text-sm text-[#D6A85F] transition hover:bg-white/[0.04]"
                  >
                    See all results for &quot;{query.trim()}&quot; →
                  </button>

                </div>
              ) : (
                <div className="px-5 py-6">

                  <p className="font-medium text-[#F4F1EA]">
                    No exact matches found.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#737986]">
                    Try another spelling or search for a different
                    movie or series.
                  </p>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Error */}

        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}

      </section>

      {/* Search results */}

      <section className="mx-auto mt-14 max-w-6xl">

        {results.length > 0 ? (
          <>
            <div className="mb-6">

              <p className="text-xs uppercase tracking-[0.2em] text-[#D6A85F]">
                Search results
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Results for &quot;{query.trim()}&quot;
              </h2>

            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

              {results.map((movie) => (
                <Link
                  key={`${movie.type}-${movie.id}`}
                  to={`/movie/${movie.type || "movie"}/${movie.id}`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-[#171A21] transition hover:-translate-y-1 hover:border-[#D6A85F]/40"
                >
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="h-80 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-80 items-center justify-center bg-white/[0.03] text-[#737986]">
                      No poster
                    </div>
                  )}

                  <div className="p-5">

                    <p className="text-xs uppercase text-[#D6A85F]">
                      {movie.type === "tv"
                        ? "TV Series"
                        : "Movie"}
                    </p>

                    <h2 className="mt-2 font-semibold">
                      {movie.title}
                    </h2>

                    <p className="mt-2 text-sm text-[#737986]">
                      {movie.year || "Release date unknown"} · ★{" "}
                      {movie.rating ?? "N/A"}
                    </p>

                  </div>
                </Link>
              ))}

            </div>
          </>
        ) : (
          !loading &&
          query.trim().length >= 2 && (
            <div className="rounded-2xl border border-white/10 bg-[#171A21] p-10 text-center">

              <h2 className="text-xl font-semibold">
                We couldnt find that title.
              </h2>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#737986]">
                Try a different spelling, a shorter search, or another
                movie or series.
              </p>

            </div>
          )
        )}

      </section>
    </main>
  );
}

export default Search;