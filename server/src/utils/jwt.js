import jwt from "jsonwebtoken";

export function signAuthToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}