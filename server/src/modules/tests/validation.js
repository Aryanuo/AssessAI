export function validateCreateTest(req, res, next) {
  const {
    title,
    description,
    instructions
  } = req.body;

  if (
    !title ||
    typeof title !== "string" ||
    !title.trim()
  ) {
    return res.status(400).json({
      error: "Test title is required"
    });
  }

  if (title.trim().length > 200) {
    return res.status(400).json({
      error: "Test title must be 200 characters or less"
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      error: "Description must be a string"
    });
  }

  if (
    instructions !== undefined &&
    instructions !== null &&
    typeof instructions !== "string"
  ) {
    return res.status(400).json({
      error: "Instructions must be a string"
    });
  }

  next();
}

export function validateUpdateTest(req, res, next) {
  const {
    title,
    description,
    instructions
  } = req.body;

  if (
    title === undefined &&
    description === undefined &&
    instructions === undefined
  ) {
    return res.status(400).json({
      error: "At least one field must be provided"
    });
  }

  if (
    title !== undefined &&
    (
      typeof title !== "string" ||
      !title.trim()
    )
  ) {
    return res.status(400).json({
      error: "Title must be a non-empty string"
    });
  }

  if (
    title !== undefined &&
    title.trim().length > 200
  ) {
    return res.status(400).json({
      error: "Title must be 200 characters or less"
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      error: "Description must be a string"
    });
  }

  if (
    instructions !== undefined &&
    instructions !== null &&
    typeof instructions !== "string"
  ) {
    return res.status(400).json({
      error: "Instructions must be a string"
    });
  }

  next();
}