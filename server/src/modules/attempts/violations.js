import { supabase } from "../../config/supabase.js";

/**
 * Records an anti-cheat violation during an active assessment attempt.
 * Checks violation limit configured for the assessment.
 */
export async function recordViolation(req, res, next) {
  try {
    const { attemptId } = req.params;
    const { type, details } = req.body || {};

    if (!type) {
      return res.status(400).json({ error: "Violation type is required" });
    }

    // 1. Fetch attempt and associated test config
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select(`
        id,
        test_id,
        status,
        expires_at
      `)
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return res.status(400).json({ error: "Attempt is not in progress" });
    }

    // 2. Fetch test configuration for violation limit
    const { data: config } = await supabase
      .from("test_configurations")
      .select("violation_limit, fullscreen_required")
      .eq("test_id", attempt.test_id)
      .maybeSingle();

    const violationLimit = config?.violation_limit || 3;

    // 3. Insert violation record
    const { data: violation, error: insertError } = await supabase
      .from("violations")
      .insert({
        attempt_id: attemptId,
        type: String(type).trim().toUpperCase(),
        details: details || {}
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    // 4. Count total violations for this attempt
    const { count: violationCount } = await supabase
      .from("violations")
      .select("id", { count: "exact", head: true })
      .eq("attempt_id", attemptId);

    const count = violationCount || 1;
    const limitExceeded = count >= violationLimit;

    res.status(201).json({
      ok: true,
      violation,
      violation_count: count,
      violation_limit: violationLimit,
      limit_exceeded: limitExceeded
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves violations for a given attempt.
 */
export async function getAttemptViolations(req, res, next) {
  try {
    const { attemptId } = req.params;

    const { data: violations, error } = await supabase
      .from("violations")
      .select("*")
      .eq("attempt_id", attemptId)
      .order("recorded_at", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({
      violations: violations || []
    });
  } catch (error) {
    next(error);
  }
}
