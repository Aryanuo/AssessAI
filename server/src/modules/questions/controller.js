import { supabase } from "../../config/supabase.js";

import {
  generateQuestions
} from "../../services/gemini.js";

import {
  validateGeneratedQuestions
} from "./validation.js";

export async function generateTestQuestions(
  req,
  res,
  next
) {
  try {
    const { testId } = req.params;
    const creatorId = req.user.id;

    /*
     * 1. Verify test ownership
     */
    const {
      data: test,
      error: testError
    } = await supabase
      .from("tests")
      .select("id")
      .eq("id", testId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (testError) {
      console.error(
        "Test lookup error:",
        testError
      );

      return res.status(500).json({
        error: testError.message
      });
    }

    if (!test) {
      return res.status(404).json({
        error: "Test not found"
      });
    }

    /*
     * 2. Get latest uploaded document
     */
    const {
      data: document,
      error: documentError
    } = await supabase
      .from("documents")
      .select(
        "id, extracted_text, status"
      )
      .eq("test_id", testId)
      .order("created_at", {
        ascending: false
      })
      .limit(1)
      .maybeSingle();

    if (documentError) {
      console.error(
        "Document lookup error:",
        documentError
      );

      return res.status(500).json({
        error: documentError.message
      });
    }

    if (!document) {
      return res.status(404).json({
        error:
          "No document found for this test"
      });
    }

    if (!document.extracted_text) {
      return res.status(400).json({
        error:
          "Document has no extracted text"
      });
    }

    /*
     * 3. Send extracted text to Gemini
     */
    const aiResult =
      await generateQuestions(
        document.extracted_text
      );

    /*
     * 4. Validate Gemini output
     */
    const questions =
      validateGeneratedQuestions(
        aiResult.questions
      );

    if (questions.length === 0) {
      return res.status(400).json({
        error:
          "AI could not generate any questions"
      });
    }

    /*
     * 5. Delete previously generated
     *    questions for this test.
     */
    const {
      error: deleteError
    } = await supabase
      .from("questions")
      .delete()
      .eq("test_id", testId);

    if (deleteError) {
      console.error(
        "Question deletion error:",
        deleteError
      );

      return res.status(500).json({
        error: deleteError.message
      });
    }

    /*
     * 6. Convert AI objects into
     *    database objects.
     */
    const questionRows =
      questions.map(
        (question, index) => ({
          test_id: testId,

          type:
            question.type,

          question_text:
            question.question_text.trim(),

          difficulty:
            question.difficulty,

          topic:
            question.topic || null,

          marks:
            question.marks,

          negative_marks:
            question.negative_marks || 0,

          options:
            question.options || [],

          correct_answer:
            question.correct_answer
              ? question.correct_answer
              : null,

          expected_answer:
            question.expected_answer
              ? question.expected_answer
              : null,

          rubric:
            question.rubric || null,

          question_order:
            index + 1
        })
      );

    /*
     * 7. Insert questions
     */
    const {
      data: insertedQuestions,
      error: insertError
    } = await supabase
      .from("questions")
      .insert(questionRows)
      .select();

    if (insertError) {
      console.error(
        "Question insert error:",
        insertError
      );

      return res.status(500).json({
        error: insertError.message
      });
    }

    res.status(201).json({
      message:
        "Questions generated successfully",

      count:
        insertedQuestions.length,

      questions:
        insertedQuestions
    });

  } catch (error) {
    console.error(
      "Question generation error:",
      error
    );

    next(error);
  }
}

export async function getTestQuestions(req, res, next) {
  try {
    const { testId } = req.params;
    const creatorId = req.user.id;

    // Verify test ownership
    const { data: test, error: testError } =
      await supabase
        .from("tests")
        .select("id")
        .eq("id", testId)
        .eq("creator_id", creatorId)
        .maybeSingle();

    if (testError) {
      return res.status(500).json({
        error: testError.message
      });
    }

    if (!test) {
      return res.status(404).json({
        error: "Test not found"
      });
    }

    const {
      data: questions,
      error
    } = await supabase
      .from("questions")
      .select("*")
      .eq("test_id", testId)
      .order("question_order", {
        ascending: true
      });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    res.status(200).json({
      questions
    });

  } catch (error) {
    next(error);
  }
}

export async function updateQuestion(req, res, next) {
  try {
    console.log("UPDATE REQUEST");
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Body:", req.body);
    const { id } = req.params;
    const creatorId = req.user.id;

    const {
      type,
      question_text,
      difficulty,
      topic,
      marks,
      negative_marks,
      options,
      correct_answer,
      expected_answer,
      rubric
    } = req.body;

    /*
     * First find the question and make sure
     * its test belongs to this creator.
     */
    const {
      data: existingQuestion,
      error: findError
    } = await supabase
      .from("questions")
      .select(`
        id,
        test_id,
        tests!inner(creator_id)
      `)
      .eq("id", id)
      .eq(
        "tests.creator_id",
        creatorId
      )
      .maybeSingle();

    if (findError) {
      return res.status(500).json({
        error: findError.message
      });
    }

    if (!existingQuestion) {
      return res.status(404).json({
        error: "Question not found"
      });
    }

    const updates = {};

    if (type !== undefined)
      updates.type = type;

    if (question_text !== undefined)
      updates.question_text =
        question_text.trim();

    if (difficulty !== undefined)
      updates.difficulty = difficulty;

    if (topic !== undefined)
      updates.topic = topic;

    if (marks !== undefined)
      updates.marks = marks;

    if (negative_marks !== undefined)
      updates.negative_marks =
        negative_marks;

    if (options !== undefined)
      updates.options = options;

    if (correct_answer !== undefined)
      updates.correct_answer =
        correct_answer;

    if (expected_answer !== undefined)
      updates.expected_answer =
        expected_answer;

    if (rubric !== undefined)
      updates.rubric = rubric;

    const {
      data: question,
      error
    } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    res.status(200).json({
      question
    });

  } catch (error) {
    next(error);
  }
}

export async function deleteQuestion(req, res, next) {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;

    const {
      data: existingQuestion,
      error: findError
    } = await supabase
      .from("questions")
      .select(`
        id,
        test_id,
        tests!inner(creator_id)
      `)
      .eq("id", id)
      .eq(
        "tests.creator_id",
        creatorId
      )
      .maybeSingle();

    if (findError) {
      return res.status(500).json({
        error: findError.message
      });
    }

    if (!existingQuestion) {
      return res.status(404).json({
        error: "Question not found"
      });
    }

    const {
      error
    } = await supabase
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    res.status(200).json({
      message:
        "Question deleted successfully"
    });

  } catch (error) {
    next(error);
  }
}

