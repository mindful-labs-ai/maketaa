import { createClient } from '@/lib/supabase/server';
import { CREDIT_COSTS, CREDIT_DESCRIPTIONS, type CreditCostKey } from './pricing';

export interface ConsumeResult {
  success: boolean;
  balance?: number;
  error?: 'INSUFFICIENT_CREDITS' | 'NO_BALANCE_RECORD';
  required?: number;
  transaction_id?: string;
}

export async function consumeCredits(
  userId: string,
  costKey: CreditCostKey,
  multiplier: number = 1,
  metadata?: Record<string, unknown>,
): Promise<ConsumeResult> {
  const amount = CREDIT_COSTS[costKey] * multiplier;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('consume_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_description: CREDIT_DESCRIPTIONS[costKey],
    p_metadata: { costKey, multiplier, ...metadata },
  });

  if (error) throw error;
  return data as ConsumeResult;
}
