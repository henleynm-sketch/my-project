import { brand } from '../config.js';

// Per-channel voice + length constraints. Drafts are generated against these
// so the same person gets a different tone for SMS vs email vs LinkedIn.
const CHANNEL_RULES = {
  email: {
    bodyHint: '120–180 words. Subject line required.',
    voice: 'Warm but professional. Reference one concrete shared context (mutual project, region, affiliation) if available.',
    needsSubject: true,
  },
  sms: {
    bodyHint: 'Under 320 characters. No subject. Plain text.',
    voice: 'Direct, friendly, almost text-message-casual. Sign as "Nick".',
    needsSubject: false,
  },
  whatsapp: {
    bodyHint: 'Under 600 characters. No subject.',
    voice: 'Casual and warm — WhatsApp feels personal. Sign as "Nick".',
    needsSubject: false,
  },
  messenger: {
    bodyHint: 'Under 500 characters.',
    voice: 'Conversational, lightweight. Treat like a Facebook DM.',
    needsSubject: false,
  },
  instagram: {
    bodyHint: 'Under 400 characters.',
    voice: 'Visual-medium voice — reference their work/recent post if context allows. Keep it brief.',
    needsSubject: false,
  },
  linkedin: {
    bodyHint: '60–120 words. No subject. Will be pasted into LinkedIn manually.',
    voice: 'Professional, peer-to-peer. Avoid pitch-y openings. Reference how the connection happened or shared work.',
    needsSubject: false,
  },
};

export function getChannelRules(channel) {
  const r = CHANNEL_RULES[channel];
  if (!r) throw new Error(`No drafting rules for channel: ${channel}`);
  return r;
}

export function systemPrompt() {
  return [
    `You are drafting outreach on behalf of ${brand.principal}, principal of ${brand.company} (founded ${brand.founded}, based in ${brand.hq}).`,
    `Service area: ${brand.service_area.join(', ')}. Affiliations: ${brand.affiliations.join(', ')}.`,
    `Voice: senior, plain-spoken, never salesy. Nick is a P.Eng. and MBA running a 35-year-old residential renovation company; he does not need to impress anyone.`,
    `Hard rules:`,
    `- Never invent shared history, mutual contacts, or specifics about the recipient that aren't supplied.`,
    `- Never use the words "synergy", "circle back", "touch base", "leverage", "reach out" (use "get in touch" instead).`,
    `- No em-dashes. No emoji unless the channel explicitly allows it (none currently do).`,
    `- Always end with a specific, low-friction next step (a question, not a meeting ask, unless context warrants).`,
  ].join('\n');
}

export function userPrompt({ contact, channel, intent }) {
  const rules = getChannelRules(channel);
  const lines = [
    `Channel: ${channel}`,
    `Voice: ${rules.voice}`,
    `Length: ${rules.bodyHint}`,
    rules.needsSubject ? `Output JSON: { "subject": "...", "body": "..." }` : `Output JSON: { "body": "..." }`,
    ``,
    `Recipient:`,
    `  Name: ${contact.full_name}`,
    contact.company ? `  Company: ${contact.company}` : null,
    contact.headline ? `  Role: ${contact.headline}` : null,
    contact.segment ? `  Segment: ${contact.segment}` : null,
    contact.hubspot_context_json ? `  HubSpot context: ${contact.hubspot_context_json}` : null,
    ``,
    `Intent: ${intent || 'Light-touch re-engagement; reopen the relationship without a specific ask.'}`,
    ``,
    `Return JSON only. No prose before or after.`,
  ].filter(Boolean);
  return lines.join('\n');
}
