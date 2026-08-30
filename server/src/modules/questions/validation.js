const VALID_TYPES = [
  "MCQ",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "LONG_ANSWER"
];

const VALID_DIFFICULTIES = [
  "EASY",
  "MEDIUM",
  "HARD"
];

export function validateGeneratedQuestions(
  questions
) {
  if (!Array.isArray(questions)) {
    throw new Error(
      "AI output must contain a questions array"
    );
  }

  return questions.map(
    (question, index) => {

      if (
        !VALID_TYPES.includes(
          question.type
        )
      ) {
        throw new Error(
          `Invalid question type at index ${index}`
        );
      }

      if (
        !VALID_DIFFICULTIES.includes(
          question.difficulty
        )
      ) {
        throw new Error(
          `Invalid difficulty at index ${index}`
        );
      }

      if (
        typeof question.question_text !==
          "string" ||
        !question.question_text.trim()
      ) {
        throw new Error(
          `Invalid question text at index ${index}`
        );
      }

      if (
        typeof question.marks !== "number" ||
        question.marks <= 0
      ) {
        throw new Error(
          `Invalid marks at index ${index}`
        );
      }

      if (
        typeof question.negative_marks !==
          "number" ||
        question.negative_marks < 0
      ) {
        throw new Error(
          `Invalid negative marks at index ${index}`
        );
      }

      if (
        !Array.isArray(
          question.options
        )
      ) {
        throw new Error(
          `Invalid options at index ${index}`
        );
      }

      /*
       * MCQ
       */
      if (
        question.type === "MCQ"
      ) {
        if (
          question.options.length !== 4
        ) {
          throw new Error(
            `MCQ at index ${index} must have 4 options`
          );
        }

        if (
          !["A", "B", "C", "D"].includes(
            question.correct_answer
          )
        ) {
          throw new Error(
            `MCQ at index ${index} has invalid correct answer`
          );
        }
      }

      /*
       * TRUE / FALSE
       */
      if (
        question.type === "TRUE_FALSE"
      ) {
        if (
          question.options.length !== 2
        ) {
          throw new Error(
            `TRUE_FALSE at index ${index} must have 2 options`
          );
        }

        if (
          !["A", "B"].includes(
            question.correct_answer
          )
        ) {
          throw new Error(
            `TRUE_FALSE at index ${index} has invalid correct answer`
          );
        }
      }

      /*
       * SHORT / LONG ANSWER
       */
      if (
        question.type ===
          "SHORT_ANSWER" ||
        question.type ===
          "LONG_ANSWER"
      ) {
        if (
          question.options.length !== 0
        ) {
          throw new Error(
            `${question.type} at index ${index} must have no options`
          );
        }

        if (
          typeof question.expected_answer !==
            "string" ||
          !question.expected_answer.trim()
        ) {
          throw new Error(
            `${question.type} at index ${index} must have an expected answer`
          );
        }
      }

      return question;
    }
  );
}