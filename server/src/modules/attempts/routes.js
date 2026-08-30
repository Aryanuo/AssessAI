import { Router } from "express";
import {
  startAttempt,
  getAttemptQuestions,
  saveAnswer,
  submitAttempt
} from "./controller.js";
import {
  recordViolation,
  getAttemptViolations
} from "./violations.js";

const router = Router();

// Public unauthenticated routes for assessment test-taking
router.post("/public/attempts/start", startAttempt);
router.get("/public/attempts/:attemptId/questions", getAttemptQuestions);
router.post("/public/attempts/:attemptId/answers", saveAnswer);
router.post("/public/attempts/:attemptId/submit", submitAttempt);
router.post("/public/attempts/:attemptId/violations", recordViolation);
router.get("/public/attempts/:attemptId/violations", getAttemptViolations);

export default router;

