const fs = require("fs");

const {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
  createPartFromBase64,
} = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const INLINE_VIDEO_MAX_BYTES = 18 * 1024 * 1024;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const status =
    error?.status ||
    error?.code ||
    error?.error?.code;

  const message =
    error?.message ||
    error?.error?.message ||
    "";

  return (
    status === 503 ||
    status === 429 ||
    message.includes("UNAVAILABLE") ||
    message.includes("high demand") ||
    message.includes("overloaded")
  );
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

async function generateWithRetry(
  contents,
  maxRetries = 3
) {
  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt++
  ) {
    try {
      console.log(
        `🤖 Gemini video analysis attempt ${attempt}/${maxRetries}...`
      );

      const analysisStart = Date.now();

      const response =
        await ai.models.generateContent({
          model: "gemini-3.5-flash",

          config: {
            temperature: 0.1,
            topP: 0.8,
          },

          contents,
        });

      console.log(
        `⚡ Gemini analysis request finished in ${
          Date.now() - analysisStart
        } ms`
      );

      return response;
    } catch (error) {
      console.error(
        `❌ Gemini attempt ${attempt} failed:`,
        error.message
      );

      if (
        !isRetryableError(error) ||
        attempt === maxRetries
      ) {
        throw error;
      }

      const delay =
        5000 * Math.pow(2, attempt - 1);

      console.log(
        `⏳ Gemini temporarily unavailable. Retrying in ${
          delay / 1000
        } seconds...`
      );

      await sleep(delay);
    }
  }

  throw new Error(
    "Gemini video analysis failed."
  );
}

