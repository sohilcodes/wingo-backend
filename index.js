const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(express.json());

// ---------------- ROUTES ----------------
const authRoutes = require("./routes/auth.routes");
const gameRoutes = require("./routes/game.routes");
const referRoutes = require("./routes/refer.routes");
const walletRoutes = require("./routes/wallet.routes");
const adminRoutes = require("./routes/admin.routes");
const aviatorRoutes = require("./routes/aviator.routes");

app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/refer", referRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/aviator", aviatorRoutes);

// ---------------- GAME ENGINE ----------------
try {
  const { startGameLoop } = require("./controllers/gameEngine");
  if (typeof startGameLoop === "function") {
    startGameLoop();
    console.log("🎮 Game loop started");
  }
} catch (err) {
  console.log("⚠️ Game engine error:", err.message);
}

// ---------------- HEALTH ----------------
app.get("/", (req, res) => res.send("🎮 Wingo Backend Running Successfully"));
app.get("/health", (req, res) => res.json({ success: true, status: "ok", time: new Date().toISOString() }));

// ---------------- START ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
