import {
  GoogleGenerativeAI
} from "@google/generative-ai";

import { env } from "../config/env.js";

if (!env.geminiApiKey) {
  throw new Error(
    "GEMINI_API_KEY is not configured"
  );
}

const genAI =
  new GoogleGenerativeAI(
    env.geminiApiKey
  );

// Fallback model chain: tries each in order until one succeeds
const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite"
];

async function generateContentWithFallback(prompt) {
  let lastError;
  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`[Gemini] Trying model: ${modelName}`);
      const m = genAI.getGenerativeModel({ model: modelName });
      const result = await m.generateContent(prompt);
      console.log(`[Gemini] Success with model: ${modelName}`);
      return result;
    } catch (err) {
      console.warn(`[Gemini] Model ${modelName} failed: ${err.message}`);
      lastError = err;
    }
  }
  throw new Error(
    `All Gemini models failed. Last error: ${lastError?.message}`
  );
}

export async function generateQuestions(
  extractedText
) {
  const prompt = `
You are an assessment question extraction system.

Convert the supplied educational document into
structured assessment questions.

IMPORTANT:
- Return ONLY valid JSON.
- Do not return markdown.
- Do not wrap JSON in triple backticks.
- Do not invent information that is not supported
  by the document.
- Create questions only from the supplied content.
- Correct answers must be derived from the document.

Allowed question types:

MCQ
TRUE_FALSE
SHORT_ANSWER
LONG_ANSWER

Return exactly this structure:

{
  "questions": [
    {
      "type": "MCQ",
      "question_text": "Question text",
      "difficulty": "EASY",
      "topic": "Topic",
      "marks": 1,
      "negative_marks": 0,
      "options": [
        {
          "label": "A",
          "text": "Option A"
        },
        {
          "label": "B",
          "text": "Option B"
        },
        {
          "label": "C",
          "text": "Option C"
        },
        {
          "label": "D",
          "text": "Option D"
        }
      ],
      "correct_answer": "A",
      "expected_answer": null,
      "rubric": null
    }
  ]
}

Rules:

1. MCQ:
   - Exactly 4 options.
   - correct_answer must be A, B, C, or D.
   - expected_answer must be null.
   - rubric must be null.

2. TRUE_FALSE:
   - options must contain:
     A = True
     B = False.
   - correct_answer must be A or B.
   - expected_answer must be null.
   - rubric must be null.

3. SHORT_ANSWER:
   - options must be [].
   - correct_answer must be null.
   - expected_answer must contain the expected answer.
   - rubric may contain useful evaluation guidance.

4. LONG_ANSWER:
   - options must be [].
   - correct_answer must be null.
   - expected_answer must contain the expected answer or key points.
   - rubric must contain evaluation criteria.

5. difficulty must be:
   EASY
   MEDIUM
   HARD

6. marks must be a positive number.

7. negative_marks must be a number >= 0.

8. topic should identify the topic covered by
   the question.

9. If the document does not contain enough
   information to create a question, do not
   create that question.

DOCUMENT:


${extractedText}
`;

  const result = await generateContentWithFallback(prompt);
  const text = result.response.text();
  return parseGeminiJson(text);
}

function parseGeminiJson(text) {
  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(
      "Gemini returned invalid JSON"
    );
  }
}

export async function evaluateAnswerWithGemini({
  questionText,
  questionType,
  studentAnswer,
  expectedAnswer,
  rubric,
  maxMarks
}) {
  if (!studentAnswer || !studentAnswer.trim()) {
    return {
      score: 0,
      max_score: maxMarks,
      feedback: "No answer provided.",
      confidence: "HIGH"
    };
  }

  const prompt = `
You are an expert assessment evaluator. Evaluate the student's answer objectively and construct structured feedback.

Question: ${questionText}
Question Type: ${questionType}
Maximum Marks: ${maxMarks}
Expected Answer / Key Points: ${expectedAnswer || "Not provided"}
Evaluation Rubric: ${typeof rubric === "string" ? rubric : JSON.stringify(rubric || {})}

Student's Submitted Answer:
"""
${studentAnswer}
"""

INSTRUCTIONS:
1. Assign an accurate score between 0 and ${maxMarks} (decimals allowed, e.g. 2.5, 4.0).
2. For LONG_ANSWER questions, score strictly based on the provided Rubric criteria where available.
3. For SHORT_ANSWER questions, check accuracy and completeness against the Expected Answer.
4. Provide concise, constructive feedback explaining what points were covered well and what was missing.
5. Set confidence to "HIGH", "MEDIUM", or "LOW".

Return ONLY a valid JSON object in this exact format (no markdown, no backticks):
{
  "score": 4,
  "max_score": ${maxMarks},
  "feedback": "Concise feedback here",
  "confidence": "HIGH"
}
`;

  try {
    const result = await generateContentWithFallback(prompt);
    const text = result.response.text();
    const parsed = parseGeminiJson(text);

    const score = Math.max(0, Math.min(Number(parsed.score) || 0, maxMarks));

    return {
      score: score,
      max_score: maxMarks,
      feedback: parsed.feedback || "Evaluation complete",
      confidence: ["HIGH", "MEDIUM", "LOW"].includes(parsed.confidence) ? parsed.confidence : "HIGH"
    };
  } catch (error) {
    console.error("Gemini evaluation error:", error);
    // Fallback: safe default if AI evaluation fails
    return {
      score: 0,
      max_score: maxMarks,
      feedback: "Answer recorded for creator review.",
      confidence: "LOW"
    };
  }
}