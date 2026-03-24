/**
 * Edit Logger - Type-safe edit logging and history functions
 * Records all manual edits with field paths, old/new values, and optional reasons
 */

import { getServerClient } from './supabase';
import type { EditLog } from '@/types';

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

export interface EditSummary {
  specId: string;
  totalEdits: number;
  uniqueEditors: number;
  lastEditedAt: string | null;
  mostEditedField: string | null;
  editsByField: Record<string, number>;
  editFrequency: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
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

/**
 * Record a single edit to the edit_logs table
 * Validates field path format and captures before/after values
 */
export async function createEditLog(
  specId: string,
  editor: string,
  fieldPath: string,
  oldValue: string | null,
  newValue: string,
  reason?: string
): Promise<EditLogEntry> {
  try {
    // Validate inputs
    if (!specId || !fieldPath || newValue === undefined) {
      throw new Error('Missing required parameters: specId, fieldPath, newValue');
    }

    // Validate field path format (e.g., "cards[2].text.headline")
    if (!isValidFieldPath(fieldPath)) {
      throw new Error(`Invalid field path format: "${fieldPath}"`);
    }

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
          change_reason: reason,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create edit log');

    return {
      id: data.id,
      specId: data.spec_id,
      editor: data.editor,
      fieldPath: data.field_path,
      oldValue: data.old_value,
      newValue: data.new_value,
      changeReason: data.change_reason,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('[EditLogger] Error creating edit log:', error);
    throw error;
  }
}

// ============================================================================
// Get Edit History
// ============================================================================

/**
 * Fetch edit history for a spec with optional filtering and pagination
 */
export async function getEditHistory(
  query: EditHistoryQuery
): Promise<EditLogEntry[]> {
  try {
    const { specId, limit = 50, offset = 0, fieldPath, editor } = query;

    const client = getServerClient();
    let queryBuilder = client
      .from('edit_logs')
      .select('*')
      .eq('spec_id', specId)
      .order('created_at', { ascending: false });

    if (fieldPath) {
      queryBuilder = queryBuilder.eq('field_path', fieldPath);
    }

    if (editor) {
      queryBuilder = queryBuilder.eq('editor', editor);
    }

    const { data, error } = await queryBuilder.range(offset, offset + limit - 1);

    if (error) throw error;

    return (data || []).map((log) => ({
      id: log.id,
      specId: log.spec_id,
      editor: log.editor,
      fieldPath: log.field_path,
      oldValue: log.old_value,
      newValue: log.new_value,
      changeReason: log.change_reason,
      createdAt: log.created_at,
    }));
  } catch (error) {
    console.error('[EditLogger] Error fetching edit history:', error);
    throw error;
  }
}

// ============================================================================
// Get Edit Summary (Aggregate Stats)
// ============================================================================

/**
 * Get aggregate statistics for edits on a spec
 * Includes total edits, unique editors, most edited fields, edit frequency
 */
export async function getEditSummary(specId: string): Promise<EditSummary> {
  try {
    const client = getServerClient();

    // Fetch all edits for the spec
    const { data: logs, error } = await client
      .from('edit_logs')
      .select('*')
      .eq('spec_id', specId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const edits = logs || [];

    // Calculate statistics
    const uniqueEditors = new Set(edits.map((log) => log.editor));
    const editsByField: Record<string, number> = {};
    let lastEditedAt: string | null = null;
    let mostEditedField: string | null = null;
    let maxEdits = 0;

    // Aggregate field edits
    edits.forEach((log) => {
      editsByField[log.field_path] = (editsByField[log.field_path] || 0) + 1;
      lastEditedAt = log.created_at;

      if (editsByField[log.field_path] > maxEdits) {
        maxEdits = editsByField[log.field_path];
        mostEditedField = log.field_path;
      }
    });

    // Calculate edit frequency
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const editFrequency = {
      today: edits.filter(
        (log) => new Date(log.created_at).getTime() >= today.getTime()
      ).length,
      thisWeek: edits.filter(
        (log) => new Date(log.created_at).getTime() >= weekStart.getTime()
      ).length,
      thisMonth: edits.filter(
        (log) => new Date(log.created_at).getTime() >= monthStart.getTime()
      ).length,
    };

    return {
      specId,
      totalEdits: edits.length,
      uniqueEditors: uniqueEditors.size,
      lastEditedAt,
      mostEditedField,
      editsByField,
      editFrequency,
    };
  } catch (error) {
    console.error('[EditLogger] Error computing edit summary:', error);
    throw error;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Validate field path format
 * Examples: "cards[2].text.headline", "meta.status", "sns.instagram.caption"
 */
function isValidFieldPath(fieldPath: string): boolean {
  // Allow alphanumeric, dots, brackets, and basic path structure
  const pathRegex = /^[a-zA-Z_][a-zA-Z0-9_]*(\[\d+\])?(\.[a-zA-Z_][a-zA-Z0-9_]*(\[\d+\])?)*$/;
  return pathRegex.test(fieldPath);
}

/**
 * Format field path for display
 * e.g., "cards[2].text.headline" → "Card 3 - Headline"
 */
export function formatFieldPath(fieldPath: string): string {
  // cards[2].text.headline → "Card 3 - Headline"
  const cardMatch = fieldPath.match(/cards\[(\d+)\]/);
  const lastSegment = fieldPath.split('.').pop();

  if (cardMatch) {
    const cardIndex = parseInt(cardMatch[1], 10) + 1;
    return `Card ${cardIndex} - ${lastSegment || fieldPath}`;
  }

  return fieldPath;
}

/**
 * Group edit logs by card index
 */
export function groupEditsByCard(
  edits: EditLogEntry[]
): Map<number, EditLogEntry[]> {
  const grouped = new Map<number, EditLogEntry[]>();

  edits.forEach((edit) => {
    const cardMatch = edit.fieldPath.match(/cards\[(\d+)\]/);
    const cardIndex = cardMatch ? parseInt(cardMatch[1], 10) : -1;

    if (!grouped.has(cardIndex)) {
      grouped.set(cardIndex, []);
    }
    grouped.get(cardIndex)!.push(edit);
  });

  return grouped;
}

/**
 * Format value for display (truncate long strings)
 */
export function formatEditValue(value: string | null, maxLength: number = 60): string {
  if (!value) return '(empty)';
  return value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
}
