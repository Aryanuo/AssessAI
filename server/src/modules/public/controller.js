import { supabase } from "../../config/supabase.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getPublicTest(req, res, next) {
  try {
    const { testCode } = req.params;

    if (!testCode || typeof testCode !== "string") {
      return res.status(400).json({ error: "Test code is required" });
    }

    const cleanCode = testCode.trim();

    // 1. Fetch test by test_code or ID
    let query = supabase
      .from("tests")
      .select("id, title, description, instructions, status, test_code, created_at");

    if (UUID_REGEX.test(cleanCode)) {
      query = query.or(`id.eq.${cleanCode},test_code.eq.${cleanCode.toUpperCase()}`);
    } else {
      query = query.eq("test_code", cleanCode.toUpperCase());
    }

    const { data: test, error: testError } = await query.maybeSingle();

    if (testError) {
      return res.status(500).json({ error: testError.message });
    }

    if (!test) {
      return res.status(404).json({ error: "Assessment not found with the provided code." });
    }

    if (test.status !== "PUBLISHED") {
      return res.status(403).json({
        error: "This assessment is currently not available for participation (Status: " + test.status + ")."
      });
    }

    // 2. Fetch configuration (public safe fields only)
    const { data: config, error: configError } = await supabase
      .from("test_configurations")
      .select(
        "participation_mode, team_size, team_scoring_method, duration_minutes, timing_rules, navigation_mode, start_time, end_time, participant_fields, fullscreen_required"
      )
      .eq("test_id", test.id)
      .maybeSingle();

    if (configError) {
      return res.status(500).json({ error: configError.message });
    }

    const now = new Date();

    // 3. Schedule checks
    let isUpcoming = false;
    let isEnded = false;

    if (config?.start_time) {
      const start = new Date(config.start_time);
      if (now < start) {
        isUpcoming = true;
      }
    }

    if (config?.end_time) {
      const end = new Date(config.end_time);
      if (now > end) {
        isEnded = true;
      }
    }

    // 4. Fetch question stats (count & total marks) WITHOUT exposing questions or answers
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, marks")
      .eq("test_id", test.id);

    if (qError) {
      return res.status(500).json({ error: qError.message });
    }

    const totalQuestions = questions?.length || 0;
    const totalMarks = (questions || []).reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

    res.status(200).json({
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        instructions: test.instructions,
        test_code: test.test_code,
        status: test.status,
        total_questions: totalQuestions,
        total_marks: totalMarks
      },
      configuration: {
        participation_mode: config?.participation_mode || "INDIVIDUAL",
        team_size: config?.team_size || null,
        team_scoring_method: config?.team_scoring_method || "AVERAGE",
        duration_minutes: config?.duration_minutes || null,
        timing_rules: config?.timing_rules || [],
        navigation_mode: config?.navigation_mode || "FREE",
        start_time: config?.start_time || null,
        end_time: config?.end_time || null,
        participant_fields: config?.participant_fields || [],
        fullscreen_required: Boolean(config?.fullscreen_required)
      },
      schedule_status: {
        is_upcoming: isUpcoming,
        is_ended: isEnded,
        current_time: now.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}
