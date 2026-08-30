import { supabase } from "../../config/supabase.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRandomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARS.length);
    code += CODE_CHARS[randomIndex];
  }
  return code;
}

export async function publishTest(req, res, next) {
  try {
    const { id: testId } = req.params;
    const creatorId = req.user.id;

    // 1. Fetch test
    const { data: test, error: testError } = await supabase
      .from("tests")
      .select("*")
      .eq("id", testId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (testError) {
      return res.status(500).json({ error: testError.message });
    }

    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }

    // 2. Fetch questions
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("*")
      .eq("test_id", testId)
      .order("question_order", { ascending: true });

    if (questionsError) {
      return res.status(500).json({ error: questionsError.message });
    }

    const validationErrors = [];

    // Check title
    if (!test.title || !test.title.trim()) {
      validationErrors.push("Test must have a title");
    }

    // Check question count
    if (!questions || questions.length === 0) {
      validationErrors.push("Test must contain at least one question before publishing");
    } else {
      // Validate each question
      questions.forEach((q, idx) => {
        const qNum = q.question_order || idx + 1;

        if (!q.question_text || !q.question_text.trim()) {
          validationErrors.push(`Question #${qNum} is missing question text`);
        }

        if (!q.marks || Number(q.marks) <= 0) {
          validationErrors.push(`Question #${qNum} must have positive marks (> 0)`);
        }

        if (q.type === "MCQ") {
          const opts = Array.isArray(q.options) ? q.options : [];
          if (opts.length < 2) {
            validationErrors.push(`Question #${qNum} (MCQ) must have at least 2 options`);
          }
          if (!q.correct_answer || !q.correct_answer.trim()) {
            validationErrors.push(`Question #${qNum} (MCQ) must have a correct answer selected`);
          }
        } else if (q.type === "TRUE_FALSE") {
          if (!q.correct_answer || !q.correct_answer.trim()) {
            validationErrors.push(`Question #${qNum} (True/False) must have a correct answer selected`);
          }
        } else if (q.type === "SHORT_ANSWER") {
          if (!q.expected_answer || !q.expected_answer.trim()) {
            validationErrors.push(`Question #${qNum} (Short Answer) must have an expected answer`);
          }
        } else if (q.type === "LONG_ANSWER") {
          if (!q.expected_answer || !q.expected_answer.trim()) {
            validationErrors.push(`Question #${qNum} (Long Answer) must have an expected answer or key points`);
          }
        }
      });
    }

    // 3. Fetch and validate configuration
    const { data: config, error: configError } = await supabase
      .from("test_configurations")
      .select("*")
      .eq("test_id", testId)
      .maybeSingle();

    if (configError) {
      return res.status(500).json({ error: configError.message });
    }

    if (config) {
      if (config.participation_mode === "TEAM") {
        if (!config.team_size || Number(config.team_size) < 2) {
          validationErrors.push("Team assessment requires a fixed team size of at least 2");
        }
      }

      if (config.start_time && config.end_time) {
        const start = new Date(config.start_time);
        const end = new Date(config.end_time);
        if (end <= start) {
          validationErrors.push("Schedule end time must be after start time");
        }
      }

      if (config.end_time) {
        const end = new Date(config.end_time);
        if (end <= new Date()) {
          validationErrors.push("Schedule end time is in the past. Update the schedule before publishing.");
        }
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Validation failed. Please fix the following errors before publishing:",
        validationErrors
      });
    }

    // 4. Generate unique test_code
    let testCode = test.test_code;
    if (!testCode) {
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        attempts++;
        const candidate = generateRandomCode(6);
        const { data: existing } = await supabase
          .from("tests")
          .select("id")
          .eq("test_code", candidate)
          .maybeSingle();

        if (!existing) {
          testCode = candidate;
          isUnique = true;
        }
      }

      if (!isUnique) {
        // Fallback to UUID-based short code
        testCode = crypto.randomUUID().slice(0, 8).toUpperCase();
      }
    }

    // 5. Update test status to PUBLISHED
    const { data: publishedTest, error: updateError } = await supabase
      .from("tests")
      .update({
        status: "PUBLISHED",
        test_code: testCode
      })
      .eq("id", testId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.status(200).json({
      message: "Test published successfully",
      test: publishedTest
    });
  } catch (error) {
    next(error);
  }
}
