import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getSummary, getTimeseries } from "../controllers/statsController.js";

export const statsRoutes = Router();

statsRoutes.use(requireAuth);

statsRoutes.get("/summary", getSummary);
statsRoutes.get("/timeseries", getTimeseries);