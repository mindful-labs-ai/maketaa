/**
 * Supabase Client Configuration
 * Handles both browser and server-side initialization
 * Exported types for database tables
 */

import { createClient } from '@supabase/supabase-js';
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

// ============================================================================
// Environment Validation
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

// ============================================================================
// Browser Client (with Auth)
// ============================================================================

/**
 * Browser-side Supabase client (cookie-based via @supabase/ssr)
 * 쿠키에 세션을 저장하여 미들웨어와 세션 공유
 */
export const createBrowserClientInstance = () => {
  return createSSRBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Global instance for browser
let browserClient: ReturnType<typeof createBrowserClientInstance>;

export function getBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClientInstance();
  }
  return browserClient;
}

// ============================================================================
// Server Client (with Service Role)
// ============================================================================

/**
 * Server-side Supabase client
 * Used in API routes and server-side functions
 * Uses service role key (DO NOT expose to browser)
 */
export const createServerClient = () => {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY not found. Server-side operations require this key.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

// Global instance for server
let serverClient: ReturnType<typeof createServerClient>;

export function getServerClient() {
  if (!serverClient) {
    serverClient = createServerClient();
  }
  return serverClient;
}

// ============================================================================
// Re-export types from central types file
// ============================================================================

export type {
  CardSpecMeta,
  CardText,
  CardRole,
  CardLayout,
  ColorPalette,
  FontStyle,
  CardStyle,
  CardBackground,
  Card,
  SnsConfig,
  CardSpec,
  CardSpecRecord,
  CardSpecStatus,
  EditLog,
  PublishReport,
} from '@/types';

// Re-export with legacy names for backwards compatibility
export type { EditLog as EditLogRecord, PublishReport as PublishReportRecord } from '@/types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the current user's ID from the browser client
 */
export async function getCurrentUserId(): Promise<string | null> {
  const client = getBrowserClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user?.id || null;
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return !!userId;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const client = getBrowserClient();
  await client.auth.signOut();
}

// ============================================================================
// Error Handler
// ============================================================================

export function handleSupabaseError(error: any): string {
  if (typeof error === 'string') return error;

  if (error?.message) {
    return error.message;
  }

  if (error?.error_description) {
    return error.error_description;
  }

  return 'An unknown error occurred. Please try again.';
}

// ============================================================================
// Constants
// ============================================================================

export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  storageUrl: `${supabaseUrl}/storage/v1/object/public`,
  realtimeUrl: `${supabaseUrl}/realtime/v1`,
};

// ============================================================================
// Re-export Database type
// ============================================================================

export type { Database } from './database.types';
