require("dotenv").config();

const express = require("express");
const cors = require("cors");

const identifyRoutes = require("./routes/identifyRoutes");
const movieRoutes = require("./routes/movieRoutes");

const supabaseAdmin = require("./supabaseAdmin");

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const clientOrigin =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: clientOrigin }));
app.use(express.json());


// Home route
app.get("/", (req, res) => {
  res.json({
    message: "MovieLens AI Backend is running!",
  });
});


// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});


// API routes
app.use("/", identifyRoutes);
app.use("/", movieRoutes);


// Delete account
app.delete("/account", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the user's Supabase access token
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session.",
      });
    }

    // Delete the authenticated user's account
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Delete account error:", deleteError);

      return res.status(500).json({
        success: false,
        message:
          deleteError.message || "Could not delete account.",
      });
    }

    return res.json({
      success: true,
      message: "Account deleted successfully.",
    });
  } catch (error) {
    console.error("Delete account server error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete account.",
    });
  }
});


// Error handling
app.use((error, req, res, next) => {
  if (error.name === "MulterError") {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Video must be 100 MB or smaller."
        : error.message;

    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (error.message === "Unsupported video format.") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
});


// Start server
app.listen(PORT, () => {
  console.log(
    `Server is running on http://localhost:${PORT}`
  );
});