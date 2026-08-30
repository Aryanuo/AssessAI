import mammoth from "mammoth";

import { supabase } from "../../config/supabase.js";

export async function uploadDocument(req, res, next) {
  try {
    const { testId } = req.params;
    const creatorId = req.user.id;
    const file = req.file;

    /*
     * 1. Verify that the test belongs to
     *    the authenticated creator.
     */
    const { data: test, error: testError } =
      await supabase
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
     * 2. Extract DOCX text.
     */
    const result = await mammoth.extractRawText({
      buffer: file.buffer
    });

    const extractedText =
      result.value.trim();

    if (!extractedText) {
      return res.status(400).json({
        error:
          "The DOCX file does not contain readable text"
      });
    }

    /*
     * 3. Create a unique storage path.
     */
    const documentId =
      crypto.randomUUID();

    const filePath =
      `${creatorId}/${testId}/${documentId}.docx`;

    /*
     * 4. Upload original DOCX to
     *    Supabase Storage.
     */
    const { error: storageError } =
      await supabase.storage
        .from("documents")
        .upload(
          filePath,
          file.buffer,
          {
            contentType: file.mimetype,
            upsert: false
          }
        );

    if (storageError) {
      console.error(
        "Storage upload error:",
        storageError
      );

      return res.status(500).json({
        error: storageError.message
      });
    }

    /*
     * 5. Save document metadata.
     */
    const { data: document, error: dbError } =
      await supabase
        .from("documents")
        .insert({
          id: documentId,
          test_id: testId,
          file_name: file.originalname,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.mimetype,
          extracted_text: extractedText,
          status: "EXTRACTED"
        })
        .select()
        .single();

    if (dbError) {
      /*
       * If database insertion fails,
       * remove the uploaded file so
       * we don't leave an orphan.
       */
      await supabase.storage
        .from("documents")
        .remove([filePath]);

      console.error(
        "Document database error:",
        dbError
      );

      return res.status(500).json({
        error: dbError.message
      });
    }

    /*
     * 6. Return metadata.
     *
     * Do NOT return extracted text yet.
     * Step 9 will process it.
     */
    res.status(201).json({
      document: {
        id: document.id,
        test_id: document.test_id,
        file_name: document.file_name,
        file_size: document.file_size,
        mime_type: document.mime_type,
        status: document.status,
        created_at: document.created_at
      }
    });
  } catch (error) {
    console.error(
      "Document upload error:",
      error
    );

    next(error);
  }
}