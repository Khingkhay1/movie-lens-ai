import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

function History() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          navigate("/login");
          return;
        }

        const {
          data,
          error: historyError,
        } = await supabase
          .from("identification_history")
          .select(
            "id, user_id, tmdb_id, title, media_type, year, confidence, poster, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (historyError) {
          throw historyError;
        }

        setHistory(data || []);
      } catch (err) {
        console.error(
          "History error:",
          err
        );

        setError(
          err.message ||
            "Unable to load identification history."
        );
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [navigate]);

  function formatDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">
          Loading history...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

          <div>
            <h1 className="text-3xl font-bold">
              Identification History
            </h1>

            <p className="text-gray-400 mt-2">
              Every movie you've identified with MovieLens AI.
            </p>
          </div>

          <Link
            to="/profile"
            className="text-blue-400 hover:text-blue-300"
          >
            ← Back to Profile
          </Link>

        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/40 border border-red-700 text-red-300">
            {error}
          </div>
        )}

        {/* Empty state */}
        {history.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">

            <h2 className="text-xl font-semibold">
              No identification history
            </h2>

            <p className="text-gray-400 mt-2">
              Movies you identify will appear here.
            </p>

            <Link
              to="/"
              className="inline-block mt-5 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition"
            >
              Identify a Movie
            </Link>

          </div>
        ) : (
          <div className="space-y-4">

            {history.map((item) => (
              <Link
                key={item.id}
                to={`/movie/${item.media_type || "movie"}/${item.tmdb_id}`}
                className="block"
              >
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5 flex gap-4 hover:border-blue-500 transition">

                  {/* Poster */}
                  <div className="w-20 h-28 sm:w-24 sm:h-36 flex-shrink-0">

                    {item.poster ? (
                      <img
                        src={item.poster}
                        alt={
                          item.title ||
                          "Movie"
                        }
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-500 text-center px-2">
                          No Image
                        </span>
                      </div>
                    )}

                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">

                    <h2 className="text-lg sm:text-xl font-semibold truncate">
                      {item.title ||
                        "Untitled Movie"}
                    </h2>

                    <p className="text-gray-400 text-sm mt-2">
                      {item.year ||
                        "Unknown year"}{" "}
                      •{" "}
                      {item.media_type ||
                        "movie"}
                    </p>

                    {item.confidence !== null &&
                      item.confidence !==
                        undefined && (
                        <p className="text-green-400 text-sm mt-3">
                          Confidence:{" "}
                          {item.confidence}%
                        </p>
                      )}

                    <p className="text-gray-500 text-xs mt-3">
                      Identified{" "}
                      {formatDate(
                        item.created_at
                      )}
                    </p>

                  </div>

                </div>
              </Link>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}

export default History;