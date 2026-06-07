const express = require("express");
const router = express.Router();
const { verifyUser } = require("../middleware/auth.middleware");
const supabase = require("../supabase");
const { creditReferBonus } = require("../controllers/refer.controller");

router.post("/deposit", verifyUser, async (req, res) => {
  try {
    const { amount, utrCode } = req.body;
    const userId = req.userId;
    if (!amount || amount < 100) return res.json({ success: false, error: "Min deposit ₹100" });
    if (!utrCode) return res.json({ success: false, error: "UTR required" });
    const { data, error } = await supabase.from("deposits")
      .insert([{ user_id: userId, amount, utr_code: utrCode, status: "pending" }]).select();
    if (error) return res.json({ success: false, error: error.message });
    return res.json({ success: true, deposit: data[0] });
  } catch (err) { return res.json({ success: false, error: err.message }); }
});

router.post("/withdraw", verifyUser, async (req, res) => {
  try {
    const { amount, upiId, upiName } = req.body;
    const userId = req.userId;
    if (!amount || amount < 200) return res.json({ success: false, error: "Min withdrawal ₹200" });
    const { data: user } = await supabase.from("users").select("balance").eq("id", userId).single();
    if (!user || user.balance < amount) return res.json({ success: false, error: "Insufficient balance" });
    await supabase.from("users").update({ balance: user.balance - amount }).eq("id", userId);
    const { data, error } = await supabase.from("withdrawals")
      .insert([{ user_id: userId, amount, upi_id: upiId, upi_name: upiName, status: "pending" }]).select();
    if (error) {
      await supabase.from("users").update({ balance: user.balance }).eq("id", userId);
      return res.json({ success: false, error: error.message });
    }
    return res.json({ success: true, withdrawal: data[0] });
  } catch (err) { return res.json({ success: false, error: err.message }); }
});

module.exports = router;
