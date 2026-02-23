import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { 
    completeSetup,
    createBankroll,
    deleteBankroll,
    updateBankroll, 
    listBankrolls,
    getSettings,
    updateSettings, } from "../controllers/userController.js";

export const userRoutes = Router();

userRoutes.use(requireAuth);

userRoutes.get("/bankrolls", listBankrolls);
userRoutes.post("/bankrolls", createBankroll);
userRoutes.delete("/bankrolls/:bankrollId", deleteBankroll);
userRoutes.put("/bankrolls/:bankrollId", updateBankroll);

userRoutes.post("/setup", completeSetup);

userRoutes.get("/settings", getSettings);
userRoutes.put("/settings", updateSettings);

