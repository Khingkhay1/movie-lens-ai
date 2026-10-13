import { useCallback, useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Profile from "./pages/Profile";
import History from "./pages/History";
import Search from "./pages/Search";
import MovieDetails from "./pages/MovieDetails";
import Login from "./pages/Sign in";
import Register from "./pages/Register";

function App() {
  const location = useLocation();

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [identificationResult, setIdentificationResult] = useState(null);

  const clearSession = useCallback(() => {
    setSelectedVideo(null);
    setPreviewUrl("");
    setIdentificationResult(null);
  }, []);

  useEffect(() => {
    if (
      location.pathname === "/" &&
      location.state?.clearMovieSession
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      clearSession();

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }, [location.pathname, location.state, clearSession]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <>
      <Navbar />

      <Routes>
        <Route
          path="/"
          element={
            <Home
              selectedVideo={selectedVideo}
              setSelectedVideo={setSelectedVideo}
              previewUrl={previewUrl}
              setPreviewUrl={setPreviewUrl}
              identificationResult={identificationResult}
              setIdentificationResult={
                setIdentificationResult
              }
              clearSession={clearSession}
            />
          }
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/history"
          element={<History />}
        />

        <Route
          path="/search"
          element={<Search />}
        />

        <Route
          path="/movie/:type/:id"
          element={<MovieDetails />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />
      </Routes>
    </>
  );
}

export default App;