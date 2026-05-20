// LinkedIn — action-list only. No API; automation violates ToS.
// The runner never calls send() here; drafts surface in the daily worklist UI
// where Nick copies the message and pastes it into LinkedIn manually.

export async function send() {
  throw new Error(
    'LinkedIn is action-list only — drafts must be sent manually from the worklist UI.',
  );
}

export async function testConnection() {
  return { ok: true, detail: 'action-list channel; no transport to test' };
}
