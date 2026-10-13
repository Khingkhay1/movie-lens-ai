const fs = require("fs");
const path = require("path");

function getFrames(frameFolder) {
  if (!frameFolder || !fs.existsSync(frameFolder)) {
    return [];
  }

  const frames = fs
    .readdirSync(frameFolder)
    .filter((file) =>
      file.toLowerCase().endsWith(".jpg")
    )
    .sort((a, b) => {
      return a.localeCompare(b, undefined, {
        numeric: true,
      });
    });

  return frames.map((frame) =>
    path.join(frameFolder, frame)
  );
}

module.exports = {
  getFrames,
};