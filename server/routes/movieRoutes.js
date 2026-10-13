const express = require("express");
const { searchMovies, getDetailsById } = require("../services/tmdbService");

const router = express.Router();

router.get("/movies/search", async (req, res) => {
  const query = String(req.query.query || "").trim();
  if (query.length < 2) return res.status(400).json({ message: "Enter at least two characters." });
  try {
    res.json({ results: await searchMovies(query) });
  } catch (error) {
    res.status(502).json({ message: "Movie search is temporarily unavailable." });
  }
});

router.get("/movies/:type/:id", async (req, res) => {
  try {
    res.json(await getDetailsById(req.params.id, req.params.type));
  } catch (error) {
    res.status(502).json({ message: "Movie details are temporarily unavailable." });
  }
});

module.exports = router;