function createIdentificationPrompt() {
  return `
You are the PRIMARY MOVIE IDENTIFICATION ENGINE for MovieLens AI.

Your task is NOT to identify what a scene LOOKS LIKE.

Your task is to identify the EXACT movie or TV series that the
UPLOADED VIDEO CLIP actually came from.

The video itself is the primary evidence.

Analyze the ENTIRE uploaded video as one continuous sequence.

==================================================
CRITICAL WARNING
==================================================

VISUAL SIMILARITY IS NOT ENOUGH.

Many movies contain:

- dinosaurs
- car chases
- gunfights
- forests
- rivers
- explosions
- schools
- hospitals
- aliens
- historical locations
- similar-looking actors

A scene resembling a famous movie does NOT prove that the clip
came from that movie.

For example:

A T-Rex attacking people does NOT automatically mean Jurassic Park.

A prehistoric environment does NOT automatically mean
Jurassic Park, Jurassic World, Land of the Lost, or La Brea.

You MUST determine whether the ACTUAL PEOPLE, ACTUAL SCENE,
ACTUAL EVENTS, and ACTUAL FILMING STYLE belong to the proposed title.

==================================================
STEP 1 — UNDERSTAND THE VIDEO
==================================================

Before selecting a title, analyze:

1. WHO is actually visible?
2. WHAT exactly happens from the beginning of the clip
   to the end?
3. WHERE does the scene take place?
4. WHAT objects, vehicles, costumes, props or technology
   are visible?
5. WHAT dialogue is actually spoken?
6. Are there recognizable actors?
7. Are there recognizable characters?
8. Are there distinctive visual effects?
9. Are there subtitles, signs, logos or text?
10. What sequence of events makes this scene distinctive?

==================================================
STEP 2 — IDENTIFY POSSIBLE CANDIDATES
==================================================

Generate several possible titles internally.

Do NOT immediately commit to the first title that comes to mind.

For every strong candidate, ask:

- Does the actual scene exist in this movie/series?
- Do the characters match?
- Do the actors match?
- Does the setting match?
- Does the sequence of events match?
- Does the creature/effect match?
- Does the dialogue match?
- Does the year make sense?
- Does the visual style match?

==================================================
STEP 3 — DISTINGUISH SIMILAR MOVIES
==================================================

This is extremely important.

When multiple movies contain similar scenes, explicitly
distinguish between them.

For dinosaur scenes, for example, consider whether the footage
could instead belong to:

- Jurassic Park
- Jurassic World
- The Lost World: Jurassic Park
- Jurassic Park III
- Land of the Lost
- La Brea
- King Kong
- other dinosaur/prehistoric productions

Do NOT select one simply because it contains the same type
of dinosaur.

Identify the ACTUAL production.

==================================================
STEP 4 — CHARACTER AND ACTOR VERIFICATION
==================================================

If you identify an actor:

Only claim the actor if the visual evidence reasonably supports it.

If you identify a character:

Only claim the character if the character is genuinely supported.

Never invent character names simply because they would fit
the proposed movie.

If the visible people do not match the supposed movie's cast,
reduce confidence or return UNKNOWN.

==================================================
STEP 5 — SCENE-SPECIFIC VERIFICATION
==================================================

Ask yourself:

"Is this an actual recognizable sequence from this production?"

Not:

"Does this look like something from this production?"

There is a major difference.

A generic T-Rex chase is weak evidence.

A specific sequence of events, distinctive characters,
recognizable actors, dialogue and production details is strong evidence.

==================================================
STEP 6 — CONFIDENCE
==================================================

Confidence MUST reflect the quality of the evidence.

100 confidence is allowed ONLY when the identification is
extremely well supported by multiple independent clues.

Do NOT give 100 simply because one scene resembles a known movie.

Use approximately:

90-100:
Very strong identification with multiple independent clues.

75-89:
Strong identification but one or more uncertainties remain.

50-74:
Plausible identification with meaningful uncertainty.

30-49:
Weak identification.

0-29:
Very uncertain.

If the evidence is insufficient to distinguish between
multiple plausible titles, return:

"UNKNOWN"

instead of forcing an answer.

==================================================
IMPORTANT ANTI-HALLUCINATION RULES
==================================================

Do NOT invent:

- dialogue
- actors
- characters
- locations
- props
- scenes
- production details
- movie titles

Do NOT use popularity as evidence.

Do NOT assume the most famous movie containing a particular
type of scene is the correct movie.

Do NOT assume that a dinosaur scene means Jurassic Park.

Do NOT assume that a prehistoric scene means Land of the Lost.

Do NOT assume that an actor resembles a known actor and therefore
claim that actor.

If you cannot reliably distinguish the production, return UNKNOWN.

==================================================
MOVIE VS SERIES
==================================================

Determine whether the source is:

- movie
- TV series
- streaming series

Use:

"movie"

for a film.

Use:

"series"

for television or streaming series.

==================================================
FINAL INTERNAL CHECK
==================================================

Before producing the final answer, ask:

1. What is my strongest candidate?
2. What are the two strongest alternatives?
3. What evidence supports the strongest candidate?
4. What evidence could prove it WRONG?
5. Could this exact sequence belong to another production?
6. Am I choosing this title because of actual evidence,
   or simply because the scene looks similar?
7. If my strongest candidate were removed, what would
   the next candidate be?

Only after this comparison should you produce the answer.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON.

Use EXACTLY this structure:

{
  "title": "Movie or Series Title or UNKNOWN",
  "type": "movie",
  "year": 0,
  "confidence": 0,
  "alternatives": [
    {
      "title": "Alternative Title",
      "type": "movie",
      "year": 0,
      "confidence": 0
    }
  ],
  "characters": [],
  "actors": [],
  "dialogue": [],
  "scene_description": "",
  "location": "",
  "distinctive_details": [],
  "evidence": []
}

Rules:

- title = strongest identification.
- type = "movie" or "series".
- year = original release year if known, otherwise 0.
- confidence = 0 to 100.
- alternatives = maximum 3.
- characters = only characters genuinely supported by the video.
- actors = only actors reasonably identifiable from the video.
- dialogue = only dialogue actually heard.
- scene_description = describe the actual sequence shown.
- location = actual setting.
- distinctive_details = unusual clues from the actual video.
- evidence = 2 to 5 strongest pieces of evidence.
- Never invent evidence.
- Never put explanations outside JSON.
- Never use markdown.
- Never use code fences.
`;
}

async function analyzeInlineVideo(
  videoPath,
  mimeType
) {
  console.log(
    "⚡ Using Gemini inline video path."
  );

  const readStart = Date.now();

  const videoBuffer =
    fs.readFileSync(videoPath);

  console.log(
    `📦 Video loaded into memory in ${
      Date.now() - readStart
    } ms`
  );

  const base64Video =
    videoBuffer.toString("base64");

  console.log(
    `📦 Inline video size: ${
      videoBuffer.length
    } bytes`
  );

  const contents =
    createUserContent([
      createPartFromBase64(
        base64Video,
        mimeType
      ),

      createIdentificationPrompt(),
    ]);

  const response =
    await generateWithRetry(
      contents,
      3
    );

  return response;
}

