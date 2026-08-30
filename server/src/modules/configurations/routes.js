import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  getConfiguration,
  updateConfiguration
} from "./controller.js";
import { validateUpdateConfiguration } from "./validation.js";

const router = Router();

router.get(
  "/tests/:testId/configuration",
  requireAuth,
  getConfiguration
);

router.patch(
  "/tests/:testId/configuration",
  requireAuth,
  validateUpdateConfiguration,
  updateConfiguration
);

export default router;
