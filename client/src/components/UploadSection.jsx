import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm",
]);

const PROCESSING_STEPS = [
  "Preparing your request",
  "Analyzing the scene",
  "Identifying the movie",
  "Verifying with TMDb",
];

function UploadSection({
  selectedVideo,
  setSelectedVideo,
  previewUrl,
  setPreviewUrl,
  identificationResult,
  setIdentificationResult,
  clearSession,
}) {
  const fileInputRef = useRef(null);

  const [inputMode, setInputMode] = useState("upload");
  const [linkUrl, setLinkUrl] = useState("");

  const [isIdentifying, setIsIdentifying] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [statusMessage, setStatusMessage] =
    useState("");

  const [processingStep, setProcessingStep] =
    useState(0);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearUpload() {
    setErrorMessage("");
    setStatusMessage("");
    setProcessingStep(0);

    clearSession();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function switchInputMode(mode) {
    if (isIdentifying) {
      return;
    }

    setInputMode(mode);
    setErrorMessage("");
    setStatusMessage("");
    setProcessingStep(0);
    setIdentificationResult(null);

    if (mode === "link") {
      clearSession();
    }

    if (mode === "upload") {
      setLinkUrl("");
    }
  }

  function handleVideoChange(event) {
    const videoFile =
      event.target.files?.[0];

    if (!videoFile) {
      return;
    }

    setErrorMessage("");
    setIdentificationResult(null);
    setStatusMessage("");
    setProcessingStep(0);

    if (
      !ALLOWED_VIDEO_TYPES.has(
        videoFile.type
      )
    ) {
      setErrorMessage(
        "Choose an MP4, MOV, MKV, or WebM video."
      );

      event.target.value = "";
      return;
    }

    if (
      videoFile.size >
      MAX_VIDEO_SIZE_BYTES
    ) {
      setErrorMessage(
        "Choose a video that is 100 MB or smaller."
      );

      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const nextPreviewUrl =
      URL.createObjectURL(videoFile);

    setSelectedVideo(videoFile);
    setPreviewUrl(nextPreviewUrl);
  }

  function chooseAnotherVideo() {
    clearUpload();
    setInputMode("upload");

    fileInputRef.current?.click();
  }

  async function getAccessToken() {
    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getSession();

    if (authError) {
      throw new Error(
        "We could not verify your session. Please sign in again."
      );
    }

    const accessToken =
      authData?.session?.access_token;

    if (!accessToken) {
      throw new Error(
        "Please sign in before identifying a movie."
      );
    }

    return accessToken;
  }

  function startProcessingStatus() {
    setProcessingStep(0);
    setStatusMessage(
      PROCESSING_STEPS[0]
    );

    return setInterval(() => {
      setProcessingStep(
        (currentStep) => {
          const nextStep = Math.min(
            currentStep + 1,
            PROCESSING_STEPS.length - 1
          );

          setStatusMessage(
            PROCESSING_STEPS[nextStep]
          );

          return nextStep;
        }
      );
    }, 1800);
  }

  async function identifyMovie() {
    if (
      !selectedVideo ||
      isIdentifying
    ) {
      return;
    }

    setIsIdentifying(true);
    setIdentificationResult(null);
    setErrorMessage("");

    const progressInterval =
      startProcessingStatus();

    try {
      const accessToken =
        await getAccessToken();

      const formData =
        new FormData();

      formData.append(
        "video",
        selectedVideo
      );

      const response =
        await fetch(
          `${API_URL}/identify`,
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
            body: formData,
          }
        );

      const data =
        await response
          .json()
          .catch(() => {
            throw new Error(
              "The server returned an invalid response."
            );
          });

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Movie identification failed."
        );
      }

      setProcessingStep(
        PROCESSING_STEPS.length
      );

      setStatusMessage(
        "Movie identified and verified successfully!"
      );

      setIdentificationResult(
        data
      );
    } catch (error) {
      console.error(
        "Frontend identification error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Something went wrong while identifying the movie."
      );

      setProcessingStep(0);
      setStatusMessage("");
    } finally {
      clearInterval(
        progressInterval
      );

      setIsIdentifying(false);
    }
  }

  async function identifyMovieFromLink() {
    const trimmedUrl =
      linkUrl.trim();

    if (
      !trimmedUrl ||
      isIdentifying
    ) {
      return;
    }

    setIsIdentifying(true);
    setIdentificationResult(null);
    setErrorMessage("");

    const progressInterval =
      startProcessingStatus();

    try {
      const accessToken =
        await getAccessToken();

      const response =
        await fetch(
          `${API_URL}/identify-link`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              url: trimmedUrl,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => {
            throw new Error(
              "The server returned an invalid response."
            );
          });

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Movie identification from the link failed."
        );
      }

      setProcessingStep(
        PROCESSING_STEPS.length
      );

      setStatusMessage(
        "Movie identified and verified successfully!"
      );

      setIdentificationResult(
        data
      );
    } catch (error) {
      console.error(
        "Frontend link identification error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Something went wrong while identifying the movie from this link."
      );

      setProcessingStep(0);
      setStatusMessage("");
    } finally {
      clearInterval(
        progressInterval
      );

      setIsIdentifying(false);
    }
  }

  const result =
    identificationResult;

  return (
    <section
      id="upload-section"
      className="relative px-6 pb-28"
    >
      <div className="mx-auto max-w-4xl">

        {/* Section heading */}

        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-[#D6A85F]">
            Identify a scene
          </p>

          <h3 className="mt-3 text-3xl font-semibold text-[#F4F1EA] md:text-4xl">
            Drop your clip.
          </h3>

          <p className="mt-3 max-w-xl text-[#737986]">
            Upload a short scene or provide a
            direct video link and MovieLens will
            identify the movie.
          </p>
        </div>

        {/* Input mode selector */}

        <div className="mb-4 flex rounded-2xl border border-white/10 bg-[#171A21] p-1">
          <button
            type="button"
            onClick={() =>
              switchInputMode("upload")
            }
            disabled={isIdentifying}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
              inputMode === "upload"
                ? "bg-[#F4F1EA] text-[#0F1115]"
                : "text-[#737986] hover:text-[#F4F1EA]"
            }`}
          >
            Upload a clip
          </button>

          <button
            type="button"
            onClick={() =>
              switchInputMode("link")
            }
            disabled={isIdentifying}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition ${
              inputMode === "link"
                ? "bg-[#F4F1EA] text-[#0F1115]"
                : "text-[#737986] hover:text-[#F4F1EA]"
            }`}
          >
            Paste a video link
          </button>
        </div>

        {/* Main input card */}

        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#171A21] p-2 shadow-2xl">
          <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-[#D6A85F]/[0.06] blur-[90px] transition duration-700 group-hover:bg-[#D6A85F]/[0.1]" />

          <div className="relative rounded-[22px] border border-dashed border-white/10 px-6 py-16 text-center transition group-hover:border-[#D6A85F]/30">

            {/* Upload mode */}

            {inputMode === "upload" &&
              !selectedVideo &&
              !result && (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-2xl text-[#D6A85F]">
                    ↑
                  </div>

                  <h4 className="mt-6 text-xl font-medium text-[#F4F1EA]">
                    Upload a movie clip
                  </h4>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#737986]">
                    Choose a short video from
                    your device. Shorter clips
                    work best for identification.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="mt-7 rounded-full bg-[#F4F1EA] px-7 py-3 font-medium text-[#0F1115] transition hover:-translate-y-0.5 hover:bg-[#D6A85F]"
                  >
                    Choose a clip
                  </button>

                  <p className="mt-5 text-xs text-[#555B67]">
                    MP4 · MOV · MKV · WebM ·
                    Up to 100 MB · 60 seconds max
                  </p>
                </>
              )}

            {/* Link mode */}

            {inputMode === "link" &&
              !result && (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-2xl text-[#D6A85F]">
                    ↗
                  </div>

                  <h4 className="mt-6 text-xl font-medium text-[#F4F1EA]">
                    Paste a video link
                  </h4>

                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#737986]">
                    Paste a direct HTTPS video
                    link. MovieLens will download
                    the clip temporarily and send
                    it through the same identification
                    engine.
                  </p>

                  <div className="mx-auto mt-7 flex max-w-2xl flex-col gap-3 sm:flex-row">
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(event) =>
                        setLinkUrl(
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                          "Enter"
                        ) {
                          identifyMovieFromLink();
                        }
                      }}
                      disabled={isIdentifying}
                      placeholder="https://example.com/video.mp4"
                      className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/20 px-5 py-3 text-sm text-[#F4F1EA] outline-none placeholder:text-[#555B67] focus:border-[#D6A85F]/50"
                    />

                    <button
                      type="button"
                      onClick={
                        identifyMovieFromLink
                      }
                      disabled={
                        isIdentifying ||
                        !linkUrl.trim()
                      }
                      className="rounded-full bg-[#F4F1EA] px-7 py-3 font-medium text-[#0F1115] transition hover:bg-[#D6A85F] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Identify link →
                    </button>
                  </div>

                  <p className="mt-5 text-xs text-[#555B67]">
                    HTTPS direct video links ·
                    Up to 100 MB
                  </p>
                </>
              )}

            {/* Selected upload */}

            {inputMode === "upload" &&
              selectedVideo &&
              !result && (
                <>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#D6A85F]">
                    Selected clip
                  </p>

                  <h4 className="mt-3 truncate text-xl font-medium text-[#F4F1EA]">
                    {selectedVideo.name}
                  </h4>

                  {previewUrl && (
                    <video
                      src={previewUrl}
                      controls
                      className="mx-auto mt-7 max-h-[420px] w-full max-w-2xl rounded-2xl bg-black object-contain shadow-xl"
                    />
                  )}

                  <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={
                        chooseAnotherVideo
                      }
                      disabled={isIdentifying}
                      className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-[#9298A5] transition hover:border-white/20 hover:bg-white/[0.04] hover:text-[#F4F1EA] disabled:opacity-50"
                    >
                      Choose another
                    </button>

                    <button
                      type="button"
                      onClick={identifyMovie}
                      disabled={isIdentifying}
                      className="rounded-full bg-[#F4F1EA] px-7 py-3 font-medium text-[#0F1115] transition hover:bg-[#D6A85F] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isIdentifying
                        ? "Analyzing..."
                        : "Identify this movie →"}
                    </button>

                    {!isIdentifying && (
                      <button
                        type="button"
                        onClick={clearUpload}
                        className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-[#737986] transition hover:border-red-400/30 hover:text-red-300"
                      >
                        Remove video
                      </button>
                    )}
                  </div>
                </>
              )}

            {/* Result */}

            {result && (
              <div className="text-left">
                <p className="text-xs uppercase tracking-[0.2em] text-[#D6A85F]">
                  Identification complete
                </p>

                <div className="mt-4 flex items-center gap-4">
                  {result.poster && (
                    <img
                      src={result.poster}
                      alt={
                        result.movie ||
                        "Identified movie"
                      }
                      className="h-24 w-16 rounded-xl object-cover"
                    />
                  )}

                  <div>
                    <h4 className="text-xl font-semibold text-[#F4F1EA]">
                      {result.movie ||
                        "Unknown title"}
                    </h4>

                    {result.year && (
                      <p className="mt-1 text-sm text-[#737986]">
                        {result.year}
                      </p>
                    )}

                    {result.confidence !==
                      undefined && (
                      <p className="mt-2 text-sm text-[#D6A85F]">
                        {result.confidence}% match
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {result.tmdbId && (
                    <Link
                      to={`/movie/${
                        result.type ||
                        "movie"
                      }/${result.tmdbId}`}
                      className="rounded-full bg-[#D6A85F] px-6 py-3 text-sm font-medium text-[#0F1115] transition hover:bg-[#E5BC78]"
                    >
                      View full details
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={clearUpload}
                    className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-[#9298A5] transition hover:border-white/20 hover:bg-white/[0.04] hover:text-[#F4F1EA]"
                  >
                    Identify another clip
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error */}

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-5 py-4">
            <p className="text-sm text-red-300">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Processing */}

        {isIdentifying && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-[#171A21] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#F4F1EA]">
                  {statusMessage}
                </p>

                <p className="mt-1 text-xs text-[#737986]">
                  MovieLens is examining your scene.
                </p>
              </div>

              <div className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-white/10 border-t-[#D6A85F]" />
            </div>

            <div className="mt-6 flex gap-2">
              {PROCESSING_STEPS.map(
                (step, index) => (
                  <div
                    key={step}
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                      index <= processingStep
                        ? "bg-[#D6A85F]"
                        : "bg-white/10"
                    }`}
                  />
                )
              )}
            </div>
          </div>
        )}

        {/* Hidden file input */}

        <input
          type="file"
          accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
          ref={fileInputRef}
          onChange={handleVideoChange}
          className="hidden"
        />
      </div>
    </section>
  );
}

export default UploadSection;