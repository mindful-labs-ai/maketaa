import { createBrowserClient } from '@supabase/ssr';

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

// Hardcoded fallback values matching .env.local
// This prevents crashes during OAuth redirects when env vars
// may not be injected yet by Next.js during full page reloads
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://jicerlxzijgdifwhfzkh.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY2VybHh6aWpnZGlmd2hmemtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3ODQ5NDUsImV4cCI6MjA3NDM2MDk0NX0.0D92z4lw49j-0boirFNy2uVIX2cbpBrC1V67Y0KLZIw';

export const createClient = () => {
  if (cachedClient) return cachedClient;
  cachedClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cachedClient;
};
