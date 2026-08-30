import { Router } from "express";
import multer from "multer";

import { requireAuth } from "../../middleware/auth.js";

import {
  uploadDocument
} from "./controller.js";

import {
  validateDocx
} from "./validation.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post(
  "/tests/:testId/documents",
  requireAuth,
  upload.single("document"),
  validateDocx,
  uploadDocument
);

export default router;