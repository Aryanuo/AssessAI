import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";

import {
  createTest,
  getTests,
  getTestById,
  updateTest,
  deleteTest
} from "./controller.js";

import {
  validateCreateTest,
  validateUpdateTest
} from "./validation.js";

import { publishTest } from "./publish.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  getTests
);

router.get(
  "/:id",
  requireAuth,
  getTestById
);

router.delete(
  "/:id",
  requireAuth,
  deleteTest
);

router.patch(
  "/:id",
  requireAuth,
  validateUpdateTest,
  updateTest
);

router.post(
  "/",
  requireAuth,
  validateCreateTest,
  createTest
);

router.post(
  "/:id/publish",
  requireAuth,
  publishTest
);

export default router;