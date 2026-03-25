import { useCreditStore } from './useCreditStore';
import { useInsufficientCreditsDialog } from './useInsufficientCreditsHandler';

/**
 * Wrapper around fetch for credit-consuming API calls.
 * - On 402: shows the insufficient credits dialog automatically
 * - On success (2xx POST): refreshes the credit balance in the sidebar/topnav
 *
 * Usage: replace `fetch('/api/...', { method: 'POST', ... })`
 *   with `creditFetch('/api/...', { method: 'POST', ... })`
 */
export async function creditFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status === 402) {
    try {
      const clone = res.clone();
      const data = await clone.json();
      useInsufficientCreditsDialog
        .getState()
        .show(data.balance ?? 0, data.required ?? 0);
    } catch {
      // best-effort
    }
  } else if (res.ok && init?.method?.toUpperCase() === 'POST') {
    // Refresh credit balance in the background (non-blocking)
    useCreditStore.getState().fetch();
  }

  return res;
}
