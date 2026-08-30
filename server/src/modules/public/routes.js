import { Router } from "express";
import { getPublicTest } from "./controller.js";

const router = Router();

// Unauthenticated public route for test metadata
router.get("/public/tests/:testCode", getPublicTest);

export default router;
