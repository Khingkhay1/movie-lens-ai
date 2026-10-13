const axios = require("axios");
const dns = require("dns").promises;
const fs = require("fs");
const os = require("os");
const path = require("path");
const { URL } = require("url");
const youtubeDl = require("youtube-dl-exec");

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT = 30000;
const YTDLP_TIMEOUT = 180000;

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/mpeg",
  "video/ogg",
]);

const TEMP_DIRECTORY = path.join(os.tmpdir(), "movielens-ai");

function createLinkError(message, code = "LINK_ERROR", status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function isPrivateIp(address) {
  if (!address) {
    return true;
  }

  const normalized = address.toLowerCase();

  if (normalized === "localhost" || normalized === "::1") {
    return true;
  }

  if (
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("127.")
  ) {
    return true;
  }

  const parts = normalized.split(".").map(Number);

  if (
    parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
  ) {
    const [a, b] = parts;

    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }

    if (a === 169 && b === 254) {
      return true;
    }

    if (a === 0) {
      return true;
    }
  }

  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  return false;
}

async function validatePublicUrl(rawUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw createLinkError(
      "Please provide a valid HTTPS URL.",
      "INVALID_URL",
      400
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw createLinkError(
      "Only HTTPS URLs are supported.",
      "HTTPS_REQUIRED",
      400
    );
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw createLinkError(
      "URLs containing credentials are not allowed.",
      "CREDENTIALS_NOT_ALLOWED",
      400
    );
  }

  const hostname = parsedUrl.hostname;

  let addresses;

  try {
    addresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });
  } catch {
    throw createLinkError(
      "The video link could not be reached.",
      "HOST_UNREACHABLE",
      400
    );
  }

  if (!addresses.length) {
    throw createLinkError(
      "The video link could not be reached.",
      "HOST_UNREACHABLE",
      400
    );
  }

  for (const addressInfo of addresses) {
    if (isPrivateIp(addressInfo.address)) {
      throw createLinkError(
        "Private or local network URLs are not allowed.",
        "PRIVATE_URL_BLOCKED",
        403
      );
    }
  }

  return parsedUrl;
}

function getSourcePlatform(rawUrl) {
  const hostname = new URL(rawUrl).hostname.toLowerCase();

  if (
    hostname === "youtube.com" ||
    hostname === "www.youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "youtu.be" ||
    hostname.endsWith(".youtube.com")
  ) {
    return "youtube";
  }

  if (
    hostname === "facebook.com" ||
    hostname === "www.facebook.com" ||
    hostname.endsWith(".facebook.com")
  ) {
    return "facebook";
  }

  if (
    hostname === "instagram.com" ||
    hostname === "www.instagram.com" ||
    hostname.endsWith(".instagram.com")
  ) {
    return "instagram";
  }

  if (
    hostname === "tiktok.com" ||
    hostname === "www.tiktok.com" ||
    hostname.endsWith(".tiktok.com")
  ) {
    return "tiktok";
  }

  if (
    hostname === "x.com" ||
    hostname === "www.x.com" ||
    hostname === "twitter.com" ||
    hostname === "www.twitter.com"
  ) {
    return "x";
  }

  if (
    hostname === "vimeo.com" ||
    hostname === "www.vimeo.com" ||
    hostname.endsWith(".vimeo.com")
  ) {
    return "vimeo";
  }

  return "web";
}

function getFileExtension(contentType) {
  const normalizedType = contentType.split(";")[0].trim().toLowerCase();

  switch (normalizedType) {
    case "video/mp4":
      return ".mp4";

    case "video/webm":
      return ".webm";

    case "video/quicktime":
      return ".mov";

    case "video/x-msvideo":
      return ".avi";

    case "video/x-matroska":
      return ".mkv";

    case "video/mpeg":
      return ".mpeg";

    case "video/ogg":
      return ".ogv";

    default:
      return ".mp4";
  }
}

async function ensureTempDirectory() {
  await fs.promises.mkdir(TEMP_DIRECTORY, {
    recursive: true,
  });
}

async function cleanupFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.promises.rm(filePath, {
      force: true,
    });
  } catch {
    // Cleanup failure should never replace the original error.
  }
}

