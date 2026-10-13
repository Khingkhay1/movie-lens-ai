const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const os = require("os");

function createTempFolder(prefix = "movielens") {
  const requestId = `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}`;

  const outputFolder = path.join(
    os.tmpdir(),
    requestId
  );

  fs.mkdirSync(outputFolder, {
    recursive: true,
  });

  return outputFolder;
}

/*
 * Extract frames from a video.
 *
 * This is kept as a FALLBACK.
 *
 * MovieLens will now try to analyze the actual
 * video with Gemini first.
 */
const extractFrames = (videoPath) => {
  return new Promise((resolve, reject) => {
    const outputFolder =
      createTempFolder("movielens-frames");

    console.log(
      "📁 Temporary frame folder:"
    );
    console.log(outputFolder);

    ffmpeg(videoPath)
      .output(
        path.join(
          outputFolder,
          "frame-%03d.jpg"
        )
      )
      .outputOptions(
        "-vf",
        "fps=1"
      )
      .on("end", () => {
        console.log(
          "✅ Frames extracted successfully!"
        );

        resolve(outputFolder);
      })
      .on("error", (err) => {
        console.error(
          "❌ Error extracting frames:",
          err
        );

        reject(err);
      })
      .run();
  });
};

/*
 * Get the duration of a video.
 */
function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(
      videoPath,
      (err, metadata) => {
        if (err) {
          return reject(err);
        }

        const duration =
          metadata?.format?.duration;

        if (
          typeof duration !== "number" ||
          !Number.isFinite(duration)
        ) {
          return reject(
            new Error(
              "Could not determine video duration."
            )
          );
        }

        resolve(duration);
      }
    );
  });
}

/*
 * Trim a video to a maximum duration.
 *
 * The output is written to a separate temporary
 * file so the original source remains untouched.
 */
function trimVideo(
  inputPath,
  durationSeconds = 60
) {
  return new Promise((resolve, reject) => {
    if (!inputPath) {
      return reject(
        new Error(
          "No video was provided for trimming."
        )
      );
    }

    if (
      !Number.isFinite(
        durationSeconds
      ) ||
      durationSeconds <= 0
    ) {
      return reject(
        new Error(
          "Invalid video trim duration."
        )
      );
    }

    const outputFolder =
      createTempFolder(
        "movielens-trim"
      );

    const outputPath =
      path.join(
        outputFolder,
        "trimmed-video.mp4"
      );

    console.log(
      "✂️ Trimming video:"
    );
    console.log(
      `📥 Input: ${inputPath}`
    );
    console.log(
      `📤 Output: ${outputPath}`
    );
    console.log(
      `⏱️ Maximum duration: ${durationSeconds}s`
    );

    ffmpeg(inputPath)
      .outputOptions([
        "-t",
        String(durationSeconds),
        "-movflags",
        "+faststart",
      ])
      .videoCodec("libx264")
      .audioCodec("aac")
      .format("mp4")
      .on("start", (commandLine) => {
        console.log(
          "🎬 FFmpeg trim started:"
        );
        console.log(commandLine);
      })
      .on("end", () => {
        console.log(
          "✅ Video trimmed successfully."
        );

        resolve(outputPath);
      })
      .on("error", (error) => {
        console.error(
          "❌ Video trimming failed:",
          error.message
        );

        try {
          if (
            fs.existsSync(
              outputPath
            )
          ) {
            fs.unlinkSync(
              outputPath
            );
          }

          if (
            fs.existsSync(
              outputFolder
            )
          ) {
            fs.rmSync(
              outputFolder,
              {
                recursive: true,
                force: true,
              }
            );
          }
        } catch (cleanupError) {
          console.error(
            "⚠️ Could not clean failed trim output:",
            cleanupError.message
          );
        }

        reject(error);
      })
      .save(outputPath);
  });
}

/*
 * Delete a temporary file safely.
 */
function deleteFile(filePath) {
  try {
    if (
      filePath &&
      fs.existsSync(filePath)
    ) {
      fs.unlinkSync(filePath);

      console.log(
        "🗑️ Temporary video deleted."
      );
    }
  } catch (error) {
    console.error(
      "⚠️ Could not delete temporary file:",
      error.message
    );
  }
}

/*
 * Delete a temporary folder and everything
 * inside it.
 */
function deleteFolder(folderPath) {
  try {
    if (
      folderPath &&
      fs.existsSync(folderPath)
    ) {
      fs.rmSync(folderPath, {
        recursive: true,
        force: true,
      });

      console.log(
        "🗑️ Temporary folder deleted."
      );
    }
  } catch (error) {
    console.error(
      "⚠️ Could not delete temporary folder:",
      error.message
    );
  }
}

module.exports = {
  extractFrames,
  getVideoDuration,
  trimVideo,
  deleteFile,
  deleteFolder,
};