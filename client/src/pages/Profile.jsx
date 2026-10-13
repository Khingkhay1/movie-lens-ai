import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const getPosterUrl = (posterPath, size = "w500") => {
  if (!posterPath) return null;

  if (
    posterPath.startsWith("http://") ||
    posterPath.startsWith("https://")
  ) {
    return posterPath;
  }

  if (posterPath.startsWith("//")) {
    return `https:${posterPath}`;
  }

  if (posterPath.startsWith("/")) {
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
  }

  return `https://image.tmdb.org/t/p/${size}/${posterPath}`;
};

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [savedMovies, setSavedMovies] = useState([]);
  const [history, setHistory] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteBox, setShowDeleteBox] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [clearingSearchHistory, setClearingSearchHistory] =
    useState(false);

  const [clearingIdentifications, setClearingIdentifications] =
    useState(false);

  // ==========================================
  // LOAD PROFILE DATA
  // ==========================================

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      try {
        setError("");

        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (!isActive) return;

        if (userError || !currentUser) {
          navigate("/login");
          return;
        }

        setUser(currentUser);

        setDisplayName(
          currentUser.user_metadata?.display_name || ""
        );

        // ==========================================
        // SAVED MOVIES
        // ==========================================

        const {
          data: savedData,
          error: savedError,
        } = await supabase
          .from("saved_movies")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", {
            ascending: false,
          });

        if (!isActive) return;

        if (savedError) {
          console.error(
            "Saved movies error:",
            savedError
          );
        } else {
          setSavedMovies(savedData || []);
        }

        // ==========================================
        // IDENTIFICATION HISTORY
        // ==========================================

        const {
          data: historyData,
          error: historyError,
        } = await supabase
          .from("identification_history")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", {
            ascending: false,
          });

        if (!isActive) return;

        if (historyError) {
          console.error(
            "Identification history error:",
            historyError
          );
        } else {
          setHistory(historyData || []);
        }

        // ==========================================
        // SEARCH HISTORY
        // ==========================================

        const {
          data: searchData,
          error: searchError,
        } = await supabase
          .from("search_history")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", {
            ascending: false,
          });

        if (!isActive) return;

        if (searchError) {
          console.error(
            "Search history error:",
            searchError
          );
        } else {
          setSearchHistory(searchData || []);
        }
      } catch (err) {
        if (!isActive) return;

        console.error(err);

        setError(
          "Something went wrong while loading your profile."
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  // ==========================================
  // SAVE PROFILE
  // ==========================================

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      setError("");

      const {
        error: updateError,
      } = await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
        },
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setUser((current) => ({
        ...current,
        user_metadata: {
          ...current.user_metadata,
          display_name: displayName.trim(),
        },
      }));

      setEditing(false);
    } catch (err) {
      console.error(err);
      setError("Could not update your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ==========================================
  // SIGN OUT
  // ==========================================

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // ==========================================
  // CLEAR SEARCH HISTORY
  // ==========================================

  const handleClearSearchHistory = async () => {
    if (!user || clearingSearchHistory) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear your search history?"
    );

    if (!confirmed) return;

    try {
      setClearingSearchHistory(true);
      setError("");

      const { error: deleteError } = await supabase
        .from("search_history")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      setSearchHistory([]);
    } catch (err) {
      console.error(
        "Clear search history error:",
        err
      );

      setError(
        err.message ||
          "Could not clear your search history."
      );
    } finally {
      setClearingSearchHistory(false);
    }
  };

  // ==========================================
  // CLEAR IDENTIFICATION HISTORY
  // ==========================================

  const handleClearIdentificationHistory = async () => {
    if (!user || clearingIdentifications) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear your identification history?"
    );

    if (!confirmed) return;

    try {
      setClearingIdentifications(true);
      setError("");

      const { error: deleteError } = await supabase
        .from("identification_history")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      setHistory([]);
    } catch (err) {
      console.error(
        "Clear identification history error:",
        err
      );

      setError(
        err.message ||
          "Could not clear identification history."
      );
    } finally {
      setClearingIdentifications(false);
    }
  };

  // ==========================================
  // DELETE ACCOUNT
  // ==========================================

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setDeletingAccount(true);
      setError("");

      // Verify password first
      const {
        error: passwordError,
      } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });

      if (passwordError) {
        setError("Incorrect password.");
        return;
      }

      // Get fresh session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "Your session has expired. Please log in again."
        );
        return;
      }

      // Send authenticated request to backend
      const response = await fetch(`${API_URL}/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.message ||
            "Could not delete account."
        );
        return;
      }

      await supabase.auth.signOut();

      navigate("/login");
    } catch (err) {
      console.error(
        "Delete account error:",
        err
      );

      setError("Could not delete account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  // ==========================================
  // DATE FORMAT
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F1115] text-[#F4F1EA]">
        <p className="text-[#9298A5]">
          Loading profile...
        </p>
      </main>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0F1115] px-6 py-12 text-[#F4F1EA]">

      {/* CINEMATIC BACKGROUND */}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-250px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#D6A85F]/[0.05] blur-[140px]" />

        <div className="absolute bottom-[10%] left-[-100px] h-[300px] w-[400px] rounded-full bg-[#52677D]/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl">

        {/* ==========================================
            PROFILE HEADER
        ========================================== */}

        <div className="mb-10 flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-[#D6A85F]">
              MovieLens AI
            </p>

            <h1 className="text-4xl font-semibold tracking-tight text-[#F4F1EA] md:text-5xl">
              My Profile
            </h1>

            <p className="mt-3 text-[#9298A5]">
              Manage your account and movie activity.
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-[#9298A5] transition duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-[#F4F1EA]"
          >
            Sign Out
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ==========================================
            PROFILE INFORMATION
        ========================================== */}

        <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.025] p-6 md:p-8">

          <div className="mb-7 flex items-center justify-between gap-4">

            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#626875]">
                Account
              </p>

              <h2 className="mt-2 text-xl font-semibold text-[#F4F1EA]">
                Profile Information
              </h2>
            </div>

            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-full border border-[#D6A85F]/30 bg-[#D6A85F]/[0.06] px-5 py-2.5 text-sm font-medium text-[#D6A85F] transition duration-300 hover:border-[#D6A85F]/60 hover:bg-[#D6A85F]/[0.12]"
              >
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-5">

              <div>
                <label className="mb-2 block text-sm font-medium text-[#9298A5]">
                  Display Name
                </label>

                <input
                  type="text"
                  value={displayName}
                  onChange={(e) =>
                    setDisplayName(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[#F4F1EA] outline-none transition focus:border-[#D6A85F]/50 focus:bg-white/[0.05]"
                  placeholder="Enter your name"
                />
              </div>

              <div className="flex flex-wrap gap-3">

                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="rounded-full bg-[#F4F1EA] px-6 py-3 text-sm font-medium text-[#0F1115] transition duration-300 hover:-translate-y-0.5 hover:bg-[#D6A85F] disabled:opacity-50"
                >
                  {savingProfile
                    ? "Saving..."
                    : "Save Changes"}
                </button>

                <button
                  onClick={() => setEditing(false)}
                  className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-[#9298A5] transition hover:border-white/20 hover:bg-white/[0.04] hover:text-[#F4F1EA]"
                >
                  Cancel
                </button>

              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.15em] text-[#626875]">
                  Name
                </p>

                <p className="font-medium text-[#F4F1EA]">
                  {user?.user_metadata?.display_name ||
                    "Not set"}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                <p className="mb-2 text-xs uppercase tracking-[0.15em] text-[#626875]">
                  Email
                </p>

                <p className="break-all font-medium text-[#F4F1EA]">
                  {user?.email}
                </p>
              </div>

            </div>
          )}
        </section>

        {/* ==========================================
            STATS
        ========================================== */}

        <section className="mb-10 grid grid-cols-2 gap-4">

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-[#626875]">
              Saved Movies
            </p>

            <p className="mt-3 text-4xl font-semibold text-[#F4F1EA]">
              {savedMovies.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-[#626875]">
              Identifications
            </p>

            <p className="mt-3 text-4xl font-semibold text-[#D6A85F]">
              {history.length}
            </p>
          </div>

        </section>

        {/* ==========================================
            SEARCH HISTORY
        ========================================== */}

        <section className="mb-12">

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#D6A85F]">
                Your activity
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Search History
              </h2>

              <p className="mt-2 text-sm text-[#9298A5]">
                Searches you have made on MovieLens AI.
              </p>
            </div>

            {searchHistory.length > 0 && (
              <button
                onClick={handleClearSearchHistory}
                disabled={clearingSearchHistory}
                className="rounded-full border border-red-500/20 px-5 py-2.5 text-sm font-medium text-red-400 transition hover:border-red-500/40 hover:bg-red-500/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearingSearchHistory
                  ? "Clearing..."
                  : "Clear Search History"}
              </button>
            )}

          </div>

          {searchHistory.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center">

              <p className="text-[#626875]">
                You haven't searched for any movies yet.
              </p>

              <Link
                to="/search"
                className="mt-4 inline-flex rounded-full border border-[#D6A85F]/30 px-5 py-2.5 text-sm text-[#D6A85F] transition hover:bg-[#D6A85F]/[0.06]"
              >
                Start Searching
              </Link>

            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">

              {searchHistory.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between ${
                    index !== searchHistory.length - 1
                      ? "border-b border-white/[0.07]"
                      : ""
                  }`}
                >

                  <div className="flex min-w-0 items-center gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D6A85F]/[0.08] text-[#D6A85F]">
                      🔍
                    </div>

                    <div className="min-w-0">

                      <p className="truncate font-medium text-[#F4F1EA]">
                        {item.query}
                      </p>

                      <p className="mt-1 text-xs text-[#626875]">
                        Searched {formatDateTime(item.created_at)}
                      </p>

                    </div>

                  </div>

                  <Link
                    to={`/search?query=${encodeURIComponent(
                      item.query
                    )}`}
                    className="shrink-0 text-sm font-medium text-[#D6A85F] transition hover:text-[#E4C58B]"
                  >
                    Search again →
                  </Link>

                </div>
              ))}

            </div>
          )}
        </section>

        {/* ==========================================
            SAVED MOVIES
        ========================================== */}

        <section className="mb-12">

          <div className="mb-6">

            <p className="text-xs uppercase tracking-[0.2em] text-[#D6A85F]">
              Your collection
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Saved Movies
            </h2>

            <p className="mt-2 text-sm text-[#9298A5]">
              Movies you've saved for later.
            </p>

          </div>

          {savedMovies.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center">

              <p className="text-[#626875]">
                You haven't saved any movies yet.
              </p>

              <Link
                to="/search"
                className="mt-4 inline-flex rounded-full border border-[#D6A85F]/30 px-5 py-2.5 text-sm text-[#D6A85F] transition hover:bg-[#D6A85F]/[0.06]"
              >
                Find Movies
              </Link>

            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">

              {savedMovies.map((movie) => {

                const posterUrl = getPosterUrl(
                  movie.poster ||
                    movie.poster_path,
                  "w500"
                );

                return (
                  <Link
                    key={movie.id}
                    to={`/movie/${
                      movie.media_type || "movie"
                    }/${movie.tmdb_id}`}
                    className="group"
                  >

                    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.025] transition duration-300 hover:-translate-y-1 hover:border-[#D6A85F]/30">

                      {posterUrl ? (
                        <div className="overflow-hidden">

                          <img
                            src={posterUrl}
                            alt={movie.title}
                            className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.style.display =
                                "none";

                              e.currentTarget.parentElement.innerHTML =
                                '<div class="flex aspect-[2/3] w-full items-center justify-center bg-white/[0.03] text-sm text-[#626875]">No Poster</div>';
                            }}
                          />

                        </div>
                      ) : (
                        <div className="flex aspect-[2/3] w-full items-center justify-center bg-white/[0.03] text-sm text-[#626875]">
                          No Poster
                        </div>
                      )}

                      <div className="p-4">

                        <h3 className="line-clamp-1 font-medium text-[#F4F1EA]">
                          {movie.title}
                        </h3>

                        {movie.year && (
                          <p className="mt-1 text-sm text-[#626875]">
                            {movie.year}
                          </p>
                        )}

                        {movie.rating && (
                          <p className="mt-1 text-xs text-[#D6A85F]">
                            ★ {movie.rating}/10
                          </p>
                        )}

                      </div>

                    </div>

                  </Link>
                );
              })}

            </div>
          )}
        </section>

        {/* ==========================================
            RECENT IDENTIFICATIONS
        ========================================== */}

        <section className="mb-14">

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-xs uppercase tracking-[0.2em] text-[#D6A85F]">
                Discovery
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Recent Identifications
              </h2>

              <p className="mt-2 text-sm text-[#9298A5]">
                Your latest movie discoveries.
              </p>

            </div>

            <div className="flex flex-wrap gap-3">

              {history.length > 0 && (
                <Link
                  to="/history"
                  className="whitespace-nowrap text-sm font-medium text-[#D6A85F] transition hover:text-[#E4C58B] hover:underline"
                >
                  View Full History →
                </Link>
              )}

              {history.length > 0 && (
                <button
                  onClick={handleClearIdentificationHistory}
                  disabled={clearingIdentifications}
                  className="whitespace-nowrap rounded-full border border-red-500/20 px-4 py-2 text-xs font-medium text-red-400 transition hover:border-red-500/40 hover:bg-red-500/[0.05] disabled:opacity-50"
                >
                  {clearingIdentifications
                    ? "Clearing..."
                    : "Clear History"}
                </button>
              )}

            </div>

          </div>

          {history.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-10 text-center">

              <p className="text-[#626875]">
                You haven't identified any movies yet.
              </p>

              <Link
                to="/"
                className="mt-4 inline-flex rounded-full border border-[#D6A85F]/30 px-5 py-2.5 text-sm text-[#D6A85F] transition hover:bg-[#D6A85F]/[0.06]"
              >
                Identify a Movie
              </Link>

            </div>
          ) : (
            <>
              <div className="space-y-3">

                {history.slice(0, 3).map((item) => {

                  const posterUrl = getPosterUrl(
                    item.poster ||
                      item.poster_path,
                    "w200"
                  );

                  return (
                    <Link
                      key={item.id}
                      to={`/movie/${
                        item.media_type || "movie"
                      }/${item.tmdb_id}`}
                      className="group block"
                    >

                      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4 transition duration-300 hover:border-[#D6A85F]/25 hover:bg-white/[0.04]">

                        {posterUrl ? (
                          <img
                            src={posterUrl}
                            alt={item.title}
                            className="h-24 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-24 w-16 items-center justify-center rounded-lg bg-white/[0.03] text-xs text-[#626875]">
                            No Poster
                          </div>
                        )}

                        <div className="min-w-0 flex-1">

                          <h3 className="truncate font-semibold text-[#F4F1EA] transition group-hover:text-[#D6A85F]">
                            {item.title}
                          </h3>

                          <p className="mt-1 text-sm text-[#626875]">
                            {item.year ||
                              "Unknown year"}
                          </p>

                          <p className="text-sm capitalize text-[#626875]">
                            {item.media_type ||
                              "movie"}
                          </p>

                          {item.confidence !== null &&
                            item.confidence !==
                              undefined && (
                              <p className="mt-1 text-sm text-[#D6A85F]">
                                Confidence:{" "}
                                {item.confidence}%
                              </p>
                            )}

                        </div>

                        <p className="hidden text-xs text-[#626875] sm:block">
                          {formatDate(
                            item.created_at
                          )}
                        </p>

                      </div>

                    </Link>
                  );
                })}

              </div>

              {history.length > 3 && (
                <div className="mt-5 text-center">

                  <Link
                    to="/history"
                    className="inline-flex rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-[#9298A5] transition hover:border-[#D6A85F]/40 hover:bg-[#D6A85F]/[0.05] hover:text-[#D6A85F]"
                  >
                    View All {history.length}{" "}
                    Identifications
                  </Link>

                </div>
              )}
            </>
          )}

        </section>

        {/* ==========================================
            DELETE ACCOUNT
        ========================================== */}

        <section className="border-t border-white/10 pb-12 pt-10">

          <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.02] p-6 md:p-8">

            <p className="text-xs uppercase tracking-[0.2em] text-red-400/70">
              Danger Zone
            </p>

            <h2 className="mt-2 text-xl font-semibold text-[#F4F1EA]">
              Delete Account
            </h2>

            <p className="mb-5 mt-2 max-w-2xl text-sm leading-6 text-[#626875]">
              Permanently delete your account and all
              associated data. This action cannot be undone.
            </p>

            {!showDeleteBox ? (
              <button
                onClick={() => setShowDeleteBox(true)}
                className="rounded-full border border-red-500/30 px-6 py-3 text-sm font-medium text-red-400 transition hover:border-red-500/50 hover:bg-red-500/[0.05]"
              >
                Delete My Account
              </button>
            ) : (
              <div className="max-w-md space-y-4">

                <div>

                  <label className="mb-2 block text-sm font-medium text-[#9298A5]">
                    Enter your password to confirm
                  </label>

                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) =>
                      setDeletePassword(
                        e.target.value
                      )
                    }
                    placeholder="Your password"
                    className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-3 text-[#F4F1EA] outline-none transition focus:border-red-500/50"
                  />

                </div>

                <div className="flex flex-wrap gap-3">

                  <button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="rounded-full bg-red-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                  >
                    {deletingAccount
                      ? "Deleting..."
                      : "Confirm Delete"}
                  </button>

                  <button
                    onClick={() => {
                      setShowDeleteBox(false);
                      setDeletePassword("");
                      setError("");
                    }}
                    className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-[#9298A5] transition hover:border-white/20 hover:bg-white/[0.04] hover:text-[#F4F1EA]"
                  >
                    Cancel
                  </button>

                </div>

              </div>
            )}

          </div>

        </section>

      </div>
    </main>
  );
}

export default Profile;