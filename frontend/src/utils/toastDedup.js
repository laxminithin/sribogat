// Global toast de-duplication.
//
// react-hot-toast stacks a new toast for every call, so the same message fired
// twice shows twice. That happens all over the app: React StrictMode double-
// invokes effects in dev (e.g. "Dashboard data loaded successfully!" ×2), retries
// re-run a handler, and a couple of screens toast from more than one code path.
//
// Fix it once at the source: default each toast's `id` to its message text, so
// identical messages that are on screen at the same time collapse into a single
// toast instead of stacking. Different/dynamic messages get different ids and are
// unaffected. Callers that pass their own `id` (or any options) still win — their
// options are spread last.
//
// ponytail: patch the shared singleton once instead of adding id= to 200+ call
// sites across 34 files. Import for side effects before the app renders.
import { toast } from 'react-hot-toast';

const idFor = (message) => (typeof message === 'string' ? `msg:${message}` : undefined);

['success', 'error', 'loading'].forEach((type) => {
  const original = toast[type];
  toast[type] = (message, options = {}) =>
    original(message, { id: idFor(message), ...options });
});
