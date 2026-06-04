const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../supabase");

// REGISTER
exports.register = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.json({ error: "MISSING_FIELDS" });
    }

    const hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          mobile,
          password: hash,
          balance: 0
        }
      ])
      .select();

    res.json({
      success: true,
      data,
      error
    });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("mobile", mobile)
      .single();

    if (!data) {
      return res.json({ error: "USER_NOT_FOUND" });
    }

    const match = await bcrypt.compare(password, data.password);

    if (!match) {
      return res.json({ error: "WRONG_PASSWORD" });
    }

    const token = jwt.sign(
      { id: data.id },
      "secret"
    );

    res.json({
      success: true,
      token,
      user: data
    });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
