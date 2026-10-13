import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Hero from "../components/Hero";
import UploadSection from "../components/UploadSection";

function Home({
  selectedVideo,
  setSelectedVideo,
  previewUrl,
  setPreviewUrl,
  identificationResult,
  setIdentificationResult,
  clearSession,
}) {
  const location = useLocation();

  useEffect(() => {
    if (location.state?.clearMovieSession) {
      clearSession();

      // Remove the command from browser history
      window.history.replaceState({}, document.title);
    }
  }, [location.state, clearSession]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Hero />

      <UploadSection
        selectedVideo={selectedVideo}
        setSelectedVideo={setSelectedVideo}
        previewUrl={previewUrl}
        setPreviewUrl={setPreviewUrl}
        identificationResult={identificationResult}
        setIdentificationResult={setIdentificationResult}
        clearSession={clearSession}
      />
    </main>
  );
}

export default Home;