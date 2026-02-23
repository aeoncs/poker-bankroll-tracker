import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  createEntry,
  listEntries,
  getEntry,
  updateEntry,
  deleteEntry,
} from "../controllers/entryController.js";

export const entryRoutes = Router();

entryRoutes.use(requireAuth);
entryRoutes.post("/", createEntry);
entryRoutes.get("/", listEntries);
entryRoutes.get("/:id", getEntry);
entryRoutes.put("/:id", updateEntry);
entryRoutes.delete("/:id", deleteEntry);