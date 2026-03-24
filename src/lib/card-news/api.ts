/**
 * Card News API Layer - Supabase CRUD Operations
 * Ported from canvas_editor - dropped axios, uses native Supabase client
 */

import { createClient } from '@/lib/supabase/client';
import type { CardSpec, CardSpecRecord, EditLog } from './types';

// ============================================================================
// Card Specs CRUD
// ============================================================================

export async function getAllCardSpecs(): Promise<CardSpecRecord[]> {
  const client = createClient();
  const { data, error } = await client
    .from('card_specs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCardSpecById(id: string): Promise<CardSpecRecord> {
  const client = createClient();
  const { data, error } = await client
    .from('card_specs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error(`Card spec "${id}" not found`);
  return data;
}

export async function createCardSpec(cardSpec: CardSpec): Promise<CardSpecRecord> {
  const client = createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('인증이 필요합니다.');

  const { data, error } = await client
    .from('card_specs')
    .insert([{
      id: cardSpec.meta.id,
      owner_id: user.id,
      topic: cardSpec.meta.topic,
      status: cardSpec.meta.status,
      spec: cardSpec,
      canvas_ratio: cardSpec.canvas_ratio || '1:1',
    }])
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create card spec');
  return data;
}

export async function updateCardSpec(
  id: string,
  spec: CardSpec,
): Promise<CardSpecRecord> {
  const client = createClient();
  const { data, error } = await client
    .from('card_specs')
    .update({
      spec,
      status: spec.meta.status,
      topic: spec.meta.topic,
      canvas_ratio: spec.canvas_ratio || '1:1',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to update card spec');
  return data;
}

export async function deleteCardSpec(id: string): Promise<void> {
  const client = createClient();
  const { error } = await client.from('card_specs').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// Edit Logs
// ============================================================================

export async function recordEdit(
  specId: string,
  fieldPath: string,
  oldValue: string | null,
  newValue: string,
  changeReason?: string,
): Promise<EditLog> {
  const client = createClient();
  const { data, error } = await client
    .from('edit_logs')
    .insert([{
      spec_id: specId,
      field_path: fieldPath,
      old_value: oldValue,
      new_value: newValue,
    }])
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to record edit');
  return data;
}

export async function getEditLogs(specId: string): Promise<EditLog[]> {
  const client = createClient();
  const { data, error } = await client
    .from('edit_logs')
    .select('*')
    .eq('spec_id', specId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// Approval Workflow
// ============================================================================

export async function approveCardSpec(id: string): Promise<CardSpecRecord> {
  const client = createClient();
  const { data, error } = await client
    .from('card_specs')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to approve card spec');
  return data;
}

export async function rejectCardSpec(id: string, reason: string): Promise<CardSpecRecord> {
  const client = createClient();
  const { data, error } = await client
    .from('card_specs')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to reject card spec');

  // Log the rejection reason
  await client.from('edit_logs').insert([{
    spec_id: id,
    field_path: 'meta.status',
    old_value: 'review',
    new_value: 'draft',
    change_reason: `반려 사유: ${reason}`,
  }]);

  return data;
}

// ============================================================================
// Auth Helper
// ============================================================================

export async function isAuthenticated(): Promise<boolean> {
  const client = createClient();
  const { data } = await client.auth.getUser();
  return !!data.user;
}
