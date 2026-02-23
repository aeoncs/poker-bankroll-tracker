import { verifyAuthToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const payload = verifyAuthToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}