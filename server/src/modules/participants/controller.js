import { supabase } from "../../config/supabase.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateTeamCode() {
  let code = "TM-";
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARS.length);
    code += CODE_CHARS[randomIndex];
  }
  return code;
}

async function resolvePublishedTest(testCode) {
  if (!testCode || typeof testCode !== "string") {
    throw new Error("Test code is required");
  }

  const clean = testCode.trim();

  let query = supabase
    .from("tests")
    .select("id, title, status, test_code");

  if (UUID_REGEX.test(clean)) {
    query = query.or(`id.eq.${clean},test_code.eq.${clean.toUpperCase()}`);
  } else {
    query = query.eq("test_code", clean.toUpperCase());
  }

  const { data: test, error: testError } = await query.maybeSingle();

  if (testError || !test) {
    const err = new Error("Assessment not found");
    err.status = 404;
    throw err;
  }

  if (test.status !== "PUBLISHED") {
    const err = new Error(`Assessment is not currently active (Status: ${test.status})`);
    err.status = 403;
    throw err;
  }

  const { data: config, error: configError } = await supabase
    .from("test_configurations")
    .select("*")
    .eq("test_id", test.id)
    .maybeSingle();

  if (configError) {
    throw configError;
  }

  // Check schedule
  const now = new Date();
  if (config?.start_time && now < new Date(config.start_time)) {
    const err = new Error(`Assessment is scheduled to begin at ${new Date(config.start_time).toLocaleString()}`);
    err.status = 403;
    throw err;
  }

  if (config?.end_time && now > new Date(config.end_time)) {
    const err = new Error(`Assessment ended on ${new Date(config.end_time).toLocaleString()}`);
    err.status = 403;
    throw err;
  }

  return { test, config };
}

function extractAndValidateParticipant(config, participantData) {
  const fields = config?.participant_fields || [
    { name: "name", label: "Name", required: true },
    { name: "email", label: "Email", required: true }
  ];

  const name = (participantData.name || "").trim();
  const email = (participantData.email || "").trim().toLowerCase();

  if (!name) {
    const err = new Error("Name is required");
    err.status = 400;
    throw err;
  }

  if (!email || !email.includes("@")) {
    const err = new Error("Valid email address is required");
    err.status = 400;
    throw err;
  }

  const customFields = {};
  for (const field of fields) {
    if (field.name === "name" || field.name === "email") continue;
    const value = participantData[field.name];
    if (field.required && (value === undefined || value === null || String(value).trim() === "")) {
      const err = new Error(`${field.label} is required`);
      err.status = 400;
      throw err;
    }
    if (value !== undefined && value !== null) {
      customFields[field.name] = value;
    }
  }

  return { name, email, customFields };
}