function createTempBaseName() {
  return path.join(
    TEMP_DIRECTORY,
    `movie-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

async function downloadDirectVideo(rawUrl) {
  const parsedUrl = await validatePublicUrl(rawUrl);

  await ensureTempDirectory();

  let response;

  try {
    response = await axios.get(parsedUrl.toString(), {
      responseType: "stream",
      timeout: REQUEST_TIMEOUT,
      maxRedirects: MAX_REDIRECTS,
      maxContentLength: MAX_FILE_SIZE,
      maxBodyLength: MAX_FILE_SIZE,
      validateStatus: (status) => status >= 200 && status < 300,
      beforeRedirect: async (options) => {
        const redirectUrl = `${options.protocol}//${options.hostname}${options.path}`;

        await validatePublicUrl(redirectUrl);
      },
    });
  } catch (error) {
    throw createLinkError(
      "The video link could not be downloaded.",
      "DOWNLOAD_FAILED",
      400
    );
  }

  const contentType = String(
    response.headers["content-type"] || ""
  ).toLowerCase();

  const normalizedContentType = contentType.split(";")[0].trim();

  if (!ALLOWED_VIDEO_TYPES.has(normalizedContentType)) {
    response.data.destroy();

    throw createLinkError(
      "The URL does not point directly to a supported video file.",
      "NOT_DIRECT_VIDEO",
      415
    );
  }

  const contentLength = Number(response.headers["content-length"] || 0);

  if (contentLength > MAX_FILE_SIZE) {
    response.data.destroy();

    throw createLinkError(
      "The video is larger than the 100 MB limit.",
      "VIDEO_TOO_LARGE",
      413
    );
  }

  const filePath = `${createTempBaseName()}${getFileExtension(
    normalizedContentType
  )}`;

  let downloadedBytes = 0;

  try {
    const writeStream = fs.createWriteStream(filePath);

    response.data.on("data", (chunk) => {
      downloadedBytes += chunk.length;

      if (downloadedBytes > MAX_FILE_SIZE) {
        response.data.destroy(
          createLinkError(
            "The video is larger than the 100 MB limit.",
            "VIDEO_TOO_LARGE",
            413
          )
        );
      }
    });

    await new Promise((resolve, reject) => {
      response.data.on("error", reject);
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);

      response.data.pipe(writeStream);
    });

    if (downloadedBytes === 0) {
      throw createLinkError(
        "The video link returned an empty file.",
        "EMPTY_VIDEO",
        400
      );
    }

    return {
      filePath,
      sourceType: "direct",
      sourcePlatform: getSourcePlatform(rawUrl),
      contentType: normalizedContentType,
      fileSize: downloadedBytes,
    };
  } catch (error) {
    await cleanupFile(filePath);

    if (error?.code === "VIDEO_TOO_LARGE") {
      throw error;
    }

    if (error?.code === "EMPTY_VIDEO") {
      throw error;
    }

    throw createLinkError(
      "The video link could not be downloaded.",
      "DOWNLOAD_FAILED",
      400
    );
  }
}

