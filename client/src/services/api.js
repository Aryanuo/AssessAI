import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(endpoint, options = {}) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers
    }
  );

  const contentType =
    response.headers.get("content-type") || "";

  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();

    data = {
      error: text || "Request failed"
    };
  }

  if (!response.ok) {
    throw new Error(
      data.error || "Request failed"
    );
  }

  return data;
}

export async function getTests() {
  return apiFetch("/api/tests");
}

export async function getTest(id) {
  return apiFetch(`/api/tests/${id}`);
}

export async function createTest(testData) {
  return apiFetch("/api/tests", {
    method: "POST",
    body: JSON.stringify(testData)
  });
}

export async function updateTest(id, testData) {
  return apiFetch(`/api/tests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(testData)
  });
}

export async function deleteTest(id) {
  return apiFetch(`/api/tests/${id}`, {
    method: "DELETE"
  });
}

export async function uploadDocument(
  testId,
  file
) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const formData = new FormData();

  formData.append(
    "document",
    file
  );

  const response = await fetch(
    `${API_URL}/api/tests/${testId}/documents`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${session.access_token}`
      },
      body: formData
    }
  );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let data;

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    data = await response.json();
  } else {
    const text =
      await response.text();

    data = {
      error:
        text || "Upload failed"
    };
  }

  if (!response.ok) {
    throw new Error(
      data.error || "Upload failed"
    );
  }

  return data;
}

export async function generateQuestions(
  testId
) {
  return apiFetch(
    `/api/tests/${testId}/generate-questions`,
    {
      method: "POST"
    }
  );
}

export async function getQuestions(
  testId
) {
  return apiFetch(
    `/api/tests/${testId}/questions`
  );
}

export async function updateQuestion(
  questionId,
  questionData
) {
  return apiFetch(
    `/api/questions/${questionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(
        questionData
      )
    }
  );
}

export async function deleteQuestion(
  questionId
) {
  return apiFetch(
    `/api/questions/${questionId}`,
    {
      method: "DELETE"
    }
  );
}

export async function reorderQuestions(
  testId,
  questionIds
) {
  return apiFetch(
    `/api/tests/${testId}/questions/reorder`,
    {
      method: "PATCH",
      body: JSON.stringify({
        questionIds
      })
    }
  );
}

export async function createQuestion(
  testId,
  questionData
) {
  return apiFetch(
    `/api/tests/${testId}/questions`,
    {
      method: "POST",
      body: JSON.stringify(
        questionData
      )
    }
  );
}

export async function getConfiguration(
  testId
) {
  return apiFetch(
    `/api/tests/${testId}/configuration`
  );
}

export async function updateConfiguration(
  testId,
  configData
) {
  return apiFetch(
    `/api/tests/${testId}/configuration`,
    {
      method: "PATCH",
      body: JSON.stringify(
        configData
      )
    }
  );
}

export async function publishTest(
  testId
) {
  return apiFetch(
    `/api/tests/${testId}/publish`,
    {
      method: "POST"
    }
  );
}

export async function getPublicTest(
  testCode
) {
  // Public route without requiring creator authentication
  return apiFetch(
    `/api/public/tests/${testCode}`
  );
}

export async function registerIndividual(
  testCode,
  participantData
) {
  return apiFetch(
    `/api/public/tests/${testCode}/register`,
    {
      method: "POST",
      body: JSON.stringify(participantData)
    }
  );
}

export async function createTeam(
  testCode,
  payload
) {
  return apiFetch(
    `/api/public/tests/${testCode}/teams`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function joinTeam(
  testCode,
  teamCode,
  participantData
) {
  return apiFetch(
    `/api/public/tests/${testCode}/teams/${teamCode}/join`,
    {
      method: "POST",
      body: JSON.stringify(participantData)
    }
  );
}

export async function getTeamDetails(
  teamCode
) {
  return apiFetch(
    `/api/public/teams/${teamCode}`
  );
}

export async function startAttempt(
  data
) {
  return apiFetch(
    `/api/public/attempts/start`,
    {
      method: "POST",
      body: JSON.stringify(data)
    }
  );
}

export async function getAttemptQuestions(
  attemptId,
  participantId
) {
  return apiFetch(
    `/api/public/attempts/${attemptId}/questions?participantId=${participantId}`
  );
}

export async function saveAnswer(
  attemptId,
  payload
) {
  return apiFetch(
    `/api/public/attempts/${attemptId}/answers`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function submitAttempt(
  attemptId,
  payload
) {
  return apiFetch(
    `/api/public/attempts/${attemptId}/submit`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

// ──── Results (Creator) ────

export async function getTestResults(testId) {
  return apiFetch(`/api/tests/${testId}/results`);
}

export async function getAttemptDetail(
  testId,
  attemptId
) {
  return apiFetch(
    `/api/tests/${testId}/results/${attemptId}`
  );
}

// ──── Anti-Cheat Violations & Monitoring ────

export async function recordViolation(
  attemptId,
  payload
) {
  return apiFetch(
    `/api/public/attempts/${attemptId}/violations`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function getAttemptViolations(
  attemptId
) {
  return apiFetch(
    `/api/public/attempts/${attemptId}/violations`
  );
}