#!/usr/bin/env node

/**
 * Test PD2 Social API endpoints
 *
 * Usage:
 *   node test-social-endpoints.js <oauth_token>
 *
 * Tests:
 *   1. POST /security/session  (authenticate + get user ID)
 *   2. GET  /social/conversation (list conversations)
 *   3. GET  /social/message      (get messages for first conversation)
 */

const token = process.argv[2] || process.env.OAUTH_TOKEN;

if (!token) {
  console.error('Usage: node test-social-endpoints.js <oauth_token>');
  process.exit(1);
}

const API = 'https://api.projectdiablo2.com';

async function timedFetch(label, url, options = {}, timeoutMs = 15000) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`→ ${label}`);
  console.log(`  ${options.method || 'GET'} ${url}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    console.log(`  Status: ${res.status} ${res.statusText} (${elapsed}ms)`);

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const preview = JSON.stringify(json, null, 2);
      console.log(`  Response:\n${preview.substring(0, 2000)}${preview.length > 2000 ? '\n  ...(truncated)' : ''}`);
      return { ok: res.ok, status: res.status, data: json };
    } catch {
      console.log(`  Response (text): ${text.substring(0, 500)}`);
      return { ok: res.ok, status: res.status, data: text };
    }
  } catch (err) {
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    if (err.name === 'AbortError') {
      console.error(`  ✗ TIMED OUT after ${timeoutMs}ms`);
    } else {
      console.error(`  ✗ ERROR (${elapsed}ms):`, err.message);
    }
    return { ok: false, status: 0, data: null };
  }
}

// ── Step 1: Authenticate ──
console.log('=== PD2 Social API Test ===');

const sessionResult = await timedFetch(
  'Step 1: POST /security/session (authenticate)',
  `${API}/security/session`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy: 'oauth', accessToken: token }),
  },
);

const userId = sessionResult.data?.user?._id;
if (!userId) {
  console.error('\n✗ Could not get user ID from session. Aborting.');
  process.exit(1);
}
console.log(`\n✓ User ID: ${userId}`);

// ── Step 2: Get Conversations ──
const convUrl = new URL(`${API}/social/conversation`);
convUrl.searchParams.set('participant_ids', userId);
convUrl.searchParams.set('$limit', '100');
convUrl.searchParams.set('$skip', '0');
convUrl.searchParams.set('$resolve[participants]', 'true');
convUrl.searchParams.set('$resolve[unreadCount]', 'true');
convUrl.searchParams.set('$resolve[latestMessage][sender]', 'true');

const convResult = await timedFetch(
  'Step 2: GET /social/conversation',
  convUrl.toString(),
  { headers: { Authorization: `Bearer ${token}` } },
);

const conversations = convResult.data?.data || [];
console.log(`\n✓ Found ${conversations.length} conversation(s)`);

if (conversations.length === 0) {
  console.log('\nNo conversations to test messages with. Done.');
  process.exit(0);
}

const firstConv = conversations[0];
console.log(`  First conversation: ${firstConv._id}`);

// ── Step 3: Get Messages ──
const msgUrl = new URL(`${API}/social/message`);
msgUrl.searchParams.set('conversation_id', firstConv._id);
msgUrl.searchParams.set('$sort[created_at]', '1');
msgUrl.searchParams.set('$limit', '500');
msgUrl.searchParams.set('$resolve[sender]', 'true');

const msgResult = await timedFetch(
  `Step 3: GET /social/message (conversation: ${firstConv._id})`,
  msgUrl.toString(),
  { headers: { Authorization: `Bearer ${token}` } },
);

if (msgResult.ok) {
  const messages = msgResult.data?.data || [];
  console.log(`\n✓ Found ${messages.length} message(s)`);
} else {
  console.log(`\n✗ Messages request failed or timed out`);
}

console.log(`\n${'─'.repeat(60)}`);
console.log('Done.');