export async function registerIndividual(req, res, next) {
  try {
    const { testCode } = req.params;
    const participantData = req.body || {};

    const { test, config } = await resolvePublishedTest(testCode);

    if (config?.participation_mode === "TEAM") {
      return res.status(400).json({
        error: "This assessment is configured for Team participation. Please create or join a team."
      });
    }

    const { name, email, customFields } = extractAndValidateParticipant(config, participantData);

    const { data: participant, error: insertError } = await supabase
      .from("participants")
      .insert({
        test_id: test.id,
        name,
        email,
        custom_fields: customFields
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    res.status(201).json({
      message: "Participant registered successfully",
      participant,
      test: {
        id: test.id,
        title: test.title,
        test_code: test.test_code
      }
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

export async function createTeam(req, res, next) {
  try {
    const { testCode } = req.params;
    const { team_name, ...participantData } = req.body || {};

    const { test, config } = await resolvePublishedTest(testCode);

    if (config?.participation_mode !== "TEAM") {
      return res.status(400).json({
        error: "This assessment is configured for Individual participation."
      });
    }

    if (!team_name || !team_name.trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }

    const { name, email, customFields } = extractAndValidateParticipant(config, participantData);

    // 1. Insert participant
    const { data: participant, error: pError } = await supabase
      .from("participants")
      .insert({
        test_id: test.id,
        name,
        email,
        custom_fields: customFields
      })
      .select()
      .single();

    if (pError) {
      return res.status(500).json({ error: pError.message });
    }

    // 2. Generate unique team code
    let teamCode = generateTeamCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      const { data: existing } = await supabase
        .from("teams")
        .select("id")
        .eq("team_code", teamCode)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      } else {
        teamCode = generateTeamCode();
      }
    }

    // 3. Insert team
    const { data: team, error: tError } = await supabase
      .from("teams")
      .insert({
        test_id: test.id,
        team_code: teamCode,
        team_name: team_name.trim()
      })
      .select()
      .single();

    if (tError) {
      return res.status(500).json({ error: tError.message });
    }

    // 4. Add creator to team_members
    const { error: tmError } = await supabase
      .from("team_members")
      .insert({
        team_id: team.id,
        participant_id: participant.id
      });

    if (tmError) {
      return res.status(500).json({ error: tmError.message });
    }

    res.status(201).json({
      message: "Team created successfully",
      participant,
      team: {
        id: team.id,
        team_code: team.team_code,
        team_name: team.team_name,
        member_count: 1,
        max_members: config?.team_size || 2
      },
      test: {
        id: test.id,
        title: test.title,
        test_code: test.test_code
      }
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

export async function joinTeam(req, res, next) {
  try {
    const { testCode, teamCode } = req.params;
    const participantData = req.body || {};

    const { test, config } = await resolvePublishedTest(testCode);

    if (config?.participation_mode !== "TEAM") {
      return res.status(400).json({
        error: "This assessment is configured for Individual participation."
      });
    }

    if (!teamCode || !teamCode.trim()) {
      return res.status(400).json({ error: "Team code is required" });
    }

    // 1. Lookup team
    const { data: team, error: tError } = await supabase
      .from("teams")
      .select("id, team_code, team_name, test_id")
      .eq("team_code", teamCode.trim().toUpperCase())
      .eq("test_id", test.id)
      .maybeSingle();

    if (tError || !team) {
      return res.status(404).json({ error: "Team not found with the provided team code." });
    }

    // 2. Check current member count
    const { count: memberCount, error: countError } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    const maxMembers = config?.team_size || 2;
    if (memberCount >= maxMembers) {
      return res.status(400).json({
        error: `Team "${team.team_name}" is already full (${memberCount}/${maxMembers} members).`
      });
    }

    const { name, email, customFields } = extractAndValidateParticipant(config, participantData);

    // 3. Insert participant
    const { data: participant, error: pError } = await supabase
      .from("participants")
      .insert({
        test_id: test.id,
        name,
        email,
        custom_fields: customFields
      })
      .select()
      .single();

    if (pError) {
      return res.status(500).json({ error: pError.message });
    }

    // 4. Add to team_members
    const { error: tmError } = await supabase
      .from("team_members")
      .insert({
        team_id: team.id,
        participant_id: participant.id
      });

    if (tmError) {
      return res.status(500).json({ error: tmError.message });
    }

    res.status(200).json({
      message: `Joined team "${team.team_name}" successfully`,
      participant,
      team: {
        id: team.id,
        team_code: team.team_code,
        team_name: team.team_name,
        member_count: memberCount + 1,
        max_members: maxMembers
      },
      test: {
        id: test.id,
        title: test.title,
        test_code: test.test_code
      }
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

export async function getTeamDetails(req, res, next) {
  try {
    const { teamCode } = req.params;

    if (!teamCode || !teamCode.trim()) {
      return res.status(400).json({ error: "Team code is required" });
    }

    const { data: team, error: tError } = await supabase
      .from("teams")
      .select(`
        id,
        team_code,
        team_name,
        test_id,
        created_at,
        team_members (
          joined_at,
          participants (
            id,
            name
          )
        )
      `)
      .eq("team_code", teamCode.trim().toUpperCase())
      .maybeSingle();

    if (tError || !team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const members = (team.team_members || []).map((tm) => ({
      participant_id: tm.participants?.id,
      name: tm.participants?.name,
      joined_at: tm.joined_at
    }));

    res.status(200).json({
      team: {
        id: team.id,
        team_code: team.team_code,
        team_name: team.team_name,
        test_id: team.test_id,
        members,
        member_count: members.length
      }
    });
  } catch (error) {
    next(error);
  }
}
