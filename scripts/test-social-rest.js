#!/usr/bin/env node

import qs from 'qs';

const token = process.argv[2] || process.env.OAUTH_TOKEN;
const userId = process.argv[3] || process.env.USER_ID;

if (!token) {
  console.error('Usage: node test-social-rest.js <token> [userId]');
  console.error('  token  - OAuth access token');
  console.error('  userId - (optional) your PD2 user _id for conversation lookup');
  console.error('\nOr set OAUTH_TOKEN / USER_ID environment variables');
  process.exit(1);
}

const API_BASE = 'https://api.projectdiablo2.com';

async function fetchJson(label, url) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`→ ${label}`);
  console.log(`  GET ${url}`);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`  Status: ${res.status} ${res.statusText}`);

    const body = await res.text();
    try {
      const json = JSON.parse(body);
      console.log(`  Response:`, JSON.stringify(json, null, 2).substring(0, 2000));
      return { ok: res.ok, status: res.status, data: json };
    } catch {
      console.log(`  Response (text):`, body.substring(0, 500));
      return { ok: res.ok, status: res.status, data: body };
    }
  } catch (err) {
    console.error(`  ✗ Network error:`, err.message);
    return { ok: false, status: 0, data: null };
  }
}

// ── Step 1: Get current user via /me if no userId provided ──
let resolvedUserId = userId;

if (!resolvedUserId) {
  console.log('\nNo userId provided, fetching from /security/user...');

  // First get identity from OAuth /me
  const meResult = await fetchJson('OAuth /me (identity)', `${API_BASE}/security/me`);

  if (meResult.ok && meResult.data?.sub) {
    resolvedUserId = meResult.data.sub;
    console.log(`  ✓ Got user sub: ${resolvedUserId}`);
  } else if (meResult.ok && meResult.data?._id) {
    resolvedUserId = meResult.data._id;
    console.log(`  ✓ Got user _id: ${resolvedUserId}`);
  } else {
    console.log('  Could not determine userId from /me, trying /security/session...');

    // Try authenticating to get user info
    try {
      const sessionRes = await fetch(`${API_BASE}/security/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ strategy: 'oauth', accessToken: token }),
      });

      const sessionBody = await sessionRes.text();
      console.log(`  Session status: ${sessionRes.status}`);

      try {
        const sessionData = JSON.parse(sessionBody);
        console.log(`  Session response:`, JSON.stringify(sessionData, null, 2).substring(0, 500));

        if (sessionData?.user?._id) {
          resolvedUserId = sessionData.user._id;
          console.log(`  ✓ Got user _id from session: ${resolvedUserId}`);
        }
      } catch {
        console.log(`  Session response (text):`, sessionBody.substring(0, 300));
      }
    } catch (err) {
      console.error(`  ✗ Session error:`, err.message);
    }
  }
}

if (!resolvedUserId) {
  console.error('\n✗ Could not determine userId. Pass it as second argument.');
  process.exit(1);
}

console.log(`\n✓ Using userId: ${resolvedUserId}`);

// ── Step 2: GET /social/conversation ──
const convQuery = qs.stringify(
  {
    participant_ids: resolvedUserId,
    $limit: 100,
    $skip: 0,
    $resolve: {
      participants: true,
      unreadCount: true,
      latestMessage: { sender: true },
    },
  },
  { arrayFormat: 'indices', encodeValuesOnly: true },
);

const convResult = await fetchJson(
  'GET /social/conversation',
  `${API_BASE}/social/conversation?${convQuery}`,
);

// ── Step 3: GET /social/message for first conversation ──
if (convResult.ok && convResult.data?.data?.length > 0) {
  const firstConv = convResult.data.data[0];
  console.log(`\n  ✓ Found ${convResult.data.data.length} conversation(s)`);
  console.log(`  First conversation: ${firstConv._id}`);

  const msgQuery = qs.stringify(
    {
      conversation_id: firstConv._id,
      $sort: { created_at: 1 },
      $limit: 10,
      $resolve: { sender: true },
    },
    { arrayFormat: 'indices', encodeValuesOnly: true },
  );

  await fetchJson(
    `GET /social/message (conversation: ${firstConv._id})`,
    `${API_BASE}/social/message?${msgQuery}`,
  );
} else {
  console.log('\n  No conversations found (or request failed), skipping message test.');
}

console.log(`\n${'─'.repeat(60)}`);
console.log('Done.');
