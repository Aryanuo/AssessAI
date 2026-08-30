import "dotenv/config";

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(
      `Missing environment variable: ${key}`
    );
  }
}

export const env = {
  port: Number(process.env.PORT || 5000),

  supabaseUrl: process.env.SUPABASE_URL,

  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY,

  geminiApiKey:
    process.env.GEMINI_API_KEY,

  clientUrl:
    process.env.CLIENT_URL ||
    "http://localhost:5173"
};