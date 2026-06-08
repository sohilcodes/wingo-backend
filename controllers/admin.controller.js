const supabase = require("../supabase");
const jwt = require("jsonwebtoken");
const { creditReferBonus } = require("./refer.controller");

exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin123";
  if (username !== ADMIN_USER || password !== ADMIN_PASS)
    return res.json({ success: false, error: "Invalid credentials" });
  const token = jwt.sign({ id: 0, isAdmin: true }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
  return res.json({ success: true, token });
};

exports.getStats = async (req, res) => {
  try {
    const [{ count: totalUsers }, { data: deposits }, { data: withdrawals }, { count: totalBets }] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("deposits").select("amount, status"),
      supabase.from("withdrawals").select("amount, status"),
      supabase.from("bets").select("id", { count: "exact", head: true }),
    ]);
    const totalDeposits = (deposits || []).filter(d => d.status === "approved").reduce((s, d) => s + d.amount, 0);
    const pendingDeposits = (deposits || []).filter(d => d.status === "pending").length;
    const totalWithdrawals = (withdrawals || []).filter(w => w.status === "approved").reduce((s, w) => s + w.amount, 0);
    const pendingWithdrawals = (withdrawals || []).filter(w => w.status === "pending").length;
    return res.json({ success: true, totalUsers: totalUsers || 0, activeToday: 0,
      totalDeposits, pendingDeposits, totalWithdrawals, pendingWithdrawals,
      totalBets: totalBets || 0, revenue: totalDeposits - totalWithdrawals });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.from("users")
      .select("id, mobile, balance, status, refer_code, refer_earnings, referred_by, created_at")
      .order("created_at", { ascending: false });
    if (error) return res.json({ success: false, error: error.message });
    const enriched = await Promise.all((data || []).map(async (u) => {
      const [{ data: deps }, { count: betsCount }] = await Promise.all([
        supabase.from("deposits").select("amount").eq("user_id", u.id).eq("status", "approved"),
        supabase.from("bets").select("id", { count: "exact", head: true }).eq("user_id", u.id),
      ]);
      return { ...u, totalDeposit: (deps || []).reduce((s, d) => s + d.amount, 0),
        totalBets: betsCount || 0, createdAt: u.created_at?.slice(0, 10) };
    }));
    return res.json({ success: true, users: enriched });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.banUser = async (req, res) => {
  try {
    await supabase.from("users").update({ status: "banned" }).eq("id", req.params.id);
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.unbanUser = async (req, res) => {
  try {
    await supabase.from("users").update({ status: "active" }).eq("id", req.params.id);
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.adjustBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    const { data: user } = await supabase.from("users").select("balance").eq("id", req.params.id).single();
    if (!user) return res.json({ success: false, error: "User not found" });
    await supabase.from("users").update({ balance: user.balance + Number(amount) }).eq("id", req.params.id);
    return res.json({ success: true, newBalance: user.balance + Number(amount) });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.getDeposits = async (req, res) => {
  try {
    const { data, error } = await supabase.from("deposits")
      .select("*, users(mobile)").order("created_at", { ascending: false }).limit(100);
    if (error) return res.json({ success: false, error: error.message });
    const enriched = (data || []).map(d => ({ ...d, mobile: d.users?.mobile || "Unknown",
      utrCode: d.utr_code, createdAt: d.created_at?.slice(0, 16).replace("T", " ") }));
    return res.json({ success: true, deposits: enriched });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.updateDeposit = async (req, res) => {
  try {
    const { status } = req.body;
    const { data: dep } = await supabase.from("deposits").select("*").eq("id", req.params.id).single();
    if (!dep) return res.json({ success: false, error: "Not found" });
    if (dep.status !== "pending") return res.json({ success: false, error: "Already processed" });
    await supabase.from("deposits").update({ status }).eq("id", req.params.id);
    if (status === "approved") {
      const { data: user } = await supabase.from("users").select("balance").eq("id", dep.user_id).single();
      await supabase.from("users").update({ balance: (user?.balance || 0) + dep.amount }).eq("id", dep.user_id);
      try { await creditReferBonus(dep.user_id, dep.amount); } catch {}
    }
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.getWithdrawals = async (req, res) => {
  try {
    const { data, error } = await supabase.from("withdrawals")
      .select("*, users(mobile)").order("created_at", { ascending: false }).limit(100);
    if (error) return res.json({ success: false, error: error.message });
    const enriched = (data || []).map(w => ({ ...w, mobile: w.users?.mobile || "Unknown",
      upiId: w.upi_id, upiName: w.upi_name, createdAt: w.created_at?.slice(0, 16).replace("T", " ") }));
    return res.json({ success: true, withdrawals: enriched });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.updateWithdrawal = async (req, res) => {
  try {
    const { status } = req.body;
    const { data: w } = await supabase.from("withdrawals").select("*").eq("id", req.params.id).single();
    if (!w) return res.json({ success: false, error: "Not found" });
    await supabase.from("withdrawals").update({ status }).eq("id", req.params.id);
    if (status === "rejected") {
      const { data: user } = await supabase.from("users").select("balance").eq("id", w.user_id).single();
      await supabase.from("users").update({ balance: (user?.balance || 0) + w.amount }).eq("id", w.user_id);
    }
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.getResults = async (req, res) => {
  try {
    const { data, error } = await supabase.from("game_rounds")
      .select("*").order("created_at", { ascending: false }).limit(50);
    if (error) return res.json({ success: false, error: error.message });
    const enriched = (data || []).map(r => ({ ...r, totalBets: 0, totalPot: 0, winners: 0, payout: 0,
      createdAt: r.created_at?.slice(0, 16).replace("T", " ") }));
    return res.json({ success: true, results: enriched });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.setManualResult = async (req, res) => {
  try {
    const { period, result, number } = req.body;
    await supabase.from("game_rounds").upsert([{
      period_id: period, result: number, color: result, is_manual: true
    }], { onConflict: "period_id" });
    return res.json({ success: true });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};
