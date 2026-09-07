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

/**
 * Splits extracted document text into manageable chunks.
 * Uses question boundary detection for question banks or paragraph boundary detection for study materials.
 */
export function splitDocumentIntoChunks(extractedText, options = {}) {
  const maxCharsPerChunk = options.maxCharsPerChunk || 6000;
  const maxQuestionsPerChunk = options.maxQuestionsPerChunk || 20;

  const text = (extractedText || "").trim();
  if (!text) return [];

  // Small document check: <= 4500 characters -> process in a single request
  if (text.length <= 4500) {
    return [text];
  }

  // Strategy 1: Detect explicit question numbers at line starts
  // Matches "1.", "1)", "1:", "1 -", "Q1.", "Q.1", "Question 1:", "Question 1."
  const questionRegex = /(?:^|\r?\n)\s*(?:(?:Q(?:uestion)?\s*[:.]?\s*\d+[\.\)\:\-]?|\d+[\.\)\:\-]))\s+/gi;

  const matches = [];
  let match;
  while ((match = questionRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length
    });
  }

  // If we detected a substantial number of questions (>= 10), chunk by question blocks
  if (matches.length >= 10) {
    const questionBlocks = [];
    for (let i = 0; i < matches.length; i++) {
      const startIndex = matches[i].index;
      const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
      questionBlocks.push(text.substring(startIndex, endIndex).trim());
    }

    const chunks = [];
    let currentChunkQuestions = [];
    let currentChunkCharCount = 0;

    for (const qBlock of questionBlocks) {
      const blockLength = qBlock.length;
      const wouldExceedQuestions = currentChunkQuestions.length >= maxQuestionsPerChunk;
      const wouldExceedChars = (currentChunkCharCount + blockLength > maxCharsPerChunk) && currentChunkQuestions.length >= 5;

      if ((wouldExceedQuestions || wouldExceedChars) && currentChunkQuestions.length > 0) {
        chunks.push(currentChunkQuestions.join("\n\n"));
        currentChunkQuestions = [qBlock];
        currentChunkCharCount = blockLength;
      } else {
        currentChunkQuestions.push(qBlock);
        currentChunkCharCount += blockLength;
      }
    }

    if (currentChunkQuestions.length > 0) {
      chunks.push(currentChunkQuestions.join("\n\n"));
    }

    return chunks;
  }

  // Strategy 2: Paragraph / line-based chunking for general study notes or non-numbered texts
  const paragraphs = text.split(/\r?\n\s*\r?\n/);
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentLength + trimmed.length > maxCharsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.join("\n\n"));
      currentChunk = [trimmed];
      currentLength = trimmed.length;
    } else {
      currentChunk.push(trimmed);
      currentLength += trimmed.length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join("\n\n"));
  }

  return chunks.length > 0 ? chunks : [text];
}

async function generateContentWithFallback(prompt, customConfig = {}) {
  let lastError;
  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`[Gemini] Trying model: ${modelName}`);
      const m = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.2,
          responseMimeType: "application/json",
          ...customConfig
        }
      });
      const result = await m.generateContent(prompt);
      console.log(`[Gemini] Success with model: ${modelName}`);
      return result;
    } catch (err) {
      console.warn(`[Gemini] Model ${modelName} failed: ${err.message}`);
      lastError = err;
      // If error is 429 / quota limit, short delay before trying the fallback model
      if (err.message && (err.message.includes("429") || err.message.includes("quota"))) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }
  throw new Error(
    `All Gemini models failed. Last error: ${lastError?.message}`
  );
}

/**
 * Internal helper to generate questions for a single chunk.
 */
