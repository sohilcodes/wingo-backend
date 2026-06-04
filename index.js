const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ---------------- ROUTES ----------------
const authRoutes = require("./routes/auth.routes");
const gameRoutes = require("./routes/game.routes");

// API USE
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);

// ---------------- GAME ENGINE ----------------
const { startGameLoop } = require("./controllers/gameEngine");

// Start Wingo Game Loop (60 sec cycle)
startGameLoop();

// ---------------- TEST ROUTES ----------------
app.get("/", (req, res) => {
  res.send("🎮 Wingo Backend Running");
});

app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working fine 🚀"
  });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