export async function createQuestion(
  req,
  res,
  next
) {
  try {
    const { testId } = req.params;
    const creatorId = req.user.id;

    const {
      type,
      question_text,
      difficulty,
      topic,
      marks,
      negative_marks,
      options,
      correct_answer,
      expected_answer,
      rubric
    } = req.body || {};

    const {
      data: test,
      error: testError
    } = await supabase
      .from("tests")
      .select("id")
      .eq("id", testId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (testError) {
      return res.status(500).json({
        error: testError.message
      });
    }

    if (!test) {
      return res.status(404).json({
        error: "Test not found"
      });
    }

    if (
      !type ||
      !question_text ||
      !difficulty ||
      !marks
    ) {
      return res.status(400).json({
        error:
          "type, question_text, difficulty and marks are required"
      });
    }

    const {
      data: lastQuestion,
      error: orderError
    } = await supabase
      .from("questions")
      .select("question_order")
      .eq("test_id", testId)
      .order("question_order", {
        ascending: false
      })
      .limit(1)
      .maybeSingle();

    if (orderError) {
      return res.status(500).json({
        error: orderError.message
      });
    }

    const nextOrder =
      lastQuestion
        ? lastQuestion.question_order + 1
        : 1;

    const {
      data: question,
      error
    } = await supabase
      .from("questions")
      .insert({
        test_id: testId,
        type,
        question_text:
          question_text.trim(),
        difficulty,
        topic: topic || null,
        marks,
        negative_marks:
          negative_marks || 0,
        options: options || [],
        correct_answer:
          correct_answer ?? null,
        expected_answer:
          expected_answer || null,
        rubric:
          rubric || null,
        question_order:
          nextOrder
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    res.status(201).json({
      question
    });

  } catch (error) {
    next(error);
  }
}

export async function reorderQuestions(
  req,
  res,
  next
) {
  try {
    const { testId } = req.params;
    const creatorId = req.user.id;

    const { questionIds } = req.body;

    if (!Array.isArray(questionIds)) {
      return res.status(400).json({
        error:
          "questionIds must be an array"
      });
    }

    /*
     * Verify test ownership
     */
    const {
      data: test,
      error: testError
    } = await supabase
      .from("tests")
      .select("id")
      .eq("id", testId)
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (testError) {
      return res.status(500).json({
        error: testError.message
      });
    }

    if (!test) {
      return res.status(404).json({
        error: "Test not found"
      });
    }

    /*
     * Make sure all submitted questions
     * actually belong to this test.
     */
    const {
      data: existingQuestions,
      error: questionError
    } = await supabase
      .from("questions")
      .select("id")
      .eq("test_id", testId);

    if (questionError) {
      return res.status(500).json({
        error: questionError.message
      });
    }

    const existingIds =
      new Set(
        existingQuestions.map(
          (question) =>
            question.id
        )
      );

    if (
      questionIds.length !==
      existingIds.size
    ) {
      return res.status(400).json({
        error:
          "Question list does not match test questions"
      });
    }

    for (const id of questionIds) {
      if (!existingIds.has(id)) {
        return res.status(400).json({
          error:
            "Invalid question ID"
        });
      }
    }

    /*
     * Update each question's order.
     */
    for (
      let index = 0;
      index < questionIds.length;
      index++
    ) {
      const { error } =
        await supabase
          .from("questions")
          .update({
            question_order:
              index + 1
          })
          .eq(
            "id",
            questionIds[index]
          )
          .eq(
            "test_id",
            testId
          );

      if (error) {
        return res.status(500).json({
          error: error.message
        });
      }
    }

    res.status(200).json({
      message:
        "Questions reordered successfully"
    });

  } catch (error) {
    next(error);
  }
}