import { supabase } from "../../config/supabase.js";
import { evaluateAttempt } from "../../services/evaluation.js";

function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function startAttempt(req, res, next) {
  try {
    const { testId, participantId, teamId } = req.body || {};

    if (!testId || !participantId) {
      return res.status(400).json({ error: "testId and participantId are required" });
    }

    // 1. Verify test exists and is published
    const { data: test, error: testError } = await supabase
      .from("tests")
      .select("id, title, status")
      .eq("id", testId)
      .maybeSingle();

    if (testError || !test) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    if (test.status !== "PUBLISHED") {
      return res.status(403).json({ error: "Assessment is not active" });
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

    // 3. Check attempt limit
    const { count: attemptCount, error: countError } = await supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("test_id", testId)
      .eq("participant_id", participantId);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    const maxAttempts = config?.max_attempts || 1;
    if (attemptCount >= maxAttempts) {
      return res.status(400).json({
        error: `Maximum attempts limit reached (${attemptCount}/${maxAttempts}).`
      });
    }

    // 4. Fetch questions
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, options, type, question_order")
      .eq("test_id", testId)
      .order("question_order", { ascending: true });

    if (qError || !questions || questions.length === 0) {
      return res.status(400).json({ error: "No questions found for this assessment" });
    }

    // 5. Build question ordering
    let orderedQuestions = [...questions];
    if (config?.randomize_questions) {
      orderedQuestions = shuffleArray(orderedQuestions);
    }
    const questionOrderIds = orderedQuestions.map((q) => q.id);

    // 6. Build option mappings if options are randomized
    const optionMaps = {};
    if (config?.randomize_options) {
      questions.forEach((q) => {
        if ((q.type === "MCQ" || q.type === "TRUE_FALSE") && Array.isArray(q.options)) {
          optionMaps[q.id] = shuffleArray(q.options);
        }
      });
    }

    // 7. Calculate server-authoritative timings
    const startedAt = new Date();
    let expiresAt = null;

    if (config?.duration_minutes && config.duration_minutes > 0) {
      expiresAt = new Date(startedAt.getTime() + config.duration_minutes * 60 * 1000);
    }

    if (config?.end_time) {
      const scheduleEnd = new Date(config.end_time);
      if (!expiresAt || scheduleEnd < expiresAt) {
        expiresAt = scheduleEnd;
      }
    }

    // 8. Insert new attempt
    const { data: attempt, error: insertError } = await supabase
      .from("attempts")
      .insert({
        test_id: testId,
        participant_id: participantId,
        team_id: teamId || null,
        status: "IN_PROGRESS",
        started_at: startedAt.toISOString(),
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        question_order: questionOrderIds,
        option_maps: optionMaps
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    res.status(201).json({
      message: "Attempt started successfully",
      attempt: {
        id: attempt.id,
        test_id: attempt.test_id,
        status: attempt.status,
        started_at: attempt.started_at,
        expires_at: attempt.expires_at,
        server_time: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttemptQuestions(req, res, next) {
  try {
    const { attemptId } = req.params;
    const participantId = req.query.participantId || req.headers["x-participant-id"];

    if (!participantId) {
      return res.status(401).json({ error: "Participant ID is required" });
    }

    // 1. Fetch attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("id, test_id, participant_id, status, started_at, expires_at, question_order, option_maps")
      .eq("id", attemptId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: "Assessment attempt not found" });
    }

    const now = new Date();

    // 2. Check if expired
    if (attempt.status === "IN_PROGRESS" && attempt.expires_at) {
      const expiresAt = new Date(attempt.expires_at);
      if (now > expiresAt) {
        // Auto submit expired attempt
        await supabase
          .from("attempts")
          .update({
            status: "SUBMITTED",
            submitted_at: attempt.expires_at
          })
          .eq("id", attemptId);

        attempt.status = "SUBMITTED";
      }
    }

    // 3. Fetch test configuration
    const { data: config } = await supabase
      .from("test_configurations")
      .select("navigation_mode, timing_rules, fullscreen_required, violation_limit")
      .eq("test_id", attempt.test_id)
      .maybeSingle();

    // 4. Fetch questions
    const { data: rawQuestions, error: qError } = await supabase
      .from("questions")
      .select("id, type, question_text, difficulty, topic, marks, negative_marks, options")
      .eq("test_id", attempt.test_id);

    if (qError) {
      return res.status(500).json({ error: qError.message });
    }

    // Index questions by ID
    const questionMap = new Map((rawQuestions || []).map((q) => [q.id, q]));

    // 5. Order questions by persisted attempt.question_order
    const orderedIds = Array.isArray(attempt.question_order) ? attempt.question_order : [];
    const sanitizedQuestions = [];

    orderedIds.forEach((qId, index) => {
      const q = questionMap.get(qId);
      if (q) {
        // Use randomized options if persisted for this attempt
        const options = attempt.option_maps?.[qId] || q.options || [];

        // STRICT SECURITY: Strip correct_answer, expected_answer, and rubric
        sanitizedQuestions.push({
          id: q.id,
          type: q.type,
          question_text: q.question_text,
          difficulty: q.difficulty,
          topic: q.topic,
          marks: q.marks,
          negative_marks: q.negative_marks,
          options: options,
          question_order: index + 1
        });
      }
    });

    // 6. Fetch saved answers for this attempt
    const { data: savedAnswers, error: aError } = await supabase
      .from("attempt_answers")
      .select("question_id, answer, time_spent_seconds, answered_at")
      .eq("attempt_id", attemptId);

    if (aError) {
      return res.status(500).json({ error: aError.message });
    }

    const answersMap = {};
    (savedAnswers || []).forEach((sa) => {
      answersMap[sa.question_id] = {
        answer: sa.answer,
        answered_at: sa.answered_at,
        time_spent_seconds: sa.time_spent_seconds
      };
    });

    res.status(200).json({
      attempt: {
        id: attempt.id,
        test_id: attempt.test_id,
        status: attempt.status,
        started_at: attempt.started_at,
        expires_at: attempt.expires_at,
        server_time: now.toISOString()
      },
      questions: sanitizedQuestions,
      saved_answers: answersMap,
      configuration: {
        navigation_mode: config?.navigation_mode || "FREE",
        timing_rules: config?.timing_rules || [],
        fullscreen_required: Boolean(config?.fullscreen_required),
        violation_limit: config?.violation_limit || 3
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function saveAnswer(req, res, next) {
  try {
    const { attemptId } = req.params;
    const { questionId, answer, participantId, timeSpentSeconds } = req.body || {};

    if (!questionId || !participantId) {
      return res.status(400).json({ error: "questionId and participantId are required" });
    }

    // 1. Verify attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("id, status, expires_at, participant_id")
      .eq("id", attemptId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return res.status(400).json({
        error: `Cannot save answer. Attempt is already ${attempt.status}.`
      });
    }

    // 2. Timing validation (with 15 second network grace period)
    const now = new Date();
    if (attempt.expires_at) {
      const expiresAt = new Date(attempt.expires_at);
      if (now.getTime() > expiresAt.getTime() + 15000) {
        // Mark submitted
        await supabase
          .from("attempts")
          .update({ status: "SUBMITTED", submitted_at: attempt.expires_at })
          .eq("id", attemptId);

        return res.status(403).json({
          error: "Assessment time has expired. Your attempt has been automatically submitted."
        });
      }
    }

    // 3. Upsert answer
    const { data: savedAnswer, error: upsertError } = await supabase
      .from("attempt_answers")
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          answer: answer !== undefined ? answer : null,
          time_spent_seconds: Number(timeSpentSeconds) || 0,
          answered_at: now.toISOString()
        },
        { onConflict: "attempt_id,question_id" }
      )
      .select()
      .single();

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message });
    }

    res.status(200).json({
      success: true,
      saved_at: savedAnswer.answered_at
    });
  } catch (error) {
    next(error);
  }
}

export async function submitAttempt(req, res, next) {
  try {
    const { attemptId } = req.params;
    const { participantId } = req.body || {};

    if (!participantId) {
      return res.status(400).json({ error: "participantId is required" });
    }

    // 1. Verify attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("id, status, test_id")
      .eq("id", attemptId)
      .eq("participant_id", participantId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    if (attempt.status === "SUBMITTED" || attempt.status === "EVALUATED") {
      return res.status(200).json({
        message: "Attempt is already submitted",
        attempt: { id: attempt.id, status: attempt.status }
      });
    }

    // 2. Mark SUBMITTED
    const now = new Date().toISOString();
    const { data: updatedAttempt, error: updateError } = await supabase
      .from("attempts")
      .update({
        status: "SUBMITTED",
        submitted_at: now
      })
      .eq("id", attemptId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    // 3. Trigger evaluation
    let evaluatedResult = updatedAttempt;
    try {
      evaluatedResult = await evaluateAttempt(attemptId);
    } catch (evalErr) {
      console.error("Auto evaluation warning:", evalErr);
    }

    res.status(200).json({
      message: "Assessment submitted successfully",
      attempt: {
        id: evaluatedResult.id,
        status: evaluatedResult.status,
        submitted_at: evaluatedResult.submitted_at,
        score: evaluatedResult.score,
        max_score: evaluatedResult.max_score,
        percentage: evaluatedResult.percentage
      }
    });
  } catch (error) {
    next(error);
  }
}
