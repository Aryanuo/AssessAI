import { supabase } from "../../config/supabase.js";

export async function getConfiguration(req, res, next) {
  try {
    const { testId } = req.params;
    const creatorId = req.user.id;

    // 1. Verify test ownership
    const { data: test, error: testError } = await supabase
      .from("tests")
      .select("id, status")
      .eq("id", testId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (testError) {
      return res.status(500).json({ error: testError.message });
    }

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // 2. Fetch configuration
    const { data: config, error: configError } = await supabase
      .from("test_configurations")
      .select("*")
      .eq("test_id", testId)
      .maybeSingle();

    if (configError) {
      return res.status(500).json({ error: configError.message });
    }

    // If config doesn't exist yet, insert a default one
    if (!config) {
      const { data: newConfig, error: insertError } = await supabase
        .from("test_configurations")
        .insert({ test_id: testId })
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }

      return res.status(200).json({
        configuration: newConfig
      });
    }

    res.status(200).json({
      configuration: config
    });
  } catch (error) {
    next(error);
  }
}

export async function updateConfiguration(req, res, next) {
  try {
    const { testId } = req.params;
    const creatorId = req.user.id;

    // 1. Verify test ownership and draft status
    const { data: test, error: testError } = await supabase
      .from("tests")
      .select("id, status")
      .eq("id", testId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (testError) {
      return res.status(500).json({ error: testError.message });
    }

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    const allowedFields = [
      "participation_mode",
      "team_size",
      "team_scoring_method",
      "duration_minutes",
      "timing_rules",
      "navigation_mode",
      "randomize_questions",
      "randomize_options",
      "max_attempts",
      "negative_marking_enabled",
      "start_time",
      "end_time",
      "show_score",
      "show_correct_answers",
      "show_leaderboard",
      "participant_fields",
      "fullscreen_required",
      "violation_limit"
    ];

    const updates = {
      updated_at: new Date().toISOString()
    };

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Ensure team_size is null if participation_mode is INDIVIDUAL
    if (updates.participation_mode === "INDIVIDUAL") {
      updates.team_size = null;
    }

    // 2. Upsert / Update configuration
    const { data: existingConfig } = await supabase
      .from("test_configurations")
      .select("test_id")
      .eq("test_id", testId)
      .maybeSingle();

    let updatedConfig;

    if (existingConfig) {
      const { data, error } = await supabase
        .from("test_configurations")
        .update(updates)
        .eq("test_id", testId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      updatedConfig = data;
    } else {
      const { data, error } = await supabase
        .from("test_configurations")
        .insert({
          test_id: testId,
          ...updates
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      updatedConfig = data;
    }

    res.status(200).json({
      configuration: updatedConfig
    });
  } catch (error) {
    next(error);
  }
}
