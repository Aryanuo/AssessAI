import { supabase } from "../config/supabase.js";

export async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        error: "Authorization header is required"
      });
    }

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Invalid authorization format"
      });
    }

    const token = authorization.substring(7);

    if (!token) {
      return res.status(401).json({
        error: "Access token is required"
      });
    }

    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: "Invalid or expired access token"
      });
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}