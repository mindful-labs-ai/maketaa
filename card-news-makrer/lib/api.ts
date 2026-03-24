/**
 * API Layer - CRUD Operations for Card Specs
 * Handles all data persistence and retrieval via Supabase
 */

import axios from 'axios';
import { getBrowserClient, getServerClient } from './supabase';
import type {
  CardSpec,
  CardSpecRecord,
  EditLog,
  PublishReport,
} from '@/types';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const client = getBrowserClient();
  const { data } = await client.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

// ============================================================================
// Card Specs CRUD
// ============================================================================

/**
 * Fetch all card specs for the current user
 */
export async function getAllCardSpecs(): Promise<CardSpecRecord[]> {
  try {
    const client = getBrowserClient();
    const { data, error } = await client
      .from('card_specs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[CardEditor] Error fetching card specs:', error);
    throw error;
  }
}

/**
 * Fetch a single card spec by ID
 */
export async function getCardSpecById(id: string): Promise<CardSpecRecord> {
  try {
    const client = getBrowserClient();
    const { data, error } = await client
      .from('card_specs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Card spec with ID "${id}" not found`);

    return data;
  } catch (error) {
    console.error(`[CardEditor] Error fetching card spec ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new card spec
 */
export async function createCardSpec(
  cardSpec: CardSpec
): Promise<CardSpecRecord> {
  try {
    const client = getBrowserClient();
    const { data, error } = await client
      .from('card_specs')
      .insert([
        {
          id: cardSpec.meta.id,
          topic: cardSpec.meta.topic,
          status: cardSpec.meta.status,
          spec: cardSpec,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create card spec');

    return data;
  } catch (error) {
    console.error('[CardEditor] Error creating card spec:', error);
    throw error;
  }
}

/**
 * Update a card spec
 */
export async function updateCardSpec(
  id: string,
  updates: Partial<CardSpec>
): Promise<CardSpecRecord> {
  try {
    const client = getBrowserClient();

    // Fetch current spec to merge updates
    const current = await getCardSpecById(id);
    const updated: CardSpec = {
      ...current.spec,
      ...updates,
      meta: {
        ...current.spec.meta,
        ...updates.meta,
      },
    };

    const { data, error } = await client
      .from('card_specs')
      .update({
        spec: updated,
        status: updated.meta.status,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update card spec');

    return data;
  } catch (error) {
    console.error(`[CardEditor] Error updating card spec ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a card spec
 */
export async function deleteCardSpec(id: string): Promise<void> {
  try {
    const client = getBrowserClient();
    const { error } = await client
      .from('card_specs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error(`[CardEditor] Error deleting card spec ${id}:`, error);
    throw error;
  }
}

// ============================================================================
// Card Spec Status Updates
// ============================================================================

/**
 * Approve a card spec and trigger publishing
 */
export async function approveCardSpec(id: string): Promise<CardSpecRecord> {
  try {
    const response = await apiClient.post<CardSpecRecord>(
      `/api/card-specs/${id}/approve`
    );
    return response.data;
  } catch (error) {
    console.error(`[CardEditor] Error approving card spec ${id}:`, error);
    throw error;
  }
}

/**
 * Reject a card spec (revert to draft)
 */
export async function rejectCardSpec(
  id: string,
  reason: string
): Promise<CardSpecRecord> {
  try {
    const response = await apiClient.post<CardSpecRecord>(
      `/api/card-specs/${id}/reject`,
      { reason }
    );
    return response.data;
  } catch (error) {
    console.error(`[CardEditor] Error rejecting card spec ${id}:`, error);
    throw error;
  }
}

// ============================================================================
// Edit Logs
// ============================================================================

/**
 * Record an edit in the edit_logs table
 */
export async function recordEdit(
  specId: string,
  fieldPath: string,
  oldValue: string | null,
  newValue: string,
  changeReason?: string
): Promise<EditLog> {
  try {
    const client = getBrowserClient();
    const { data, error } = await client
      .from('edit_logs')
      .insert([
        {
          spec_id: specId,
          editor: 'human', // Mark as human edit
          field_path: fieldPath,
          old_value: oldValue,
          new_value: newValue,
          change_reason: changeReason,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to record edit');

    return data;
  } catch (error) {
    console.error('[CardEditor] Error recording edit:', error);
    throw error;
  }
}

/**
 * Fetch edit logs for a specific card spec
 */
export async function getEditLogs(specId: string): Promise<EditLog[]> {
  try {
    const client = getBrowserClient();
    const { data, error } = await client
      .from('edit_logs')
      .select('*')
      .eq('spec_id', specId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(
      `[CardEditor] Error fetching edit logs for ${specId}:`,
      error
    );
    throw error;
  }
}

// ============================================================================
// Publishing Reports
// ============================================================================

/**
 * Create a publish report
 */
export async function createPublishReport(
  specId: string,
  platform: 'instagram' | 'threads',
  status: 'pending' | 'published' | 'failed' = 'pending'
): Promise<PublishReport> {
  try {
    const client = getBrowserClient();
    const { data, error } = await client
      .from('publish_reports')
      .insert([
        {
          spec_id: specId,
          platform,
          status,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create publish report');

    return data;
  } catch (error) {
    console.error('[CardEditor] Error creating publish report:', error);
    throw error;
  }
}

/**
 * Update a publish report with results
 */
export async function updatePublishReport(
  reportId: number,
  updates: {
    status: 'pending' | 'published' | 'failed';
    post_url?: string;
    post_id?: string;
    error_message?: string;
    published_at?: string;
  }
): Promise<PublishReport> {
  try {
    const client = getBrowserClient();
    const { data, error } = await client
      .from('publish_reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update publish report');

    return data;
  } catch (error) {
    console.error(
      `[CardEditor] Error updating publish report ${reportId}:`,
      error
    );
    throw error;
  }
}

/**
 * Fetch publish reports for a card spec
 */
export async function getPublishReports(
  specId: string
): Promise<PublishReport[]> {
  try {
    const client = getBrowserClient();
    const { data, error } = await client
      .from('publish_reports')
      .select('*')
      .eq('spec_id', specId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(
      `[CardEditor] Error fetching publish reports for ${specId}:`,
      error
    );
    throw error;
  }
}

// ============================================================================
// Server-side Operations (for API routes)
// ============================================================================

/**
 * Server-side: Get card spec (bypasses RLS with service role)
 * Use in API routes only
 */
export async function getCardSpecByIdServer(id: string): Promise<CardSpecRecord> {
  try {
    const client = getServerClient();
    const { data, error } = await client
      .from('card_specs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Card spec ${id} not found`);

    return data;
  } catch (error) {
    console.error(`[CardEditor API] Error fetching card spec ${id}:`, error);
    throw error;
  }
}

/**
 * Server-side: Update card spec status
 * Use in API routes only
 */
export async function updateCardSpecStatusServer(
  id: string,
  status: 'draft' | 'review' | 'approved' | 'published'
): Promise<CardSpecRecord> {
  try {
    const client = getServerClient();
    const { data, error } = await client
      .from('card_specs')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update status');

    return data;
  } catch (error) {
    console.error(
      `[CardEditor API] Error updating status for ${id}:`,
      error
    );
    throw error;
  }
}

/**
 * Server-side: Record edit with service role
 */
export async function recordEditServer(
  specId: string,
  fieldPath: string,
  oldValue: string | null,
  newValue: string,
  changeReason?: string,
  editor: string = 'human'
): Promise<EditLog> {
  try {
    const client = getServerClient();
    const { data, error } = await client
      .from('edit_logs')
      .insert([
        {
          spec_id: specId,
          editor,
          field_path: fieldPath,
          old_value: oldValue,
          new_value: newValue,
          change_reason: changeReason,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to record edit');

    return data;
  } catch (error) {
    console.error('[CardEditor API] Error recording edit:', error);
    throw error;
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parse Supabase/Axios error into user-friendly message
 */
export function getErrorMessage(error: any): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      'An API error occurred'
    );
  }

  if (error?.message) {
    return error.message;
  }

  return 'An unknown error occurred. Please try again.';
}
