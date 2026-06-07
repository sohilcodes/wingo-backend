const express = require("express");
const router = express.Router();
const {
  adminLogin, getStats, getUsers, getDeposits, getWithdrawals,
  banUser, unbanUser, adjustBalance, updateDeposit, updateWithdrawal,
  getResults, setManualResult
} = require("../controllers/admin.controller");
const { adminGetReferData } = require("../controllers/refer.controller");
const jwt = require("jsonwebtoken");

const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, error: "NO_TOKEN" });
  try {
    const d = jwt.verify(token, process.env.JWT_SECRET || "secret");
    if (!d.isAdmin) return res.status(403).json({ success: false, error: "NOT_ADMIN" });
    next();
  } catch { return res.status(401).json({ success: false, error: "INVALID_TOKEN" }); }
};

router.post("/login", adminLogin);
router.get("/stats", adminAuth, getStats);
router.get("/users", adminAuth, getUsers);
router.get("/deposits", adminAuth, getDeposits);
router.get("/withdrawals", adminAuth, getWithdrawals);
router.post("/users/:id/ban", adminAuth, banUser);
router.post("/users/:id/unban", adminAuth, unbanUser);
router.post("/users/:id/balance", adminAuth, adjustBalance);
router.put("/deposits/:id", adminAuth, updateDeposit);
router.put("/withdrawals/:id", adminAuth, updateWithdrawal);
router.get("/results", adminAuth, getResults);
router.post("/results/manual", adminAuth, setManualResult);
router.get("/refer", adminAuth, adminGetReferData);

module.exports = router;
