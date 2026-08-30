const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateDocx(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: "DOCX file is required"
    });
  }

  if (req.file.mimetype !== DOCX_MIME_TYPE) {
    return res.status(400).json({
      error: "Only DOCX files are supported"
    });
  }

  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({
      error: "DOCX file must be 10MB or smaller"
    });
  }

  next();
}