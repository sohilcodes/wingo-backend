const express = require("express");
const router = express.Router();
const {
  getCurrentRound, placeBet, cashout,
  getRoundHistory, createRound, startRound, crashRound
} = require("../controllers/aviator.controller");

router.get("/current", getCurrentRound);
router.post("/bet", placeBet);
router.post("/cashout", cashout);
router.get("/history", getRoundHistory);
router.post("/admin/create-round", createRound);
router.post("/admin/start-round", startRound);
router.post("/admin/crash-round", crashRound);

module.exports = router;
