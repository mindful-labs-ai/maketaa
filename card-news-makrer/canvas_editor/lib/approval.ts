/**
 * Approval Workflow - Type-safe approval & rejection functions
 * Handles status transitions and publish report creation
 */

import {
  updateCardSpecStatusServer,
  recordEditServer,
  createPublishReport,
} from './api';
import { getServerClient } from './supabase';
import type { PublishReport } from '@/types';
import type { EditLogRecord } from './supabase';

// ============================================================================
// Types
// ============================================================================

export interface ApprovalError extends Error {
  code: 'INVALID_SPEC' | 'INVALID_STATUS' | 'DB_ERROR' | 'UNKNOWN';
  details?: any;
}

interface ApprovalResult {
  success: boolean;
  specId: string;
  newStatus: string;
  message: string;
  publishReports?: PublishReport[];
}

interface RejectionResult {
  success: boolean;
  specId: string;
  newStatus: string;
  message: string;
  editLog?: EditLogRecord;
}

interface ApprovalHistory {
  id: number;
  specId: string;
  fieldPath: string;
  oldValue: string | null;
  newValue: string;
  changeReason?: string;
  createdAt: string;
  editor: string;
}

// ============================================================================
// Approval
// ============================================================================

/**
 * Approve a card spec and create publish reports for platforms
 * - Updates status to 'approved'
 * - Creates publish_report entries for instagram + threads
 * - Logs action to edit_logs
 */
export async function approveCardSpec(
  specId: string,
  editor: string = 'system'
): Promise<ApprovalResult> {
  try {
    // Validate spec exists and is in correct status
    const client = getServerClient();
    const { data: spec, error: specError } = await client
      .from('card_specs')
      .select('*')
      .eq('id', specId)
      .single();

    if (specError || !spec) {
      const error: ApprovalError = new Error(
        `Card spec "${specId}" not found`
      ) as ApprovalError;
      error.code = 'INVALID_SPEC';
      throw error;
    }

    const currentStatus = spec.status;
    if (!['draft', 'review'].includes(currentStatus)) {
      const error: ApprovalError = new Error(
        `Cannot approve spec with status "${currentStatus}". Only draft or review can be approved.`
      ) as ApprovalError;
      error.code = 'INVALID_STATUS';
      throw error;
    }

    // Update status to 'approved'
    await updateCardSpecStatusServer(specId, 'approved');

    // Create publish reports for platforms
    const publishReports = await Promise.all([
      createPublishReport(specId, 'instagram', 'pending'),
      createPublishReport(specId, 'threads', 'pending'),
    ]);

    // Log approval to edit_logs
    await recordEditServer(
      specId,
      'meta.status',
      currentStatus,
      'approved',
      'Approved for publishing',
      editor
    );

    console.log(`[Approval] Card spec ${specId} approved by ${editor}`);

    return {
      success: true,
      specId,
      newStatus: 'approved',
      message: `Card spec approved. Publishing to 2 platforms.`,
      publishReports,
    };
  } catch (error) {
    console.error('[Approval] Error approving card spec:', error);
    throw error;
  }
}

// ============================================================================
// Rejection
// ============================================================================

/**
 * Reject a card spec and revert to draft status
 * - Updates status to 'rejected' → reverts to 'draft'
 * - Logs rejection reason to edit_logs
 */
export async function rejectCardSpec(
  specId: string,
  reason: string,
  editor: string = 'system'
): Promise<RejectionResult> {
  try {
    // Validate spec exists
    const client = getServerClient();
    const { data: spec, error: specError } = await client
      .from('card_specs')
      .select('*')
      .eq('id', specId)
      .single();

    if (specError || !spec) {
      const error: ApprovalError = new Error(
        `Card spec "${specId}" not found`
      ) as ApprovalError;
      error.code = 'INVALID_SPEC';
      throw error;
    }

    const currentStatus = spec.status;

    // Revert to draft
    await updateCardSpecStatusServer(specId, 'draft');

    // Log rejection with reason
    const editLog = await recordEditServer(
      specId,
      'meta.status',
      currentStatus,
      'draft',
      `Rejected: ${reason}`,
      editor
    );

    console.log(`[Rejection] Card spec ${specId} rejected by ${editor}`);

    return {
      success: true,
      specId,
      newStatus: 'draft',
      message: `Card spec rejected and reverted to draft.`,
      editLog,
    };
  } catch (error) {
    console.error('[Rejection] Error rejecting card spec:', error);
    throw error;
  }
}

// ============================================================================
// Approval History
// ============================================================================

/**
 * Get approval history (status changes) for a spec
 * Returns all edit_logs entries where field_path is 'meta.status'
 */
export async function getApprovalHistory(
  specId: string,
  limit: number = 50
): Promise<ApprovalHistory[]> {
  try {
    const client = getServerClient();
    const { data: logs, error } = await client
      .from('edit_logs')
      .select('*')
      .eq('spec_id', specId)
      .eq('field_path', 'meta.status')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (logs || []).map((log) => ({
      id: log.id,
      specId: log.spec_id,
      fieldPath: log.field_path,
      oldValue: log.old_value,
      newValue: log.new_value,
      changeReason: log.change_reason,
      createdAt: log.created_at,
      editor: log.editor,
    }));
  } catch (error) {
    console.error('[ApprovalHistory] Error fetching history:', error);
    throw error;
  }
}

// ============================================================================
// Publish Trigger
// ============================================================================

/**
 * Trigger publishing to SNS platforms
 * This is a placeholder for calling the publisher agent webhook
 *
 * In production:
 * - Call external webhook (e.g., SNS topic trigger)
 * - Update publish_reports status
 * - Emit events for monitoring
 */
export async function triggerPublish(specId: string): Promise<void> {
  try {
    // Placeholder: In production, this would call the publisher agent webhook
    // Example:
    // const response = await fetch('https://publisher-agent.example.com/publish', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ spec_id: specId }),
    // });
    // if (!response.ok) throw new Error('Publisher webhook failed');

    console.log(
      `[Publish] Triggered publishing for spec ${specId} (webhook not implemented)`
    );
  } catch (error) {
    console.error('[Publish] Error triggering publish:', error);
    throw error;
  }
}

// ============================================================================
// Error Helper
// ============================================================================

/**
 * Create a typed approval error
 */
export function createApprovalError(
  message: string,
  code: ApprovalError['code'],
  details?: any
): ApprovalError {
  const error = new Error(message) as ApprovalError;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Check if error is an ApprovalError
 */
export function isApprovalError(error: any): error is ApprovalError {
  return error && typeof error.code === 'string' && error.code in ['INVALID_SPEC', 'INVALID_STATUS', 'DB_ERROR', 'UNKNOWN'];
}
