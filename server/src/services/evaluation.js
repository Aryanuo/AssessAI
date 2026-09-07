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
    let pendingReviewCount = 0;

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

          if (confidence === "PENDING_REVIEW") {
            pendingReviewCount++;
          }
        }
      }

      if (typeof score === "number" && !isNaN(score)) {
        totalScore += score;
      }

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
    const finalStatus = pendingReviewCount > 0 ? "NEEDS_REVIEW" : "EVALUATED";

    // 6. Update attempt record
    const { data: updatedAttempt, error: updateError } = await supabase
      .from("attempts")
      .update({
        status: finalStatus,
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

/**
 * Re-evaluates only answers that are in PENDING_REVIEW status for a specific attempt.
 */
export async function reEvaluatePendingAnswers(attemptId) {
  try {
    // 1. Fetch attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("id, test_id, score, max_score, status")
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptError || !attempt) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    // 2. Fetch all pending answers for this attempt
    const { data: pendingAnswers, error: paError } = await supabase
      .from("attempt_answers")
      .select("*")
      .eq("attempt_id", attemptId)
      .eq("ai_confidence", "PENDING_REVIEW");

    if (paError) {
      throw new Error(`Failed to load pending answers: ${paError.message}`);
    }

    if (!pendingAnswers || pendingAnswers.length === 0) {
      // Ensure attempt status is EVALUATED
      const { data: resolvedAttempt } = await supabase
        .from("attempts")
        .update({ status: "EVALUATED" })
        .eq("id", attemptId)
        .select()
        .single();

      return {
        evaluated: 0,
        still_pending: 0,
        total_pending: 0,
        message: "No pending questions found to evaluate.",
        attempt: resolvedAttempt || attempt
      };
    }

    // 3. Fetch questions for these pending answers
    const questionIds = pendingAnswers.map((pa) => pa.question_id);
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, type, question_text, marks, expected_answer, rubric")
      .in("id", questionIds);

    if (qError) {
      throw new Error(`Failed to load questions: ${qError.message}`);
    }

    const questionMap = new Map((questions || []).map((q) => [q.id, q]));
    let evaluatedCount = 0;
    let stillPendingCount = 0;

    // 4. Try re-evaluating each pending answer
    for (const pa of pendingAnswers) {
      const q = questionMap.get(pa.question_id);
      if (!q) continue;

      const studentAnsText = typeof pa.answer === "string" ? pa.answer.trim() : "";
      const qMarks = Number(q.marks) || 1;

      if (!studentAnsText) {
        await supabase
          .from("attempt_answers")
          .update({
            score: 0,
            max_score: qMarks,
            feedback: "Unanswered",
            ai_confidence: "HIGH"
          })
          .eq("id", pa.id);
        evaluatedCount++;
        continue;
      }

      const aiResult = await evaluateAnswerWithGemini({
        questionText: q.question_text,
        questionType: q.type,
        studentAnswer: studentAnsText,
        expectedAnswer: q.expected_answer,
        rubric: q.rubric,
        maxMarks: qMarks
      });

      if (aiResult.confidence !== "PENDING_REVIEW" && typeof aiResult.score === "number") {
        await supabase
          .from("attempt_answers")
          .update({
            score: aiResult.score,
            max_score: qMarks,
            feedback: aiResult.feedback,
            ai_confidence: aiResult.confidence
          })
          .eq("id", pa.id);
        evaluatedCount++;
      } else {
        stillPendingCount++;
      }
    }

    // 5. Recalculate full score for this attempt
    const { data: allAnswers, error: allAnsError } = await supabase
      .from("attempt_answers")
      .select("score, max_score, ai_confidence")
      .eq("attempt_id", attemptId);

    if (allAnsError) {
      throw new Error(`Failed to recalculate attempt score: ${allAnsError.message}`);
    }

    let totalScore = 0;
    let maxScore = 0;
    let hasPending = false;

    (allAnswers || []).forEach((ans) => {
      if (ans.ai_confidence === "PENDING_REVIEW") {
        hasPending = true;
      }
      if (typeof ans.score === "number" && !isNaN(ans.score)) {
        totalScore += ans.score;
      }
      if (typeof ans.max_score === "number" && !isNaN(ans.max_score)) {
        maxScore += ans.max_score;
      }
    });

    const finalScore = Math.max(0, Number(totalScore.toFixed(2)));
    const percentage = maxScore > 0 ? Number(((finalScore / maxScore) * 100).toFixed(2)) : 0;
    const newStatus = hasPending ? "NEEDS_REVIEW" : "EVALUATED";

    const { data: updatedAttempt, error: updateError } = await supabase
      .from("attempts")
      .update({
        status: newStatus,
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

    const totalPending = pendingAnswers.length;
    let message = "";
    if (stillPendingCount > 0) {
      if (evaluatedCount > 0) {
        message = `Gemini is busy and has evaluated ${evaluatedCount} out of ${totalPending} pending questions (${stillPendingCount} still pending). You can try again after sometime.`;
      } else {
        message = `Gemini is currently busy or experiencing high traffic. 0 of ${totalPending} questions evaluated. Please try again after sometime.`;
      }
    } else {
      message = `Successfully evaluated all ${evaluatedCount} pending question${evaluatedCount > 1 ? "s" : ""}! Score updated to ${finalScore} / ${maxScore}.`;
    }

    return {
      evaluated: evaluatedCount,
      still_pending: stillPendingCount,
      total_pending: totalPending,
      message,
      attempt: updatedAttempt
    };
  } catch (error) {
    console.error("Re-evaluation error:", error);
    throw error;
  }
}
