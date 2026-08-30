const VALID_PARTICIPATION_MODES = ["INDIVIDUAL", "TEAM"];
const VALID_NAVIGATION_MODES = ["SEQUENTIAL", "FREE"];
const VALID_TEAM_SCORING_METHODS = ["SUM", "AVERAGE", "BEST_N"];
const VALID_TIMING_TYPES = ["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "LONG_ANSWER"];
const VALID_TIMING_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

export function validateUpdateConfiguration(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({
      error: "Request body is required"
    });
  }

  // participation_mode
  if (
    body.participation_mode !== undefined &&
    !VALID_PARTICIPATION_MODES.includes(body.participation_mode)
  ) {
    return res.status(400).json({
      error: "participation_mode must be INDIVIDUAL or TEAM"
    });
  }

  // team_size
  if (body.team_size !== undefined && body.team_size !== null) {
    if (!Number.isInteger(body.team_size) || body.team_size < 2) {
      return res.status(400).json({
        error: "team_size must be an integer >= 2"
      });
    }
  }

  // team_scoring_method
  if (
    body.team_scoring_method !== undefined &&
    !VALID_TEAM_SCORING_METHODS.includes(body.team_scoring_method)
  ) {
    return res.status(400).json({
      error: "team_scoring_method must be SUM, AVERAGE, or BEST_N"
    });
  }

  // duration_minutes
  if (body.duration_minutes !== undefined && body.duration_minutes !== null) {
    if (!Number.isInteger(body.duration_minutes) || body.duration_minutes < 1) {
      return res.status(400).json({
        error: "duration_minutes must be a positive integer"
      });
    }
  }

  // timing_rules
  if (body.timing_rules !== undefined) {
    if (!Array.isArray(body.timing_rules)) {
      return res.status(400).json({
        error: "timing_rules must be an array"
      });
    }

    for (let i = 0; i < body.timing_rules.length; i++) {
      const rule = body.timing_rules[i];

      if (!rule || typeof rule !== "object") {
        return res.status(400).json({
          error: `timing_rules[${i}] must be an object`
        });
      }

      if (!VALID_TIMING_TYPES.includes(rule.type)) {
        return res.status(400).json({
          error: `timing_rules[${i}].type must be one of: ${VALID_TIMING_TYPES.join(", ")}`
        });
      }

      if (!VALID_TIMING_DIFFICULTIES.includes(rule.difficulty)) {
        return res.status(400).json({
          error: `timing_rules[${i}].difficulty must be one of: ${VALID_TIMING_DIFFICULTIES.join(", ")}`
        });
      }

      if (!Number.isInteger(rule.seconds) || rule.seconds < 5) {
        return res.status(400).json({
          error: `timing_rules[${i}].seconds must be an integer >= 5`
        });
      }
    }
  }

  // navigation_mode
  if (
    body.navigation_mode !== undefined &&
    !VALID_NAVIGATION_MODES.includes(body.navigation_mode)
  ) {
    return res.status(400).json({
      error: "navigation_mode must be SEQUENTIAL or FREE"
    });
  }

  // booleans
  const booleanFields = [
    "randomize_questions",
    "randomize_options",
    "negative_marking_enabled",
    "show_score",
    "show_correct_answers",
    "show_leaderboard",
    "fullscreen_required"
  ];

  for (const field of booleanFields) {
    if (body[field] !== undefined && typeof body[field] !== "boolean") {
      return res.status(400).json({
        error: `${field} must be a boolean`
      });
    }
  }

  // max_attempts
  if (body.max_attempts !== undefined) {
    if (!Number.isInteger(body.max_attempts) || body.max_attempts < 1) {
      return res.status(400).json({
        error: "max_attempts must be a positive integer"
      });
    }
  }

  // violation_limit
  if (body.violation_limit !== undefined) {
    if (!Number.isInteger(body.violation_limit) || body.violation_limit < 1) {
      return res.status(400).json({
        error: "violation_limit must be a positive integer"
      });
    }
  }

  // start_time / end_time
  if (body.start_time !== undefined && body.start_time !== null) {
    const parsed = new Date(body.start_time);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({
        error: "start_time must be a valid ISO date string"
      });
    }
  }

  if (body.end_time !== undefined && body.end_time !== null) {
    const parsed = new Date(body.end_time);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({
        error: "end_time must be a valid ISO date string"
      });
    }
  }

  // Validate end > start when both are provided
  if (body.start_time && body.end_time) {
    const start = new Date(body.start_time);
    const end = new Date(body.end_time);
    if (end <= start) {
      return res.status(400).json({
        error: "end_time must be after start_time"
      });
    }
  }

  // participant_fields
  if (body.participant_fields !== undefined) {
    if (!Array.isArray(body.participant_fields)) {
      return res.status(400).json({
        error: "participant_fields must be an array"
      });
    }

    for (let i = 0; i < body.participant_fields.length; i++) {
      const field = body.participant_fields[i];

      if (!field || typeof field !== "object") {
        return res.status(400).json({
          error: `participant_fields[${i}] must be an object`
        });
      }

      if (!field.name || typeof field.name !== "string") {
        return res.status(400).json({
          error: `participant_fields[${i}].name is required`
        });
      }

      if (!field.label || typeof field.label !== "string") {
        return res.status(400).json({
          error: `participant_fields[${i}].label is required`
        });
      }

      if (!field.type || typeof field.type !== "string") {
        return res.status(400).json({
          error: `participant_fields[${i}].type is required`
        });
      }

      if (typeof field.required !== "boolean") {
        return res.status(400).json({
          error: `participant_fields[${i}].required must be a boolean`
        });
      }
    }
  }

  next();
}
