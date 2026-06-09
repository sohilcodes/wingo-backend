const supabase = require("../supabase");

exports.getCurrentRound = async (req, res) => {
  try {
    const { data } = await supabase
      .from("aviator_rounds")
      .select("*")
      .in("status", ["waiting", "flying"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    res.json({ success: true, round: data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

exports.placeBet = async (req, res) => {
  try {
    const { userId, roundId, amount, autoCashout } = req.body;
    if (!userId || !roundId || !amount)
      return res.json({ success: false, error: "Missing fields" });
    if (amount < 10 || amount > 8000)
      return res.json({ success: false, error: "Amount must be ₹10-₹8000" });
    const { data: user } = await supabase
      .from("users").select("balance").eq("id", userId).single();
    if (!user || user.balance < amount)
      return res.json({ success: false, error: "Insufficient balance" });
    await supabase.from("users")
      .update({ balance: user.balance - amount }).eq("id", userId);
    const { data } = await supabase.from("aviator_bets")
      .insert([{ user_id: userId, round_id: roundId, amount,
        auto_cashout: autoCashout || null, status: "active" }])
      .select().single();
    res.json({ success: true, bet: data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

exports.cashout = async (req, res) => {
  try {
    const { betId, multiplier, userId } = req.body;
    const { data: bet } = await supabase
      .from("aviator_bets").select("*").eq("id", betId).single();
    if (!bet || bet.status !== "active")
      return res.json({ success: false, error: "Bet not active" });
    const winAmount = parseFloat((bet.amount * multiplier).toFixed(2));
    await supabase.from("aviator_bets")
      .update({ status: "won", cashout_multiplier: multiplier, win_amount: winAmount })
      .eq("id", betId);
    const { data: user } = await supabase
      .from("users").select("balance").eq("id", userId).single();
    await supabase.from("users")
      .update({ balance: (user?.balance || 0) + winAmount }).eq("id", userId);
    res.json({ success: true, winAmount });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

exports.getRoundHistory = async (req, res) => {
  try {
    const { data } = await supabase
      .from("aviator_rounds")
      .select("id, crash_point, status, created_at")
      .eq("status", "crashed")
      .order("created_at", { ascending: false })
      .limit(20);
    res.json({ success: true, rounds: data || [] });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

exports.createRound = async (req, res) => {
  try {
    const { data } = await supabase
      .from("aviator_rounds")
      .insert([{ status: "waiting" }])
      .select().single();
    res.json({ success: true, round: data });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

exports.startRound = async (req, res) => {
  try {
    const { roundId } = req.body;
    await supabase.from("aviator_rounds")
      .update({ status: "flying", started_at: new Date().toISOString() })
      .eq("id", roundId);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

exports.crashRound = async (req, res) => {
  try {
    const { roundId, crashPoint } = req.body;
    await supabase.from("aviator_rounds")
      .update({ status: "crashed", crash_point: crashPoint, crashed_at: new Date().toISOString() })
      .eq("id", roundId);
    await supabase.from("aviator_bets")
      .update({ status: "lost" })
      .eq("round_id", roundId)
      .eq("status", "active");
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
