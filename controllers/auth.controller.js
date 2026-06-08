const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../supabase");

function makeReferCode(userId) {
  return "WR" + String(userId).padStart(4, "0");
}

exports.register = async (req, res) => {
  try {
    const { mobile, password, referCode } = req.body;
    if (!mobile || !password)
      return res.json({ success: false, error: "MISSING_FIELDS" });

    const { data: exists } = await supabase
      .from("users").select("id").eq("mobile", mobile).single();
    if (exists) return res.json({ success: false, error: "MOBILE_EXISTS" });

    const hash = await bcrypt.hash(password, 10);

    let validRef = null;
    if (referCode) {
      const { data: referrer } = await supabase
        .from("users").select("id").eq("refer_code", referCode.toUpperCase()).single();
      if (referrer) validRef = referCode.toUpperCase();
    }

    const { data, error } = await supabase
      .from("users")
      .insert([{ mobile, password: hash, balance: 0, refer_earnings: 0, referred_by: validRef || null, status: "active" }])
      .select();

    if (error) return res.json({ success: false, error: error.message });

    const newUser = data[0];
    const refer_code = makeReferCode(newUser.id);
    await supabase.from("users").update({ refer_code }).eq("id", newUser.id);

    return res.json({ success: true, data: { ...newUser, refer_code } });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const { data } = await supabase
      .from("users").select("*").eq("mobile", mobile).single();

    if (!data) return res.json({ success: false, error: "USER_NOT_FOUND" });
    if (data.status === "banned") return res.json({ success: false, error: "ACCOUNT_BANNED" });

    const match = await bcrypt.compare(password, data.password);
    if (!match) return res.json({ success: false, error: "WRONG_PASSWORD" });

    if (!data.refer_code || data.refer_code.includes("-")) {
      const refer_code = makeReferCode(data.id);
      await supabase.from("users").update({ refer_code }).eq("id", data.id);
      data.refer_code = refer_code;
    }

    const token = jwt.sign({ id: data.id }, process.env.JWT_SECRET || "secret", { expiresIn: "30d" });
    const { password: _, ...safeUser } = data;
    return res.json({ success: true, token, user: safeUser });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const { data } = await supabase
      .from("users")
      .select("id, mobile, balance, refer_code, refer_earnings, referred_by, status, created_at")
      .eq("id", req.userId).single();

    if (!data) return res.json({ success: false, error: "NOT_FOUND" });

    if (!data.refer_code || data.refer_code.includes("-")) {
      const refer_code = makeReferCode(data.id);
      await supabase.from("users").update({ refer_code }).eq("id", data.id);
      data.refer_code = refer_code;
    }

    return res.json({ success: true, user: data });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
};