async function analyzeWithFilesApi(
  videoPath,
  mimeType
) {
  console.log(
    "📤 Uploading actual video to Gemini Files API..."
  );

  const uploadStart = Date.now();

  let videoFile =
    await ai.files.upload({
      file: videoPath,

      config: {
        mimeType,
      },
    });

  console.log(
    `✅ Video uploaded in ${
      Date.now() - uploadStart
    } ms`
  );

  console.log(
    "📄 Gemini file:",
    videoFile.name
  );

  console.log(
    "📄 Gemini URI:",
    videoFile.uri
  );

  console.log(
    "⏳ Waiting for Gemini to process the video..."
  );

  const processingStart =
    Date.now();

  let attempts = 0;

  const maxProcessingChecks = 60;

  while (
    videoFile.state &&
    videoFile.state.toString() !== "ACTIVE"
  ) {
    attempts++;

    if (
      attempts >= maxProcessingChecks
    ) {
      const error = new Error(
        "Gemini video processing timed out."
      );

      error.code =
        "GEMINI_VIDEO_PROCESSING_TIMEOUT";

      throw error;
    }

    const currentState =
      videoFile.state.toString();

    console.log(
      `🎞️ Video processing state: ${currentState}`
    );

    if (
      currentState === "FAILED"
    ) {
      const error = new Error(
        "Gemini failed to process the video."
      );

      error.code =
        "GEMINI_VIDEO_PROCESSING_FAILED";

      throw error;
    }

    await sleep(5000);

    videoFile =
      await ai.files.get({
        name: videoFile.name,
      });
  }

  console.log(
    `✅ Gemini video processing complete in ${
      Date.now() - processingStart
    } ms`
  );

  const contents =
    createUserContent([
      createPartFromUri(
        videoFile.uri,
        videoFile.mimeType
      ),

      createIdentificationPrompt(),
    ]);

  return generateWithRetry(
    contents,
    3
  );
}

async function analyzeVideo(
  videoPath,
  mimeType = "video/mp4"
) {
  if (
    !videoPath ||
    !fs.existsSync(videoPath)
  ) {
    const error = new Error(
      "Video file could not be found."
    );

    error.code =
      "VIDEO_FILE_NOT_FOUND";

    throw error;
  }

  try {
    const totalStart =
      Date.now();

    const fileSize =
      getFileSize(videoPath);

    console.log(
      `📦 Gemini input size: ${fileSize} bytes`
    );

    let response;

    /*
     * Gemini supports inline video input for short,
     * small files. Keep a little headroom below the
     * documented request-size boundary because the
     * request also contains the identification prompt.
     */
    if (
      fileSize > 0 &&
      fileSize <= INLINE_VIDEO_MAX_BYTES
    ) {
      response =
        await analyzeInlineVideo(
          videoPath,
          mimeType
        );
    } else {
      response =
        await analyzeWithFilesApi(
          videoPath,
          mimeType
        );
    }

    let result =
      response.text?.trim() || "";

    if (!result) {
      const error = new Error(
        "Gemini returned an empty response."
      );

      error.code =
        "GEMINI_EMPTY_RESPONSE";

      throw error;
    }

    console.log(
      "Raw Gemini Video Response:"
    );

    console.log(result);

    result = result
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;

    try {
      parsed =
        JSON.parse(result);
    } catch (error) {
      const parseError =
        new Error(
          "Gemini returned an invalid identification response."
        );

      parseError.code =
        "GEMINI_INVALID_JSON";

      parseError.cause =
        error;

      throw parseError;
    }

    console.log(
      "Gemini Video Analysis:"
    );

    console.log(
      JSON.stringify(
        parsed,
        null,
        2
      )
    );

    console.log(
      `⏱️ Total Gemini stage: ${
        Date.now() - totalStart
      } ms`
    );

    return parsed;
  } catch (error) {
    console.error(
      "❌ Gemini Video Error:",
      error
    );

    /*
     * IMPORTANT:
     *
     * Do NOT convert infrastructure/API failures into
     * { title: "UNKNOWN" }.
     *
     * UNKNOWN is a legitimate Gemini identification result.
     * An API failure must propagate to movieService and then
     * to identifyController so the identification job becomes
     * "failed" rather than "completed".
     */
    throw error;
  }
}

module.exports = {
  analyzeVideo,
};