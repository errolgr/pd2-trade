#!/usr/bin/env node

import io from 'socket.io-client';

const token = 'OAWd14DmJyO2WoW8n1a67hgiNvXddbvXLfFWVo1zmsP';
const variations = [
  { strategy: 'local', username: token },
  { strategy: 'local', email: token },
  { strategy: 'local', password: token },
  { strategy: 'local', accessToken: token, username: 'user' },
  { strategy: 'local', accessToken: token, password: 'pass' },
  { username: token },
  { password: token },
  { token },
  { token: token },
];

const test = async (obj, label) => {
  return new Promise((resolve) => {
    const socket = io('wss://api.projectdiablo2.com', {
      transports: ['websocket'],
      reconnectionAttempts: 1,
      reconnectionDelay: 300,
    });

    socket.on('connect', () => {
      const rawSocket = socket.io.engine.transport.ws;
      let firstMsg = true;

      const handler = (e) => {
        if (firstMsg) {
          firstMsg = false;
          const code = e.data.substring(0, 3);
          const payload = e.data.substring(3);

          try {
            const parsed = JSON.parse(payload);
            if (code === '430') {
              console.log(`❌ ${label}:`);
              console.log(JSON.stringify(parsed, null, 2));
            } else if (code === '421') {
              console.log(`✅ ${label}: SUCCESS`);
              console.log(`   Response:`, JSON.stringify(parsed));
            } else {
              console.log(`? ${label}: Code ${code}`);
            }
          } catch (err) {
            console.log(`? ${label}: Unparseable response`);
          }

          rawSocket.removeEventListener('message', handler);
          socket.close();
          resolve();
        }
      };

      rawSocket.addEventListener('message', handler);
      rawSocket.send('420' + JSON.stringify(['create', 'security/session', obj]));
    });

    socket.on('connect_error', () => {
      resolve();
    });

    setTimeout(() => {
      if (socket.connected) socket.close();
      resolve();
    }, 2000);
  });
};

console.log('Testing various auth formats...\n');
for (const v of variations) {
  const label = JSON.stringify(v).substring(0, 60);
  await test(v, label);
}

process.exit(0);
