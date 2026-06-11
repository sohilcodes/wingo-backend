const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/auth.middleware");
const { startGame, revealCell, cashout } = require("../controllers/mines.controller");

router.post("/start", verifyUser, startGame);
router.post("/reveal", verifyUser, revealCell);
router.post("/cashout", verifyUser, cashout);

module.exports = router;
