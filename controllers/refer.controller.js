const supabase = require("../supabase");

function makeCode(userId) {
  return "WR" + String(userId).padStart(4, "0");
}

exports.getReferInfo = async (req, res) => {
  try {
    const userId = req.userId;
    const { data: user } = await supabase.from("users")
      .select("id, mobile, balance, refer_code, refer_earnings")
      .eq("id", userId).single();
    if (!user) return res.json({ success: false, error: "USER_NOT_FOUND" });
    let referCode = user.refer_code;
    if (!referCode) {
      referCode = makeCode(userId);
      await supabase.from("users").update({ refer_code: referCode }).eq("id", userId);
    }
    const { count: totalReferred } = await supabase.from("users")
      .select("id", { count: "exact", head: true }).eq("referred_by", referCode);
    const baseUrl = process.env.FRONTEND_URL || "https://wingo-frontend-ten.vercel.app";
    return res.json({
      success: true,
      referCode,
      referLink: `${baseUrl}/register?ref=${referCode}`,
      referEarnings: user.refer_earnings || 0,
      totalReferred: totalReferred || 0,
    });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.getReferLogs = async (req, res) => {
  try {
    const userId = req.userId;
    const { data: logs, error } = await supabase.from("refer_logs")
      .select("id, deposit_amount, bonus_amount, created_at, referred_id")
      .eq("referrer_id", userId).order("created_at", { ascending: false }).limit(50);
    if (error) return res.json({ success: false, error: error.message });
    const logsWithUser = await Promise.all((logs || []).map(async (log) => {
      const { data: refUser } = await supabase.from("users")
        .select("mobile").eq("id", log.referred_id).single();
      return { ...log, referred: { mobile: refUser?.mobile || "Unknown" } };
    }));
    return res.json({ success: true, logs: logsWithUser });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};

exports.creditReferBonus = async (userId, depositAmount) => {
  try {
    const { data: user } = await supabase.from("users")
      .select("referred_by").eq("id", userId).single();
    if (!user?.referred_by) return;
    const { data: referrer } = await supabase.from("users")
      .select("id, balance, refer_earnings").eq("refer_code", user.referred_by).single();
    if (!referrer) return;
    const bonus = parseFloat((depositAmount * 0.001).toFixed(2));
    if (bonus <= 0) return;
    await supabase.from("users").update({
      balance: referrer.balance + bonus,
      refer_earnings: (referrer.refer_earnings || 0) + bonus,
    }).eq("id", referrer.id);
    await supabase.from("refer_logs").insert([{
      referrer_id: referrer.id, referred_id: userId,
      deposit_amount: depositAmount, bonus_amount: bonus,
    }]);
  } catch (err) { console.error("Refer bonus error:", err.message); }
};

exports.adminGetReferData = async (req, res) => {
  try {
    const { data: logs, error } = await supabase.from("refer_logs")
      .select("*").order("created_at", { ascending: false }).limit(200);
    if (error) return res.json({ success: false, error: error.message });
    const enriched = await Promise.all((logs || []).map(async (log) => {
      const [{ data: referrer }, { data: referred }] = await Promise.all([
        supabase.from("users").select("mobile, refer_code").eq("id", log.referrer_id).single(),
        supabase.from("users").select("mobile, balance").eq("id", log.referred_id).single(),
      ]);
      return { ...log, referrer_mobile: referrer?.mobile, referrer_code: referrer?.refer_code,
        referred_mobile: referred?.mobile, referred_balance: referred?.balance };
    }));
    const { data: topReferrers } = await supabase.from("users")
      .select("id, mobile, refer_code, refer_earnings").gt("refer_earnings", 0)
      .order("refer_earnings", { ascending: false }).limit(20);
    const totalBonusPaid = enriched.reduce((s, l) => s + (l.bonus_amount || 0), 0);
    return res.json({ success: true, logs: enriched, topReferrers: topReferrers || [],
      totalBonusPaid: parseFloat(totalBonusPaid.toFixed(2)), totalReferrals: enriched.length });
  } catch (err) { return res.json({ success: false, error: err.message }); }
};
