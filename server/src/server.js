import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PORT = process.env.PORT || 10000;

async function start() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI (or MONGO_URI)");
  }

  await connectDB(mongoUri);

  const app = createApp();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});