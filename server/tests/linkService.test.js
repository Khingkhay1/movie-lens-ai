const test = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveVideoSource,
  validatePublicUrl,
} = require("../services/linkService");

test("rejects an empty video URL", async () => {
  await assert.rejects(
    () => resolveVideoSource("   "),
    {
      code: "INVALID_URL",
      status: 400,
      message: "Please provide a video URL.",
    }
  );
});

test("rejects malformed URLs", async () => {
  await assert.rejects(
    () => validatePublicUrl("not-a-valid-url"),
    {
      code: "INVALID_URL",
      status: 400,
      message: "Please provide a valid HTTPS URL.",
    }
  );
});

test("rejects non-HTTPS URLs before making a network request", async () => {
  await assert.rejects(
    () => validatePublicUrl("http://example.com/video.mp4"),
    {
      code: "HTTPS_REQUIRED",
      status: 400,
      message: "Only HTTPS URLs are supported.",
    }
  );
});

test("rejects URLs that contain embedded credentials", async () => {
  await assert.rejects(
    () => validatePublicUrl("https://demo:sample@example.com/video.mp4"),
    {
      code: "CREDENTIALS_NOT_ALLOWED",
      status: 400,
      message: "URLs containing credentials are not allowed.",
    }
  );
});
