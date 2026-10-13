import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { useEffect, useState } from "react";

import { supabase } from "../supabaseClient";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function MovieDetails() {
  const { id, type } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const cameFromHome = location.state?.from === "home";

  useEffect(() => {
    async function loadMovie() {
      setError("");
      setMovie(null);

      try {
        const response = await fetch(
          `${API_URL}/movies/${type}/${id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Could not load this title."
          );
        }

        setMovie(data);
      } catch (loadError) {
        console.error(
          "Movie details error:",
          loadError
        );

        setError(
          loadError.message ||
            "Could not load this title."
        );
      }
    }

    loadMovie();
  }, [id, type]);

  async function saveMovie() {
    if (!movie || saving) return;

    setSaveMessage("");
    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        setSaveMessage("Sign in to save movies.");
        return;
      }

      const { error: saveError } = await supabase
        .from("saved_movies")
        .upsert(
          {
            user_id: user.id,
            tmdb_id: movie.id,
            media_type:
              movie.type ||
              type ||
              "movie",
            title: movie.title,
            year: movie.year,
            rating: movie.rating,
            poster: movie.poster,
          },
          {
            onConflict:
              "user_id,tmdb_id,media_type",
          }
        );

      if (saveError) {
        throw new Error(saveError.message);
      }

      setSaveMessage(
        "Saved to your profile."
      );
    } catch (saveError) {
      console.error(
        "Save movie error:",
        saveError
      );

      setSaveMessage(
        saveError.message ||
          "Could not save this movie."
      );
    } finally {
      setSaving(false);
    }
  }

  // Always return to the actual previous page.
  function goBack() {
    navigate(-1);
  }

  function endSession() {
    navigate("/", {
      state: {
        clearMovieSession: true,
      },
    });
  }

  function uploadAnotherClip() {
    navigate("/", {
      state: {
        clearMovieSession: true,
        scrollToUpload: true,
      },
    });
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0F1115] px-6 py-12 text-[#F4F1EA]">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={goBack}
            className="mb-8 rounded-xl border border-white/10 px-5 py-3 text-sm text-[#B0B4BD] transition hover:border-[#D6A85F]/40 hover:text-white"
          >
            ← Back
          </button>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
            <p className="text-red-400">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!movie) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F1115] text-[#F4F1EA]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#D6A85F]" />

          <p className="mt-4 text-[#737986]">
            Loading title...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0F1115] text-[#F4F1EA]">
      <section
        className="relative overflow-hidden px-6 py-10 md:py-16"
        style={
          movie.backdrop
            ? {
                backgroundImage: `linear-gradient(rgba(15,17,21,.78), #0F1115), url(${movie.backdrop})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="mx-auto max-w-6xl">

          {/* Always goes to the actual previous page */}
          <button
            type="button"
            onClick={goBack}
            className="mb-10 inline-flex items-center rounded-xl border border-white/10 bg-black/20 px-5 py-3 text-sm text-[#B0B4BD] backdrop-blur transition hover:border-[#D6A85F]/40 hover:text-white"
          >
            ← Back
          </button>

          <div className="flex flex-col gap-10 md:flex-row">

            {movie.poster && (
              <img
                src={movie.poster}
                alt={movie.title}
                className="w-full max-w-xs rounded-2xl object-cover shadow-2xl md:w-56"
              />
            )}

            <div className="max-w-3xl">

              <p className="text-xs uppercase tracking-[.25em] text-[#D6A85F]">
                {movie.type === "tv"
                  ? "TV Series"
                  : "Movie"}
              </p>

              <h1 className="mt-3 text-5xl font-semibold md:text-7xl">
                {movie.title}
              </h1>

              <p className="mt-5 text-[#B0B4BD]">
                {movie.year || "Unknown year"}

                {movie.runtime
                  ? ` · ${movie.runtime}`
                  : ""}

                {movie.genre
                  ? ` · ${movie.genre}`
                  : ""}
              </p>

              {movie.rating !== undefined &&
                movie.rating !== null && (
                  <div className="mt-6 inline-flex rounded-full border border-[#D6A85F]/30 bg-[#D6A85F]/10 px-4 py-2 text-[#D6A85F]">
                    ★ {movie.rating}/10
                  </div>
                )}

              {movie.plot && (
                <p className="mt-7 leading-8 text-[#C0C4CC]">
                  {movie.plot}
                </p>
              )}

              {movie.director && (
                <p className="mt-6 text-sm text-[#9298A5]">
                  Directed/created by{" "}
                  {movie.director}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">

                {movie.trailerKey && (
                  <a
                    href={`https://www.youtube.com/watch?v=${movie.trailerKey}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-[#F4F1EA] px-6 py-3 font-medium text-[#0F1115] transition hover:bg-[#D6A85F]"
                  >
                    Watch trailer
                  </a>
                )}

                <button
                  type="button"
                  onClick={saveMovie}
                  disabled={saving}
                  className="rounded-xl bg-[#D6A85F] px-6 py-3 font-medium text-[#0F1115] transition hover:bg-[#E5BC78] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : "Save movie"}
                </button>

                {/* Explicit destination button */}
                {cameFromHome ? (
                  <Link
                    to="/"
                    className="rounded-xl border border-white/10 px-6 py-3 transition hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    Go to Home
                  </Link>
                ) : (
                  <Link
                    to="/search"
                    className="rounded-xl border border-white/10 px-6 py-3 transition hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    Go to Search
                  </Link>
                )}

              </div>

              {saveMessage && (
                <p className="mt-4 text-sm text-[#D6A85F]">
                  {saveMessage}
                </p>
              )}

              {/* Home session controls */}
              {cameFromHome && (
                <div className="mt-10 border-t border-white/10 pt-8">

                  <p className="mb-4 text-sm text-[#737986]">
                    MovieLens session
                  </p>

                  <div className="flex flex-wrap gap-3">

                    <button
                      type="button"
                      onClick={uploadAnotherClip}
                      className="rounded-xl bg-[#F4F1EA] px-6 py-3 text-sm font-medium text-[#0F1115] transition hover:bg-[#D6A85F]"
                    >
                      Upload another clip
                    </button>

                    <button
                      type="button"
                      onClick={endSession}
                      className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                    >
                      End session
                    </button>

                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default MovieDetails;