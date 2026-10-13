const supabaseAdmin = require("../supabaseAdmin");

const movieService = require("./movieService");

const {
  deleteFile,
  getVideoDuration,
  trimVideo,
} = require("./videoService");

const MAX_VIDEO_DURATION_SECONDS = 60;

async function updateJobAsFailed(
  jobId,
  errorCode,
  errorMessage
) {
  if (!jobId) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("identification_jobs")
    .update({
      status: "failed",
      error_code: errorCode,
      error_message: errorMessage,
      completed_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    console.error(
      "⚠️ Could not mark identification job as failed:",
      error.message
    );
  }
}

async function createIdentificationJob({
  userId,
  sourceType,
  sourcePlatform = null,
  sourceUrl = null,
}) {
  const {
    data: job,
    error: jobError,
  } = await supabaseAdmin
    .from("identification_jobs")
    .insert({
      user_id: userId,
      source_type: sourceType,
      source_platform:
        sourcePlatform,
      source_url: sourceUrl,
      status: "queued",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error(
      "❌ Could not create identification job:",
      jobError?.message
    );

    throw new Error(
      "We could not start the identification process."
    );
  }

  return job;
}

async function markJobProcessing(
  jobId
) {
  const {
    error: processingError,
  } = await supabaseAdmin
    .from("identification_jobs")
    .update({
      status: "processing",
      started_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", jobId);

  if (processingError) {
    console.error(
      "❌ Could not start identification job:",
      processingError.message
    );

    throw new Error(
      "We could not start the identification process."
    );
  }
}

async function saveIdentificationHistory(
  userId,
  movie
) {
  const {
    data: history,
    error: historyError,
  } = await supabaseAdmin
    .from("identification_history")
    .insert({
      user_id: userId,
      tmdb_id:
        movie.tmdbId || null,
      title:
        movie.movie ||
        "Unknown title",
      media_type:
        movie.type ||
        "movie",
      year: movie.year
        ? String(movie.year)
        : null,
      confidence:
        movie.confidence !==
        undefined
          ? movie.confidence
          : null,
      poster:
        movie.poster ||
        null,
    })
    .select("id")
    .single();

  if (historyError || !history) {
    console.error(
      "❌ Could not save identification history:",
      historyError?.message
    );

    throw new Error(
      "The movie was identified, but we could not save the result."
    );
  }

  return history;
}

async function completeIdentificationJob(
  jobId,
  historyId
) {
  const completedAt =
    new Date().toISOString();

  const {
    error: completionError,
  } = await supabaseAdmin
    .from("identification_jobs")
    .update({
      status: "completed",
      result_history_id:
        historyId,
      completed_at:
        completedAt,
      updated_at:
        completedAt,
    })
    .eq("id", jobId);

  if (completionError) {
    console.error(
      "❌ Could not mark identification job as completed:",
      completionError.message
    );

    throw new Error(
      "The movie was identified, but we could not finalize the identification."
    );
  }
}

async function processIdentificationJob({
  userId,
  sourceType,
  sourcePlatform = null,
  sourceUrl = null,
  file,
  jobId = null,
}) {
  const startTime =
    Date.now();

  let identificationJobId =
    jobId;

  let failureRecorded =
    false;

  let processingFile = file;

  let trimmedFilePath =
    null;

  try {
    if (!userId) {
      throw new Error(
        "Authentication is required to identify a movie."
      );
    }

    if (!file || !file.path) {
      throw new Error(
        "No video was provided for identification."
      );
    }

    console.log(
      "\n=============================="
    );

    console.log(
      "🎬 MOVIE IDENTIFICATION STARTED"
    );

    console.log(
      "=============================="
    );

    console.log(
      "👤 User:",
      userId
    );

    console.log(
      "📥 Source:",
      sourceType
    );

    console.log(
      "🌐 Platform:",
      sourcePlatform ||
        "none"
    );

    if (sourceUrl) {
      console.log(
        "🔗 Source URL:",
        sourceUrl
      );
    }

    console.log(
      "📹 Video:",
      file.originalname ||
        file.filename
    );

    console.log(
      "📁 Video path:",
      file.path
    );

    if (!identificationJobId) {
      const job =
        await createIdentificationJob({
          userId,
          sourceType,
          sourcePlatform,
          sourceUrl,
        });

      identificationJobId =
        job.id;

      console.log(
        "🆔 Identification job:",
        identificationJobId
      );
    } else {
      console.log(
        "🆔 Existing identification job:",
        identificationJobId
      );
    }

    await markJobProcessing(
      identificationJobId
    );

    let duration;

    try {
      duration =
        await getVideoDuration(
          processingFile.path
        );

      console.log(
        `⏱️ Video duration: ${duration} seconds`
      );
    } catch (error) {
      console.error(
        "❌ Could not read video duration:",
        error.message
      );

      await updateJobAsFailed(
        identificationJobId,
        "INVALID_VIDEO",
        "Could not read the uploaded video."
      );

      failureRecorded =
        true;

      const responseError =
        new Error(
          "We could not read that video. Please choose a valid video file."
        );

      responseError.statusCode =
        400;

      throw responseError;
    }

    /*
     * Uploaded videos keep the original
     * 60-second restriction.
     *
     * Linked videos are normalized to 60 seconds
     * instead of being rejected.
     */
    if (
      duration >
      MAX_VIDEO_DURATION_SECONDS
    ) {
      if (sourceType !== "link") {
        console.log(
          `⚠️ Video rejected: ${duration}s exceeds ${MAX_VIDEO_DURATION_SECONDS}s limit.`
        );

        await updateJobAsFailed(
          identificationJobId,
          "VIDEO_TOO_LONG",
          "The uploaded video exceeds the 60-second limit."
        );

        failureRecorded =
          true;

        const responseError =
          new Error(
            "Please upload a clip that is 60 seconds or shorter."
          );

        responseError.statusCode =
          400;

        throw responseError;
      }

      console.log(
        `✂️ Linked video is ${duration}s. Trimming to ${MAX_VIDEO_DURATION_SECONDS}s...`
      );

      try {
        trimmedFilePath =
          await trimVideo(
            processingFile.path,
            MAX_VIDEO_DURATION_SECONDS
          );

        processingFile = {
          ...processingFile,
          path: trimmedFilePath,
          originalname:
            "linked-video-trimmed.mp4",
          filename:
            "linked-video-trimmed.mp4",
          mimetype:
            "video/mp4",
        };

        const trimmedDuration =
          await getVideoDuration(
            trimmedFilePath
          );

        console.log(
          `✂️ Trimmed video duration: ${trimmedDuration} seconds`
        );
      } catch (error) {
        console.error(
          "❌ Could not trim linked video:",
          error.message
        );

        await updateJobAsFailed(
          identificationJobId,
          "VIDEO_TRIM_FAILED",
          "The linked video could not be prepared for identification."
        );

        failureRecorded =
          true;

        const responseError =
          new Error(
            "We could not prepare that linked video for identification."
          );

        responseError.statusCode =
          400;

        throw responseError;
      }
    }

    const identificationStart =
      Date.now();

    console.log(
      "🤖 Starting direct video identification..."
    );

    const movie =
      await movieService.identifyMovie(
        processingFile
      );

    console.log(
      `✅ Movie identification finished in ${
        Date.now() -
        identificationStart
      } ms`
    );

    console.log(
      "💾 Saving identification history..."
    );

    let history;

    try {
      history =
        await saveIdentificationHistory(
          userId,
          movie
        );
    } catch (error) {
      await updateJobAsFailed(
        identificationJobId,
        "HISTORY_SAVE_FAILED",
        error.message
      );

      failureRecorded =
        true;

      error.statusCode =
        500;

      throw error;
    }

    console.log(
      "📚 History record:",
      history.id
    );

    try {
      await completeIdentificationJob(
        identificationJobId,
        history.id
      );
    } catch (error) {
      await updateJobAsFailed(
        identificationJobId,
        "JOB_COMPLETION_FAILED",
        error.message
      );

      failureRecorded =
        true;

      error.statusCode =
        500;

      throw error;
    }

    console.log(
      "📤 Identification completed."
    );

    console.log(
      `⏱️ Total identification time: ${
        Date.now() -
        startTime
      } ms`
    );

    return {
      jobId:
        identificationJobId,
      ...movie,
    };
  } catch (error) {
    console.error(
      "❌ Identification Error:",
      error
    );

    if (
      identificationJobId &&
      !failureRecorded
    ) {
      await updateJobAsFailed(
        identificationJobId,
        "IDENTIFICATION_FAILED",
        error.message ||
          "Movie identification failed."
      );
    }

    throw error;
  } finally {
    /*
     * Delete the processed file.
     *
     * For linked videos, the original downloaded
     * file and the trimmed file are separate, so
     * both must be cleaned up.
     */
    if (
      trimmedFilePath &&
      trimmedFilePath !== file?.path
    ) {
      deleteFile(
        trimmedFilePath
      );
    }

    if (file?.path) {
      deleteFile(
        file.path
      );
    }

    console.log(
      "=============================="
    );

    console.log(
      "🎬 MOVIE IDENTIFICATION ENDED"
    );

    console.log(
      "==============================\n"
    );
  }
}

module.exports = {
  processIdentificationJob,
  createIdentificationJob,
  updateJobAsFailed,
};