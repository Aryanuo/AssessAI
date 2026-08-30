import { supabase } from "../config/supabase.js";
import { evaluateAnswerWithGemini } from "./gemini.js";

export async function evaluateAttempt(attemptId) {
  try {
    // 1. Fetch attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("id, test_id, participant_id, status")
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptError || !attempt) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    // 2. Fetch test configuration
    const { data: config } = await supabase
      .from("test_configurations")
      .select("negative_marking_enabled")
      .eq("test_id", attempt.test_id)
      .maybeSingle();

    const negativeMarkingEnabled = config?.negative_marking_enabled !== false;

    // 3. Fetch all test questions
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .eq("test_id", attempt.test_id);

    if (qError || !questions) {
      throw new Error(`Failed to load questions for test ${attempt.test_id}`);
    }

    // 4. Fetch all answers submitted for this attempt
    const { data: submittedAnswers, error: aError } = await supabase
      .from("attempt_answers")
      .select("*")
      .eq("attempt_id", attemptId);

    if (aError) {
      throw new Error(`Failed to load answers for attempt ${attemptId}`);
    }

    const answerMap = new Map();
    (submittedAnswers || []).forEach((a) => {
      answerMap.set(a.question_id, a);
    });

    let totalScore = 0;
    let maxScore = 0;

    // 5. Evaluate each question
    for (const q of questions) {
      const qMarks = Number(q.marks) || 1;
      const qNegMarks = Number(q.negative_marks) || 0;
      maxScore += qMarks;

      const userAnsObj = answerMap.get(q.id);
      const userAnsRaw = userAnsObj?.answer;

      let score = 0;
      let feedback = "";
      let confidence = "HIGH";

      if (q.type === "MCQ" || q.type === "TRUE_FALSE") {
        if (userAnsRaw === undefined || userAnsRaw === null || String(userAnsRaw).trim() === "") {
          score = 0;
          feedback = "Unanswered";
        } else {
          const studentAns = String(userAnsRaw).trim();
          const correctAns = String(q.correct_answer || "").trim();

          // Check direct label match ("A" === "A") or text match
          let isCorrect = studentAns.toUpperCase() === correctAns.toUpperCase();

          if (!isCorrect && Array.isArray(q.options)) {
            // Check if correct_answer was label and student submitted text, or vice versa
            const correctOpt = q.options.find(
              (opt) => typeof opt === "object" && (opt.label === correctAns || opt.text === correctAns)
            );
            if (correctOpt) {
              isCorrect = studentAns === correctOpt.label || studentAns === correctOpt.text;
            }
          }

          if (isCorrect) {
            score = qMarks;
            feedback = "Correct answer";
          } else {
            score = negativeMarkingEnabled ? -qNegMarks : 0;
            feedback = "Incorrect answer";
          }
        }
      } else if (q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") {
        const studentAnsText = typeof userAnsRaw === "string" ? userAnsRaw.trim() : "";

        if (!studentAnsText) {
          score = 0;
          feedback = "Unanswered";
        } else {
          const aiResult = await evaluateAnswerWithGemini({
            questionText: q.question_text,
            questionType: q.type,
            studentAnswer: studentAnsText,
            expectedAnswer: q.expected_answer,
            rubric: q.rubric,
            maxMarks: qMarks
          });

          score = aiResult.score;
          feedback = aiResult.feedback;
          confidence = aiResult.confidence;
        }
      }

      totalScore += score;

      // Upsert evaluation in attempt_answers
      await supabase
        .from("attempt_answers")
        .upsert(
          {
            attempt_id: attemptId,
            question_id: q.id,
            answer: userAnsRaw !== undefined ? userAnsRaw : null,
            score: score,
            max_score: qMarks,
            feedback: feedback,
            ai_confidence: confidence,
            answered_at: userAnsObj?.answered_at || new Date().toISOString()
          },
          { onConflict: "attempt_id,question_id" }
        );
    }

    // Clamp minimum total score to 0 if negative marking exceeded earned points
    const finalScore = Math.max(0, Number(totalScore.toFixed(2)));
    const percentage = maxScore > 0 ? Number(((finalScore / maxScore) * 100).toFixed(2)) : 0;

    // 6. Update attempt record
    const { data: updatedAttempt, error: updateError } = await supabase
      .from("attempts")
      .update({
        status: "EVALUATED",
        score: finalScore,
        max_score: maxScore,
        percentage: percentage
      })
      .eq("id", attemptId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return updatedAttempt;
  } catch (error) {
    console.error("Evaluation execution error:", error);
    throw error;
  }
}
