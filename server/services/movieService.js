const geminiService = require("./geminiService");
const tmdbService = require("./tmdbService");

async function identifyMovie(file) {
  if (!file || !file.path) {
    return {
      movie: "No video found",
      confidence: 0,
      alternatives: [],
      evidence: [],
      characters: [],
      actors: [],
      dialogue: [],
      scene_description: "",
      location: "",
      distinctive_details: [],
      filename: file?.filename || "",
    };
  }

  console.log("🎥 Sending actual video to Gemini...");

  const geminiStart = Date.now();

  const geminiResult =
    await geminiService.analyzeVideo(
      file.path,
      file.mimetype
    );

  console.log(
    `🤖 Gemini video analysis finished in ${
      Date.now() - geminiStart
    } ms`
  );

  console.log("Gemini video result:");

  console.log(
    JSON.stringify(
      geminiResult,
      null,
      2
    )
  );

  // ==========================================
  // GEMINI COULD NOT IDENTIFY THE CONTENT
  // ==========================================

  if (
    !geminiResult ||
    !geminiResult.title ||
    geminiResult.title === "UNKNOWN"
  ) {
    return {
      movie: "Movie could not be identified",
      confidence: 0,

      alternatives:
        geminiResult?.alternatives || [],

      evidence:
        geminiResult?.evidence || [],

      characters:
        geminiResult?.characters || [],

      actors:
        geminiResult?.actors || [],

      dialogue:
        geminiResult?.dialogue || [],

      scene_description:
        geminiResult?.scene_description || "",

      location:
        geminiResult?.location || "",

      distinctive_details:
        geminiResult?.distinctive_details || [],

      filename:
        file.filename,
    };
  }

  // ==========================================
  // DETERMINE CONTENT TYPE
  // ==========================================

  const geminiType =
    geminiResult.type === "series" ||
    geminiResult.type === "tv"
      ? "series"
      : "movie";

  console.log(
    `🎭 Gemini identified content type: ${geminiType}`
  );

  // ==========================================
  // BUILD CANDIDATE LIST
  // ==========================================

  const candidates = [
    {
      title: geminiResult.title,

      year:
        geminiResult.year || 0,

      confidence:
        geminiResult.confidence || 0,

      type:
        geminiType,
    },

    ...(geminiResult.alternatives || []).map(
      (alternative) => ({
        ...alternative,

        type:
          alternative.type ||
          geminiType,
      })
    ),
  ];

  console.log(
    "🎬 Gemini candidates:"
  );

  console.log(
    JSON.stringify(
      candidates,
      null,
      2
    )
  );

  // ==========================================
  // VERIFY EACH CANDIDATE WITH TMDb
  // ==========================================

  for (const candidate of candidates) {
    if (
      !candidate.title ||
      candidate.title === "UNKNOWN"
    ) {
      continue;
    }

    console.log(
      `🎬 Verifying candidate through TMDb: ${
        candidate.title
      }${
        candidate.year
          ? ` (${candidate.year})`
          : ""
      } [${
        candidate.type
      }]`
    );

    const tmdbStart =
      Date.now();

    try {
      const tmdbResult =
        await tmdbService.getMovieDetails(
          candidate.title,
          candidate.year || 0,
          candidate.type
        );

      console.log(
        `🎬 TMDb finished in ${
          Date.now() - tmdbStart
        } ms`
      );

      // ========================================
      // TMDb SUCCESS
      // ========================================

      if (tmdbResult?.success) {
        console.log(
          `✅ Movie verified through Gemini + TMDb: ${tmdbResult.movie}`
        );

        return {
          ...tmdbResult,

          confidence:
            candidate.confidence || 0,

          alternatives:
            geminiResult.alternatives || [],

          evidence:
            geminiResult.evidence || [],

          characters:
            geminiResult.characters || [],

          actors:
            geminiResult.actors || [],

          dialogue:
            geminiResult.dialogue || [],

          scene_description:
            geminiResult.scene_description || "",

          location:
            geminiResult.location || "",

          distinctive_details:
            geminiResult.distinctive_details || "",

          filename:
            file.filename,
        };
      }

      // ========================================
      // TMDb NETWORK FAILURE
      // ========================================

      if (
        tmdbResult?.reason ===
        "NETWORK_ERROR"
      ) {
        console.log(
          "⚠️ TMDb is temporarily unavailable."
        );

        console.log(
          "✅ Keeping Gemini identification."
        );

        return {
          movie:
            candidate.title,

          type:
            candidate.type,

          year:
            candidate.year ||
            "Unknown",

          genre: "Unknown",

          runtime: "Unknown",

          director: "Unknown",

          rating: "Unknown",

          plot:
            "TMDb metadata temporarily unavailable.",

          poster: null,

          confidence:
            candidate.confidence || 0,

          tmdbVerified: false,

          tmdbUnavailable: true,

          alternatives:
            geminiResult.alternatives || [],

          evidence:
            geminiResult.evidence || [],

          characters:
            geminiResult.characters || [],

          actors:
            geminiResult.actors || [],

          dialogue:
            geminiResult.dialogue || [],

          scene_description:
            geminiResult.scene_description || "",

          location:
            geminiResult.location || "",

          distinctive_details:
            geminiResult.distinctive_details || [],

          filename:
            file.filename,
        };
      }

      console.log(
        `❌ TMDb could not verify: ${
          candidate.title
        }${
          candidate.year
            ? ` (${candidate.year})`
            : ""
        }`
      );

    } catch (error) {
      console.error(
        `❌ TMDb error for ${
          candidate.title
        }:`,
        error.message
      );
    }
  }

  // ==========================================
  // NONE OF THE CANDIDATES WERE VERIFIED
  // ==========================================

  console.log(
    "⚠️ None of Gemini's candidates could be verified by TMDb."
  );

  return {
    movie:
      geminiResult.title,

    type:
      geminiType,

    year:
      geminiResult.year ||
      "Unknown",

    confidence:
      geminiResult.confidence || 0,

    tmdbVerified:
      false,

    alternatives:
      geminiResult.alternatives || [],

    evidence:
      geminiResult.evidence || [],

    characters:
      geminiResult.characters || [],

    actors:
      geminiResult.actors || [],

    dialogue:
      geminiResult.dialogue || [],

    scene_description:
      geminiResult.scene_description || "",

    location:
      geminiResult.location || "",

    distinctive_details:
      geminiResult.distinctive_details || [],

    filename:
      file.filename,
  };
}

module.exports = {
  identifyMovie,
};
