require("dotenv").config();

const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const files = [
  "frame-001.jpg",
  "frame-006.jpg",
  "frame-011.jpg",
  "frame-016.jpg",
];

const parts = [
  {
    text: `
You are an expert movie identification AI.

Analyze ALL four screenshots together.

Identify the movie as accurately as possible using:
- actors and faces
- locations
- costumes
- scenery
- cinematography
- subtitles
- objects
- visible text
- visual continuity

Return ONLY valid JSON in exactly this format:

{
  "title": "",
  "confidence": 0,
  "alternatives": []
}

If you genuinely cannot identify the movie, use:
"UNKNOWN"

Do not include markdown.
Do not include explanations outside the JSON.
`,
  },
];

for (const file of files) {
  const data = fs
    .readFileSync("./frames/" + file)
    .toString("base64");

  parts.push({
    inlineData: {
      mimeType: "image/jpeg",
      data,
    },
  });
}

console.log("Sending 4 real MovieLens frames to Gemini...");

ai.models
  .generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts,
      },
    ],
  })
  .then((response) => {
    console.log("\n===== GEMINI RAW RESPONSE =====");
    console.log(response.text);
  })
  .catch((error) => {
    console.error("\n===== GEMINI ERROR =====");
    console.error(error);
  });