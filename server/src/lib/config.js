export const config = {
  port: process.env.PORT || 3000,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  // AI service key - set when you choose a provider
  aiApiKey: process.env.AI_API_KEY,
};
