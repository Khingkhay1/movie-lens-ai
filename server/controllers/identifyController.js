const fs = require("fs");

const supabaseAdmin = require("../supabaseAdmin");

const {
  processIdentificationJob,
  createIdentificationJob,
  updateJobAsFailed,
} = require("../services/identificationService");

const {
  resolveVideoSource,
} = require("../services/linkService");

function getBearerToken(req) {
  const authorizationHeader =
    req.headers.authorization;

  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] =
    authorizationHeader.split(" ");

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

async function getAuthenticatedUser(req) {
  const accessToken =
    getBearerToken(req);

  if (!accessToken) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (userError || !user) {
    console.error(
      "❌ Authentication failed:",
      userError?.message
    );

    return null;
  }

  return user;
}

async function deleteTemporaryFile(
  filePath
) {
  if (!filePath) {
    return;
  }

  try {
    await fs.promises.unlink(
      filePath
    );

    console.log(
      "🗑️ Temporary linked video deleted."
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "⚠️ Could not delete temporary linked video:",
        error.message
      );
    }
  }
}

async function identifyMovie(
  req,
  res
) {
  try {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Your session is invalid or has expired. Please sign in again.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "No video uploaded.",
      });
    }

    const result =
      await processIdentificationJob({
        userId: user.id,
        sourceType: "upload",
        sourcePlatform: "web",
        sourceUrl: null,
        file: req.file,
      });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "❌ Identification controller error:",
      error
    );

    return res.status(
      error.statusCode || error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to identify movie.",
    });
  }
}

async function identifyMovieFromLink(
  req,
  res
) {
  let downloadedFile = null;
  let jobId = null;
  let processingStarted = false;

  try {
    const user =
      await getAuthenticatedUser(
        req
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Your session is invalid or has expired. Please sign in again.",
      });
    }

    const url =
      String(
        req.body?.url || ""
      ).trim();

    if (!url) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a video URL.",
      });
    }

    console.log(
      "\n=============================="
    );

    console.log(
      "🔗 LINK IDENTIFICATION STARTED"
    );

    console.log(
      "=============================="
    );

    console.log(
      "👤 User:",
      user.id
    );

    console.log(
      "🔗 Source URL:",
      url
    );

    let downloaded;

    try {
      downloaded =
        await resolveVideoSource(
          url
        );

      /*
       * linkService returns the downloaded file
       * metadata at the top level:
       *
       * {
       *   filePath,
       *   fileSize,
       *   sourceType,
       *   sourcePlatform,
       *   contentType
       * }
       *
       * processIdentificationJob(), however, expects
       * a Multer-style file object.
       *
       * Build that object here so the existing
       * identification pipeline can be reused without
       * changing the upload flow.
       */
      if (
        !downloaded?.filePath
      ) {
        const error =
          new Error(
            "The video was extracted, but no local video file was returned."
          );

        error.code =
          "VIDEO_FILE_MISSING";

        throw error;
      }

      downloadedFile = {
        path: downloaded.filePath,
        size:
          downloaded.fileSize || 0,
        mimetype:
          downloaded.contentType ||
          "video/mp4",
        originalname:
          downloaded.filePath
            .split(/[\\/]/)
            .pop(),
        filename:
          downloaded.filePath
            .split(/[\\/]/)
            .pop(),
      };

      console.log(
        "📥 Linked video ready:"
      );

      console.log(
        downloadedFile.path
      );

      console.log(
        `📦 Video size: ${downloadedFile.size} bytes`
      );

      console.log(
        "🌐 Source platform:",
        downloaded.sourcePlatform
      );
    } catch (error) {
      console.error(
        "❌ Link resolution failed:",
        error
      );

      return res.status(
        error.statusCode || error.status || 400
      ).json({
        success: false,
        code:
          error.code ||
          "LINK_RESOLUTION_FAILED",
        message:
          error.message ||
          "The video link could not be processed.",
      });
    }

    try {
      const job =
        await createIdentificationJob({
          userId: user.id,
          sourceType: "link",
          sourcePlatform:
            downloaded.sourcePlatform,
          sourceUrl: url,
        });

      jobId = job.id;

      console.log(
        "🆔 Link identification job:",
        jobId
      );

      const result =
        await processIdentificationJob({
          userId: user.id,
          sourceType: "link",
          sourcePlatform:
            downloaded.sourcePlatform,
          sourceUrl: url,
          file: downloadedFile,
          jobId,
        });

      processingStarted = true;

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        "❌ Link identification processing failed:",
        error
      );

      if (jobId) {
        await updateJobAsFailed(
          jobId,
          "IDENTIFICATION_FAILED",
          error.message ||
            "Link identification failed."
        );
      }

      throw error;
    }
  } catch (error) {
    console.error(
      "❌ Link identification controller error:",
      error
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to identify movie from link.",
    });
  } finally {
    /*
     * processIdentificationJob() owns cleanup after
     * it successfully receives the downloaded file.
     *
     * If processing never started, the controller
     * remains responsible for removing the temporary
     * extracted video.
     */
    if (
      downloadedFile?.path &&
      !processingStarted
    ) {
      await deleteTemporaryFile(
        downloadedFile.path
      );
    }

    console.log(
      "=============================="
    );

    console.log(
      "🔗 LINK IDENTIFICATION ENDED"
    );

    console.log(
      "==============================\n"
    );
  }
}

module.exports = {
  identifyMovie,
  identifyMovieFromLink,
};