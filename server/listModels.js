require("dotenv").config();
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function main() {
  const image = fs.readFileSync("./frames/frame-001.jpg", {
    encoding: "base64",
  });

  const response = await ai.models.generateContent({
    model: "models/gemini-3.5-flash",
    contents: [
      {
        text: "Return only what you see in this image.",
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      },
    ],
  });

  console.log(response.text);
}

main().catch(console.error);