async function generateChunkQuestions(chunkText, chunkIndex, totalChunks) {
  const contextHeader = totalChunks > 1
    ? `You are processing part ${chunkIndex} of ${totalChunks} of an assessment document.`
    : `You are processing an assessment document.`;

  const prompt = `
${contextHeader}

Convert the supplied educational content into structured assessment questions.

CRITICAL INSTRUCTIONS ON COMPLETENESS AND QUESTION COUNT:
1. Extract and convert ALL questions from this section without skipping, summarizing, sampling, or omitting any question.
2. If this section contains multiple questions, you MUST generate and return every single question in the array.
3. Keep question text and option texts concise and direct so that all questions fit within the response token limit.
4. Continue generating until all content in this section is completely processed. Do not stop early.

IMPORTANT FORMATTING RULES:
- Return ONLY valid JSON.
- Do not return markdown.
- Do not wrap JSON in triple backticks.
- Never use unescaped double quotes inside question_text, option text, or topics. Use single quotes (') if quoting words or terms inside strings.
- Do not put trailing commas after the last item in any array or object.
- Do not invent information that is not supported by the document.
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

5. difficulty must be: EASY, MEDIUM, or HARD.
6. marks must be a positive number.
7. negative_marks must be a number >= 0.
8. topic should identify the topic covered by the question.
9. If the section does not contain enough information to create a question, do not create that question.

DOCUMENT CONTENT:

${chunkText}
`;

  const result = await generateContentWithFallback(prompt);
  const text = result.response.text();
  return parseGeminiJson(text);
}

/**
 * Main question generation entry point.
 * Automatically chunks large documents, retries failed chunks with fallback models,
 * and combines questions in original sequence.
 */
export async function generateQuestions(extractedText) {
  const chunks = splitDocumentIntoChunks(extractedText);
  const totalChunks = chunks.length;

  console.log(`[Gemini] Document split into ${totalChunks} chunk${totalChunks > 1 ? "s" : ""}`);

  const allQuestions = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunkText = chunks[i];
    const chunkIndex = i + 1;
    let chunkQuestions = null;
    let lastChunkError = null;
    const MAX_CHUNK_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES; attempt++) {
      console.log(
        `[Gemini] Processing chunk ${chunkIndex}/${totalChunks}${attempt > 1 ? ` (retry attempt ${attempt})` : ""}`
      );

      try {
        const chunkResult = await generateChunkQuestions(chunkText, chunkIndex, totalChunks);

        if (chunkResult && Array.isArray(chunkResult.questions) && chunkResult.questions.length > 0) {
          chunkQuestions = chunkResult.questions;
          console.log(`[Gemini] Chunk ${chunkIndex} generated ${chunkQuestions.length} questions`);
          break; // Succeeded on this attempt
        } else {
          throw new Error(`Chunk ${chunkIndex} returned 0 valid questions`);
        }
      } catch (err) {
        console.warn(`[Gemini] Chunk ${chunkIndex} attempt ${attempt} failed: ${err.message}`);
        lastChunkError = err;
        if (attempt < MAX_CHUNK_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (!chunkQuestions) {
      throw new Error(
        `Failed to generate questions for chunk ${chunkIndex}/${totalChunks} after ${MAX_CHUNK_RETRIES} attempts: ${lastChunkError?.message}`
      );
    }

    // Append chunk questions in strict original order without duplication
    allQuestions.push(...chunkQuestions);
  }

  console.log(`[Gemini] All ${totalChunks} chunks processed. Total questions generated: ${allQuestions.length}`);

  return {
    questions: allQuestions
  };
}

export function parseGeminiJson(text) {
  let cleaned = (text || "").trim();

  // Strip all markdown code fences if present anywhere around the JSON
  cleaned = cleaned.replace(/^```[a-z]*\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  // Extract from the first '{' to the last '}'
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace !== -1) {
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      cleaned = cleaned.substring(firstBrace);
    }
  }

  // Strip trailing commas before closing brackets/braces (common LLM JSON syntax error)
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      "Gemini returned invalid JSON: " + err.message
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
    // Fallback: mark as PENDING_REVIEW instead of silently assigning score 0
    return {
      score: null,
      max_score: maxMarks,
      feedback: "AI grading unavailable (traffic or quota limit reached). Pending review.",
      confidence: "PENDING_REVIEW"
    };
  }
}