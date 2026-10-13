const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

// ==========================================
// TMDb REQUEST HELPER
// ==========================================

async function tmdbFetch(url, attempts = 2) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      console.log(`🌐 TMDb request ${attempt}/${attempts}`);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(
          `TMDb HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (error.name === "AbortError") {
        console.error("⏱️ TMDb request timed out.");
      } else {
        console.error("❌ TMDb request failed:", error.message);
      }

      if (attempt < attempts) {
        console.log("🔄 Retrying TMDb...");

        await new Promise((resolve) => {
          setTimeout(resolve, 1500);
        });
      }
    }
  }

  throw lastError;
}

// ==========================================
// HELPERS
// ==========================================

function getTitle(item, type) {
  return type === "tv" ? item.name || "" : item.title || "";
}

function getYear(item, type) {
  const date =
    type === "tv" ? item.first_air_date : item.release_date;

  return date ? date.slice(0, 4) : "";
}

function getImage(path, size = "w500") {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}

function getMediaType(type) {
  return type === "series" || type === "tv" ? "tv" : "movie";
}

function getDirector(details, type) {
  if (type === "tv") {
    return (
      details.created_by
        ?.map((person) => person.name)
        .filter(Boolean)
        .join(", ") || "Unknown"
    );
  }

  return (
    details.credits?.crew?.find(
      (person) => person.job === "Director"
    )?.name || "Unknown"
  );
}

// ==========================================
// NORMALIZE TITLE
// ==========================================

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ==========================================
// FIND BEST TMDb MATCH
// ==========================================

function selectBestResult(results, movieName, year, type) {
  const targetTitle = normalizeTitle(movieName);
  const targetYear = Number(year) || 0;

  // 1. Exact title + year
  let match = results.find((result) => {
    const resultTitle = normalizeTitle(
      getTitle(result, type)
    );

    const resultYear = Number(
      getYear(result, type)
    );

    return (
      resultTitle === targetTitle &&
      targetYear > 0 &&
      resultYear === targetYear
    );
  });

  if (match) {
    console.log(
      `🎯 Exact title + year match: ${getTitle(match, type)}`
    );

    return match;
  }

  // 2. Exact title
  match = results.find((result) => {
    return (
      normalizeTitle(getTitle(result, type)) ===
      targetTitle
    );
  });

  if (match) {
    console.log(
      `🎯 Exact title match: ${getTitle(match, type)}`
    );

    return match;
  }

  // 3. Partial title + year
  match = results.find((result) => {
    const resultTitle = normalizeTitle(
      getTitle(result, type)
    );

    const resultYear = Number(
      getYear(result, type)
    );

    const titleMatches =
      resultTitle.includes(targetTitle) ||
      targetTitle.includes(resultTitle);

    const yearMatches =
      !targetYear || resultYear === targetYear;

    return titleMatches && yearMatches;
  });

  if (match) {
    console.log(
      `🎯 Partial title + year match: ${getTitle(match, type)}`
    );

    return match;
  }

  console.log(
    `⚠️ No reliable TMDb ${
      type === "tv" ? "TV" : "movie"
    } match found.`
  );

  return null;
}

// ==========================================
// GET VERIFIED MOVIE DETAILS
// ==========================================

async function getMovieDetails(
  movieName,
  year = 0,
  type = "movie"
) {
  if (!API_KEY) {
    console.error("❌ TMDB_API_KEY is missing.");

    return {
      success: false,
      reason: "MISSING_API_KEY",
    };
  }

  const tmdbType = getMediaType(type);
  const isTV = tmdbType === "tv";

  console.log(
    `🔎 TMDb searching for: ${movieName}${
      year ? ` (${year})` : ""
    } [${tmdbType}]`
  );

  try {
    const searchUrl =
      `${BASE_URL}/search/${tmdbType}` +
      `?api_key=${API_KEY}` +
      `&query=${encodeURIComponent(movieName)}` +
      `&language=en-US`;

    const searchData = await tmdbFetch(searchUrl);

    if (!searchData.results?.length) {
      return {
        success: false,
        reason: "NOT_FOUND",
      };
    }

    const selected = selectBestResult(
      searchData.results,
      movieName,
      year,
      tmdbType
    );

    if (!selected) {
      return {
        success: false,
        reason: "NO_RELIABLE_MATCH",
      };
    }

    const detailsUrl =
      `${BASE_URL}/${tmdbType}/${selected.id}` +
      `?api_key=${API_KEY}` +
      `&language=en-US` +
      `&append_to_response=credits,videos`;

    const details = await tmdbFetch(detailsUrl);

    const title = getTitle(details, tmdbType);
    const releaseYear = getYear(details, tmdbType);

    // Use the detailed poster first.
    // If TMDb does not provide one there, use the
    // poster from the original search result.
    const poster =
      getImage(details.poster_path, "w500") ||
      getImage(selected.poster_path, "w500");

    const backdrop =
      getImage(details.backdrop_path, "original") ||
      getImage(selected.backdrop_path, "original");

    return {
      success: true,

      type: isTV ? "series" : "movie",

      movie:
        title ||
        getTitle(selected, tmdbType),

      year:
        releaseYear ||
        getYear(selected, tmdbType) ||
        "Unknown",

      genre:
        details.genres
          ?.map((genre) => genre.name)
          .filter(Boolean)
          .join(", ") || "Unknown",

      runtime: isTV
        ? details.episode_run_time?.[0]
          ? `${details.episode_run_time[0]} minutes per episode`
          : "Unknown"
        : details.runtime
        ? `${details.runtime} minutes`
        : "Unknown",

      director:
        getDirector(details, tmdbType),

      rating:
        typeof details.vote_average === "number"
          ? details.vote_average.toFixed(1)
          : "Unknown",

      plot:
        details.overview ||
        selected.overview ||
        "No plot available",

      poster,

      backdrop,

      tmdbId:
        details.id ||
        selected.id,

      trailerKey:
        details.videos?.results?.find(
          (video) =>
            video.site === "YouTube" &&
            video.type === "Trailer"
        )?.key || null,

      tmdbVerified: true,
    };
  } catch (error) {
    console.error(
      "❌ TMDb Error:",
      error.message
    );

    return {
      success: false,
      reason: "NETWORK_ERROR",
    };
  }
}

// ==========================================
// SEARCH MOVIES + TV
// ==========================================

async function searchMovies(query) {
  if (!API_KEY) {
    throw new Error(
      "TMDB_API_KEY is missing."
    );
  }

  const searchUrl =
    `${BASE_URL}/search/multi` +
    `?api_key=${API_KEY}` +
    `&query=${encodeURIComponent(query)}` +
    `&language=en-US`;

  const data = await tmdbFetch(searchUrl);

  return (data.results || [])
    .filter(
      (item) =>
        item.media_type === "movie" ||
        item.media_type === "tv"
    )
    .slice(0, 20)
    .map((item) => {
      const type = item.media_type;

      return {
        id: item.id,

        type:
          type === "tv"
            ? "series"
            : "movie",

        title:
          getTitle(item, type),

        year:
          getYear(item, type),

        overview:
          item.overview ||
          "No description available.",

        poster:
          getImage(item.poster_path, "w500"),

        rating:
          typeof item.vote_average === "number"
            ? item.vote_average.toFixed(1)
            : "Unknown",
      };
    });
}

// ==========================================
// GET DETAILS BY TMDb ID
// ==========================================

async function getDetailsById(id, type) {
  if (!API_KEY) {
    throw new Error(
      "TMDB_API_KEY is missing."
    );
  }

  const tmdbType = getMediaType(type);
  const isTV = tmdbType === "tv";

  const detailsUrl =
    `${BASE_URL}/${tmdbType}/${id}` +
    `?api_key=${API_KEY}` +
    `&language=en-US` +
    `&append_to_response=credits,videos`;

  const details = await tmdbFetch(detailsUrl);

  return {
    id: details.id,

    type:
      isTV ? "series" : "movie",

    title:
      getTitle(details, tmdbType),

    year:
      getYear(details, tmdbType) ||
      "Unknown",

    rating:
      typeof details.vote_average === "number"
        ? details.vote_average.toFixed(1)
        : "Unknown",

    runtime: isTV
      ? details.episode_run_time?.[0]
        ? `${details.episode_run_time[0]} minutes per episode`
        : "Unknown"
      : details.runtime
      ? `${details.runtime} minutes`
      : "Unknown",

    genre:
      details.genres
        ?.map((genre) => genre.name)
        .filter(Boolean)
        .join(", ") || "Unknown",

    director:
      getDirector(details, tmdbType),

    plot:
      details.overview ||
      "No description available.",

    poster:
      getImage(details.poster_path, "w780"),

    backdrop:
      getImage(details.backdrop_path, "original"),

    trailerKey:
      details.videos?.results?.find(
        (video) =>
          video.site === "YouTube" &&
          video.type === "Trailer"
      )?.key || null,
  };
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getMovieDetails,
  searchMovies,

  // Keep both names available
  // in case another backend file uses searchMovie.
  searchMovie: searchMovies,

  getDetailsById,
};