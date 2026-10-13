const express = require("express");
const multer = require("multer");
const path = require("path");

const identifyController =
  require("../controllers/identifyController");

const router =
  express.Router();

const MAX_UPLOAD_SIZE_BYTES =
  100 * 1024 * 1024;

const ALLOWED_MIME_TYPES =
  new Set([
    "video/mp4",
    "video/quicktime",
    "video/x-matroska",
    "video/webm",
  ]);

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        path.join(
          __dirname,
          "../uploads"
        )
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const safeName =
        path
          .basename(
            file.originalname
          )
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );

      cb(
        null,
        `${Date.now()}-${safeName}`
      );
    },
  });

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        MAX_UPLOAD_SIZE_BYTES,
    },

    fileFilter: (
      req,
      file,
      cb
    ) => {
      if (
        !ALLOWED_MIME_TYPES.has(
          file.mimetype
        )
      ) {
        return cb(
          new Error(
            "Unsupported video format."
          )
        );
      }

      cb(null, true);
    },
  });

router.post(
  "/identify",
  upload.single("video"),
  identifyController.identifyMovie
);

router.post(
  "/identify-link",
  identifyController.identifyMovieFromLink
);

module.exports = router;