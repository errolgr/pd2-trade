#!/usr/bin/env node

import io from 'socket.io-client';

const token = process.argv[2] || process.env.OAUTH_TOKEN;

if (!token) {
  console.error('Usage: node test-oauth-socket.js <token>');
  console.error('Or set OAUTH_TOKEN environment variable');
  process.exit(1);
}

console.log('Testing /security/session with OAuth token via raw WebSocket...\n');

const socket = io('wss://api.projectdiablo2.com', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket']
});

let gotResponse = false;

socket.on('connect', () => {
  console.log('✓ Socket.IO connected');
  
  // Access raw WebSocket like the app does
  const rawSocket = socket.io.engine.transport.ws;
  
  if (!rawSocket) {
    console.error('✗ Could not access raw WebSocket');
    process.exit(1);
  }
  
  console.log('✓ Raw WebSocket accessed');
  
  // Set up message handler
  const messageHandler = (event) => {
    const data = event.data;
    console.log('\n← Received raw message:', data.substring(0, 100) + (data.length > 100 ? '...' : ''));
    
    if (typeof data === 'string') {
      const match = data.match(/^(\d+)(.+)$/);
      if (match) {
        const code = match[1];
        const payload = match[2];
        
        console.log(`  Code: ${code}`);
        
        try {
          const parsed = JSON.parse(payload);
          console.log('  Payload:', JSON.stringify(parsed, null, 2));
          
          if (code === '421') {
            gotResponse = true;
            rawSocket.removeEventListener('message', messageHandler);
            socket.close();
            process.exit(0);
          }
        } catch (e) {
          console.log('  (Could not parse as JSON)');
        }
      }
    }
  };
  
  rawSocket.addEventListener('message', messageHandler);
  
  // Send auth message using PD2's custom protocol
  const authMsg = ['create', 'security/session', { strategy: 'oauth', accessToken: token }];
  const payload = '420' + JSON.stringify(authMsg);
  
  console.log('\n→ Sending raw WebSocket message:');
  console.log('  Code: 420');
  console.log('  Payload:', JSON.stringify(authMsg, null, 2));
  
  rawSocket.send(payload);
});

socket.on('error', (err) => {
  if (!gotResponse) {
    console.error('\n✗ Socket error:', err);
    process.exit(1);
  }
});

socket.on('connect_error', (err) => {
  if (!gotResponse) {
    console.error('\n✗ Connection error:', err);
    process.exit(1);
  }
});

socket.on('disconnect', () => {
  if (!gotResponse) {
    console.log('\n✗ Disconnected without response');
    process.exit(1);
  }
});

setTimeout(() => {
  if (!gotResponse) {
    console.error('\n✗ Timeout - no response after 10 seconds');
    socket.close();
    process.exit(1);
  }
}, 10000);
