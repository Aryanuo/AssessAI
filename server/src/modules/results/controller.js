import { supabase } from "../../config/supabase.js";

export async function getTestResults(req, res, next) {
  try {
    const { testId } = req.params;
    const creatorId = req.user.id;

    // 1. Verify test ownership
    const { data: test, error: testError } = await supabase
      .from("tests")
      .select("id, title, status, created_at")
      .eq("id", testId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (testError || !test) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // 2. Fetch all attempts with participant and team info
    const { data: attempts, error: attemptsError } = await supabase
      .from("attempts")
      .select(`
        id,
        status,
        started_at,
        expires_at,
        submitted_at,
        score,
        max_score,
        percentage,
        created_at,
        participant:participants (
          id,
          name,
          email,
          custom_fields
        ),
        team:teams (
          id,
          team_code,
          team_name
        )
      `)
      .eq("test_id", testId)
      .order("created_at", { ascending: false });

    if (attemptsError) {
      return res.status(500).json({ error: attemptsError.message });
    }

    // 3. Compute summary statistics
    const allAttempts = attempts || [];
    const completedAttempts = allAttempts.filter(
      (a) => a.status === "EVALUATED" || a.status === "SUBMITTED"
    );

    let totalScoreSum = 0;
    let totalPercentageSum = 0;
    let highestScore = 0;
    let lowestScore = null;
    let maxPossibleScore = 0;

    completedAttempts.forEach((a) => {
      const score = Number(a.score) || 0;
      const pct = Number(a.percentage) || 0;
      const maxScore = Number(a.max_score) || 0;

      totalScoreSum += score;
      totalPercentageSum += pct;
      if (maxScore > maxPossibleScore) maxPossibleScore = maxScore;

      if (score > highestScore) highestScore = score;
      if (lowestScore === null || score < lowestScore) lowestScore = score;
    });

    const evaluatedCount = completedAttempts.length;
    const averageScore = evaluatedCount > 0 ? Number((totalScoreSum / evaluatedCount).toFixed(2)) : 0;
    const averagePercentage = evaluatedCount > 0 ? Number((totalPercentageSum / evaluatedCount).toFixed(2)) : 0;

    const analytics = {
      total_attempts: allAttempts.length,
      completed_attempts: evaluatedCount,
      in_progress_attempts: allAttempts.length - evaluatedCount,
      average_score: averageScore,
      average_percentage: averagePercentage,
      highest_score: highestScore,
      lowest_score: lowestScore !== null ? lowestScore : 0,
      max_possible_score: maxPossibleScore
    };

    res.status(200).json({
      test: {
        id: test.id,
        title: test.title,
        status: test.status
      },
      analytics,
      attempts: allAttempts
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttemptDetail(req, res, next) {
  try {
    const { testId, attemptId } = req.params;
    const creatorId = req.user.id;

    // 1. Verify test ownership
    const { data: test, error: testError } = await supabase
      .from("tests")
      .select("id, title")
      .eq("id", testId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (testError || !test) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // 2. Fetch attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select(`
        id,
        test_id,
        participant_id,
        team_id,
        status,
        started_at,
        expires_at,
        submitted_at,
        score,
        max_score,
        percentage,
        question_order,
        option_maps,
        created_at,
        participant:participants (
          id,
          name,
          email,
          custom_fields
        ),
        team:teams (
          id,
          team_code,
          team_name
        )
      `)
      .eq("id", attemptId)
      .eq("test_id", testId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    // 3. Fetch questions (all fields including correct_answer and rubric for creator view)
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .eq("test_id", testId);

    if (qError) {
      return res.status(500).json({ error: qError.message });
    }

    const questionMap = new Map((questions || []).map((q) => [q.id, q]));

    // 4. Fetch attempt answers
    const { data: answers, error: aError } = await supabase
      .from("attempt_answers")
      .select("*")
      .eq("attempt_id", attemptId);

    if (aError) {
      return res.status(500).json({ error: aError.message });
    }

    const answersMap = new Map((answers || []).map((a) => [a.question_id, a]));

    // 5. Build question-level breakdown
    const orderedIds = Array.isArray(attempt.question_order)
      ? attempt.question_order
      : (questions || []).map((q) => q.id);

    const questionBreakdown = [];

    orderedIds.forEach((qId, index) => {
      const q = questionMap.get(qId);
      if (q) {
        const studentAnsObj = answersMap.get(qId);
        const presentedOptions = attempt.option_maps?.[qId] || q.options;

        questionBreakdown.push({
          question_id: q.id,
          question_order: index + 1,
          type: q.type,
          question_text: q.question_text,
          difficulty: q.difficulty,
          topic: q.topic,
          marks: q.marks,
          negative_marks: q.negative_marks,
          options: presentedOptions,
          correct_answer: q.correct_answer,
          expected_answer: q.expected_answer,
          rubric: q.rubric,
          student_answer: studentAnsObj?.answer !== undefined ? studentAnsObj.answer : null,
          awarded_score: studentAnsObj?.score !== undefined ? studentAnsObj.score : 0,
          max_score: studentAnsObj?.max_score !== undefined ? studentAnsObj.max_score : q.marks,
          feedback: studentAnsObj?.feedback || (studentAnsObj ? "Evaluated" : "Unanswered"),
          ai_confidence: studentAnsObj?.ai_confidence || "HIGH",
          time_spent_seconds: studentAnsObj?.time_spent_seconds || 0
        });
      }
    });

    res.status(200).json({
      test: {
        id: test.id,
        title: test.title
      },
      attempt,
      questions: questionBreakdown
    });
  } catch (error) {
    next(error);
  }
}
