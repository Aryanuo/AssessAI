import { Router } from "express";
import {
  registerIndividual,
  createTeam,
  joinTeam,
  getTeamDetails
} from "./controller.js";

const router = Router();

// Public unauthenticated routes for assessment participation & team management
router.post("/public/tests/:testCode/register", registerIndividual);
router.post("/public/tests/:testCode/teams", createTeam);
router.post("/public/tests/:testCode/teams/:teamCode/join", joinTeam);
router.get("/public/teams/:teamCode", getTeamDetails);

export default router;
