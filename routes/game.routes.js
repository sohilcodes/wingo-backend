const express = require("express");
const router = express.Router();
const supabase = require("../supabase");


// =========================
// GET CURRENT PERIOD
// =========================
router.get("/current-period", async (req, res) => {
  try {
    const { data } = await supabase
      .from("game_rounds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return res.json({
      success: true,
      period: data?.period_id || null,
    });
  } catch (err) {
    return res.json({
      success: false,
      error: err.message,
    });
  }
});


// =========================
// GET GAME STATUS (LATEST RESULT)
// =========================
router.get("/status", async (req, res) => {
  try {
    const { data } = await supabase
      .from("game_rounds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return res.json({
      success: true,
      lastRound: data || null,
    });
  } catch (err) {
    return res.json({
      success: false,
      error: err.message,
    });
  }
});


// =========================
// PLACE BET
// =========================
router.post("/bet", async (req, res) => {
  const { userId, type, value, amount, period_id } = req.body;

  if (!userId || !type || !value || !amount || !period_id) {
    return res.json({
      success: false,
      error: "MISSING_FIELDS",
    });
  }

  try {
    // 1. check user
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!user) {
      return res.json({ success: false, error: "USER_NOT_FOUND" });
    }

    if (user.balance < amount) {
      return res.json({ success: false, error: "INSUFFICIENT_BALANCE" });
    }

    // 2. deduct balance
    await supabase
      .from("users")
      .update({
        balance: user.balance - amount,
      })
      .eq("id", userId);

    // 3. insert bet
    const { data, error } = await supabase
      .from("bets")
      .insert([
        {
          user_id: userId,
          type,
          value,
          amount,
          period_id,
          status: "pending",
        },
      ]);

    if (error) {
      return res.json({
        success: false,
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: "Bet Placed",
      bet: data,
    });
  } catch (err) {
    return res.json({
      success: false,
      error: err.message,
    });
  }
});


// =========================
// GET USER BET HISTORY
// =========================
router.get("/bets/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const { data } = await supabase
      .from("bets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return res.json({
      success: true,
      bets: data,
    });
  } catch (err) {
    return res.json({
      success: false,
      error: err.message,
    });
  }
});


module.exports = router;
