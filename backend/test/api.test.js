const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { io: connect } = require('socket.io-client');

const PORT = 4590;
const BASE = `http://127.0.0.1:${PORT}/api`;
const dbFile = path.join(os.tmpdir(), `incidents-test-${Date.now()}.db`);
let proc;

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function api(method, url, { body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + url, { method, headers, body: form || (body && JSON.stringify(body)) });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

before(async () => {
  proc = spawn(process.execPath, ['--no-warnings', path.join(__dirname, '..', 'src', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), DB_FILE: dbFile, JWT_SECRET: 'test' },
    stdio: 'pipe',
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/health`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not start');
});

after(() => { proc.kill(); try { fs.unlinkSync(dbFile); } catch {} });

test('full incident flow', async () => {
  // categories seeded
  const cats = await api('GET', '/categories');
  assert.ok(cats.data.some((c) => c.slug === 'accident'));

  // register + login
  const reg = await api('POST', '/auth/register', { body: { name: 'Ada', email: 'ada@example.com', password: 'secret1' } });
  assert.strictEqual(reg.status, 201);
  assert.strictEqual((await api('POST', '/auth/register', { body: { name: 'Ada', email: 'ADA@example.com', password: 'secret1' } })).status, 409);
  assert.strictEqual((await api('POST', '/auth/login', { body: { email: 'ada@example.com', password: 'wrong' } })).status, 401);
  const login = await api('POST', '/auth/login', { body: { email: 'ada@example.com', password: 'secret1' } });
  assert.strictEqual(login.status, 200);
  const token = login.data.token;
  assert.strictEqual((await api('GET', '/auth/me', { token })).data.user.name, 'Ada');

  // second user listens on socket
  const bob = (await api('POST', '/auth/register', { body: { name: 'Bob', email: 'bob@example.com', password: 'secret2' } })).data;
  const socket = connect(`http://127.0.0.1:${PORT}`, { transports: ['websocket'] });
  await new Promise((r) => socket.on('connect', r));
  const gotEvent = new Promise((r) => socket.on('incident:new', r));

  // unauthenticated create rejected
  assert.strictEqual((await api('POST', '/incidents', { body: { title: 'x' } })).status, 401);

  // validation
  const bad = new FormData();
  bad.append('title', 'No location'); bad.append('category', 'accident');
  assert.strictEqual((await api('POST', '/incidents', { token, form: bad })).status, 400);

  // create with image
  const form = new FormData();
  form.append('title', 'Two-car collision');
  form.append('description', 'At the junction');
  form.append('category', 'accident');
  form.append('latitude', '6.5244');
  form.append('longitude', '3.3792');
  form.append('address', 'Lagos');
  form.append('images', new Blob([PNG], { type: 'image/png' }), 'photo.png');
  const created = await api('POST', '/incidents', { token, form });
  assert.strictEqual(created.status, 201, JSON.stringify(created.data));
  assert.strictEqual(created.data.images.length, 1);
  assert.strictEqual(created.data.latitude, 6.5244);
  assert.strictEqual((await fetch(created.data.images[0])).status, 200);

  const evt = await gotEvent;
  assert.strictEqual(evt.id, created.data.id);
  socket.close();

  // Bob creates a fight report
  const f2 = new FormData();
  f2.append('title', 'Street fight'); f2.append('category', 'fighting');
  f2.append('latitude', '9.0765'); f2.append('longitude', '7.3986');
  await api('POST', '/incidents', { token: bob.token, form: f2 });

  // browse all / by category / mine
  assert.strictEqual((await api('GET', '/incidents')).data.total, 2);
  const acc = await api('GET', '/incidents?category=accident');
  assert.deepStrictEqual(acc.data.items.map((i) => i.title), ['Two-car collision']);
  const mine = await api('GET', '/incidents/mine', { token: bob.token });
  assert.deepStrictEqual(mine.data.items.map((i) => i.title), ['Street fight']);
  assert.strictEqual((await api('GET', '/incidents/mine')).status, 401);

  // detail + ownership on delete
  assert.strictEqual((await api('GET', `/incidents/${created.data.id}`)).data.user.name, 'Ada');
  assert.strictEqual((await api('DELETE', `/incidents/${created.data.id}`, { token: bob.token })).status, 403);
  assert.strictEqual((await api('DELETE', `/incidents/${created.data.id}`, { token })).status, 204);
  assert.strictEqual((await api('GET', '/incidents')).data.total, 1);

  // push token registration
  assert.strictEqual((await api('POST', '/push-tokens', { token, body: { token: 'ExponentPushToken[abc123]' } })).status, 200);
  assert.strictEqual((await api('POST', '/push-tokens', { body: { token: 'junk' } })).status, 400);
});