async function downloadWithYtDlp(rawUrl, sourcePlatform) {
  await validatePublicUrl(rawUrl);
  await ensureTempDirectory();

  const tempBase = createTempBaseName();
  const outputTemplate = `${tempBase}.%(ext)s`;

  try {
    const output = await youtubeDl(
      rawUrl,
      {
        noPlaylist: true,
        noWarnings: true,
        noProgress: true,
        restrictFilenames: true,

        output: outputTemplate,

        /*
         * YouTube JavaScript challenge solving.
         */
        jsRuntimes: "deno",
        remoteComponents: "ejs:npm",

        /*
         * Let yt-dlp select the best available video/audio
         * combination instead of forcing a pre-merged format.
         */
        format: "bv*+ba/b",

        maxFilesize: "100M",

        socketTimeout: 30,

        retries: 2,
        fragmentRetries: 2,

        print: "after_move:filepath",
      },
      {
        /*
         * IMPORTANT:
         * This is the youtube-dl-exec process timeout.
         * It must NOT be inside the yt-dlp options above.
         */
        timeout: YTDLP_TIMEOUT,
      }
    );

    let filePath = null;

    if (typeof output === "string") {
      const lines = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const possiblePath = lines[lines.length - 1];

      if (possiblePath && fs.existsSync(possiblePath)) {
        filePath = possiblePath;
      }
    }

    if (!filePath) {
      const files = await fs.promises.readdir(TEMP_DIRECTORY);

      const candidates = files
        .filter((file) => file.startsWith(path.basename(tempBase)))
        .map((file) => path.join(TEMP_DIRECTORY, file));

      if (candidates.length === 1) {
        filePath = candidates[0];
      }
    }

    if (!filePath) {
      throw createLinkError(
        "The video platform did not return a playable video file.",
        "NO_VIDEO_FILE",
        502
      );
    }

    const stats = await fs.promises.stat(filePath);

    if (stats.size === 0) {
      await cleanupFile(filePath);

      throw createLinkError(
        "The video platform returned an empty video file.",
        "EMPTY_VIDEO",
        502
      );
    }

    if (stats.size > MAX_FILE_SIZE) {
      await cleanupFile(filePath);

      throw createLinkError(
        "The video is larger than the 100 MB limit.",
        "VIDEO_TOO_LARGE",
        413
      );
    }

    return {
      filePath,
      sourceType: "extracted",
      sourcePlatform,
      contentType: null,
      fileSize: stats.size,
    };
  } catch (error) {
    const message = String(
      error?.stderr || error?.message || ""
    ).trim();

    const normalizedMessage = message.toLowerCase();

    if (error?.code === "VIDEO_TOO_LARGE") {
      throw error;
    }

    if (error?.code === "EMPTY_VIDEO") {
      throw error;
    }

    if (
      normalizedMessage.includes("requested format is not available") ||
      normalizedMessage.includes("only images are available") ||
      normalizedMessage.includes("no video formats found")
    ) {
      throw createLinkError(
        "The video platform did not provide a playable video format.",
        "NO_PLAYABLE_FORMAT",
        502
      );
    }

    if (
      normalizedMessage.includes("unsupported url") ||
      normalizedMessage.includes("is not a valid url")
    ) {
      throw createLinkError(
        "This webpage or video platform is not supported.",
        "UNSUPPORTED_URL",
        415
      );
    }

    if (
      normalizedMessage.includes("private video") ||
      normalizedMessage.includes("login required") ||
      normalizedMessage.includes("sign in")
    ) {
      throw createLinkError(
        "This video is private or requires authentication.",
        "AUTHENTICATION_REQUIRED",
        403
      );
    }

    if (
      normalizedMessage.includes("copyright") ||
      normalizedMessage.includes("not available in your country") ||
      normalizedMessage.includes("geo-restricted")
    ) {
      throw createLinkError(
        "This video is not available for extraction from this location.",
        "VIDEO_UNAVAILABLE",
        403
      );
    }

    if (
      normalizedMessage.includes("timed out") ||
      normalizedMessage.includes("timeout") ||
      error?.killed ||
      error?.signal === "SIGTERM"
    ) {
      throw createLinkError(
        "The video platform took too long to respond.",
        "EXTRACTION_TIMEOUT",
        504
      );
    }

    throw createLinkError(
      "The video could not be extracted from this webpage.",
      "EXTRACTION_FAILED",
      400
    );
  }
}

async function resolveVideoSource(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw createLinkError(
      "Please provide a video URL.",
      "INVALID_URL",
      400
    );
  }

  const url = rawUrl.trim();

  await validatePublicUrl(url);

  /*
   * First:
   * Try the URL as a direct video file.
   */
  try {
    return await downloadDirectVideo(url);
  } catch (error) {
    if (
      error?.code !== "NOT_DIRECT_VIDEO" &&
      error?.code !== "DOWNLOAD_FAILED"
    ) {
      throw error;
    }
  }

  /*
   * Second:
   * Treat the URL as a webpage/social-media/video-platform URL.
   *
   * yt-dlp attempts to locate and download the actual video.
   */
  const sourcePlatform = getSourcePlatform(url);

  return downloadWithYtDlp(url, sourcePlatform);
}

module.exports = {
  resolveVideoSource,
  downloadDirectVideo,
  downloadWithYtDlp,
  getSourcePlatform,
  validatePublicUrl,
  cleanupFile,
  MAX_FILE_SIZE,
};