import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { getTestResults, getAttemptDetail, reEvaluateAttempt } from "./controller.js";

const router = Router();

// Protected creator routes for assessment results & analytics
router.get("/tests/:testId/results", requireAuth, getTestResults);
router.get("/tests/:testId/results/:attemptId", requireAuth, getAttemptDetail);
router.post("/tests/:testId/results/:attemptId/re-evaluate", requireAuth, reEvaluateAttempt);

export default router;
