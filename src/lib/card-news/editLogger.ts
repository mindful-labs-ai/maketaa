/**
 * Edit Logger - Client-side edit logging utilities
 * Ported from canvas_editor - uses Supabase browser client
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface EditLogEntry {
  id: number;
  specId: string;
  editor: string;
  fieldPath: string;
  oldValue: string | null;
  newValue: string;
  changeReason?: string;
  createdAt: string;
}

export interface EditHistoryQuery {
  specId: string;
  limit?: number;
  offset?: number;
  fieldPath?: string;
  editor?: string;
}

// ============================================================================
// Create Edit Log
// ============================================================================

export async function createEditLog(
  specId: string,
  editor: string,
  fieldPath: string,
  oldValue: string | null,
  newValue: string,
  reason?: string
): Promise<EditLogEntry> {
  const client = createClient();
  const { data, error } = await client
    .from('edit_logs')
    .insert([{
      spec_id: specId,
      editor,
      field_path: fieldPath,
      old_value: oldValue,
      new_value: newValue,
      change_reason: reason ?? null,
    }])
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create edit log');

  return {
    id: data.id,
    specId: data.spec_id,
    editor: data.editor ?? editor,
    fieldPath: data.field_path,
    oldValue: data.old_value,
    newValue: data.new_value,
    changeReason: data.change_reason ?? undefined,
    createdAt: data.created_at,
  };
}

// ============================================================================
// Get Edit History
// ============================================================================

export async function getEditHistory({
  specId,
  limit = 50,
  offset = 0,
}: EditHistoryQuery): Promise<EditLogEntry[]> {
  const client = createClient();
  const { data, error } = await client
    .from('edit_logs')
    .select('*')
    .eq('spec_id', specId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (data || []).map((row: Record<string, string | number | null>) => ({
    id: row.id,
    specId: row.spec_id,
    editor: row.editor ?? 'unknown',
    fieldPath: row.field_path,
    oldValue: row.old_value,
    newValue: row.new_value,
    changeReason: row.change_reason ?? undefined,
    createdAt: row.created_at,
  }));
}

// ============================================================================
// Format Helpers
// ============================================================================

export function formatFieldPath(fieldPath: string): string {
  const parts = fieldPath.split('.');
  return parts
    .map((p) => {
      const match = p.match(/^(\w+)\[(\d+)\]$/);
      if (match) return `${match[1]} #${parseInt(match[2]) + 1}`;
      const labels: Record<string, string> = {
        headline: '제목',
        body: '본문',
        sub_text: '부제',
        description: '설명',
        quote: '인용문',
        bullet_points: '목록',
        status: '상태',
        layout: '레이아웃',
        background: '배경',
        color_palette: '색상',
        font: '글꼴',
        cards: '카드',
        meta: '메타',
        text: '텍스트',
        style: '스타일',
      };
      return labels[p] ?? p;
    })
    .join(' › ');
}

export function groupEditsByCard(edits: EditLogEntry[]): Map<number, EditLogEntry[]> {
  const groups = new Map<number, EditLogEntry[]>();

  for (const edit of edits) {
    const match = edit.fieldPath.match(/cards\[(\d+)\]/);
    const cardIndex = match ? parseInt(match[1]) : -1;

    if (!groups.has(cardIndex)) {
      groups.set(cardIndex, []);
    }
    groups.get(cardIndex)!.push(edit);
  }

  return groups;
}

export function formatEditValue(value: string | null, maxLength = 60): string {
  if (value === null || value === undefined) return '(없음)';
  const str = String(value);
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str;
}
