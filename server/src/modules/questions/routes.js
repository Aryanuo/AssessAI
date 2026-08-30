import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";

import {
  generateTestQuestions,
  getTestQuestions,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  createQuestion
} from "./controller.js";

const router = Router();

/*
 * Generate questions from uploaded DOCX
 */
router.post(
  "/tests/:testId/generate-questions",
  requireAuth,
  generateTestQuestions
);

/*
 * Get all questions for a test
 */
router.get(
  "/tests/:testId/questions",
  requireAuth,
  getTestQuestions
);

/*
 * Create a question manually
 */
router.post(
  "/tests/:testId/questions",
  requireAuth,
  createQuestion
);

/*
 * Reorder questions
 */
router.patch(
  "/tests/:testId/questions/reorder",
  requireAuth,
  reorderQuestions
);

/*
 * Edit a question
 */
router.patch(
  "/questions/:id",
  requireAuth,
  updateQuestion
);

/*
 * Delete a question
 */
router.delete(
  "/questions/:id",
  requireAuth,
  deleteQuestion
);

export default router;