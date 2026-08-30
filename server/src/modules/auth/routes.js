import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.user_metadata?.name ?? null
    }
  });
});

export default router;