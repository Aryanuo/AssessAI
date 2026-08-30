import { supabase } from "../../config/supabase.js";

export async function createTest(req, res, next) {
  try {
    const {
      title,
      description,
      instructions
    } = req.body;

    const creatorId = req.user.id;

    const { data: test, error } = await supabase
      .from("tests")
      .insert({
        creator_id: creatorId,
        title,
        description: description || null,
        instructions: instructions || null,
        status: "DRAFT"
      })
      .select()
      .single();

    if (error) {
      return next(error);
    }

    const { error: configurationError } =
      await supabase
        .from("test_configurations")
        .insert({
          test_id: test.id
        });

    if (configurationError) {
      return next(configurationError);
    }

    res.status(201).json({
      test
    });
  } catch (error) {
    next(error);
  }
}

export async function getTests(req, res, next) {
  try {
    const creatorId = req.user.id;

    const { data: tests, error } = await supabase
      .from("tests")
      .select("*")
      .eq("creator_id", creatorId)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      return next(error);
    }

    res.status(200).json({
      tests
    });
  } catch (error) {
    next(error);
  }
}

export async function getTestById(req, res, next) {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;

    const { data: test, error } = await supabase
      .from("tests")
      .select("*")
      .eq("id", id)
      .eq("creator_id", creatorId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Test not found"
        });
      }

      return next(error);
    }

    res.status(200).json({
      test
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTest(req, res, next) {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;

    const updates = {};

    if (req.body.title !== undefined) {
      updates.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      updates.description = req.body.description;
    }

    if (req.body.instructions !== undefined) {
      updates.instructions = req.body.instructions;
    }

    const { data, error } = await supabase
      .from("tests")
      .update(updates)
      .eq("id", id)
      .eq("creator_id", creatorId)
      .select();

    if (error) {
      console.error("Supabase update error:", error);

      return res.status(500).json({
        error: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "Test not found"
      });
    }

    res.status(200).json({
      test: data[0]
    });
  } catch (error) {
    console.error("Update test error:", error);

    next(error);
  }
}

export async function deleteTest(req, res, next) {
  try {
    const { id } = req.params;
    const creatorId = req.user.id;

    const { data, error } = await supabase
      .from("tests")
      .delete()
      .eq("id", id)
      .eq("creator_id", creatorId)
      .select();

    if (error) {
      console.error("Supabase delete error:", error);

      return res.status(500).json({
        error: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "Test not found"
      });
    }

    res.status(200).json({
      message: "Test deleted successfully",
      test: data[0]
    });
  } catch (error) {
    console.error("Delete test error:", error);

    next(error);
  }
}