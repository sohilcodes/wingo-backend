const jwt = require("jsonwebtoken");

exports.verifyUser = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, error: "NO_TOKEN" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "INVALID_TOKEN" });
  }
};

exports.verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, error: "NO_TOKEN" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    if (!decoded.isAdmin) return res.status(403).json({ success: false, error: "NOT_ADMIN" });
    req.adminId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ success: false, error: "INVALID_TOKEN" });
  }
};
