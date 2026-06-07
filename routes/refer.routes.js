const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/auth.middleware");
const { getReferInfo, getReferLogs } = require("../controllers/refer.controller");

router.get("/info", verifyUser, getReferInfo);
router.get("/logs", verifyUser, getReferLogs);

module.exports = router;
