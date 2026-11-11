const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDir;
process.env.MAX_FILE_SIZE_BYTES = '1024';

const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(storageDir, { recursive: true, force: true });
});

function uploadFile(userId, content = 'conteúdo de teste', fileName = 'relatorio.txt') {
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), fileName);
  const headers = userId ? { 'X-User-Id': userId } : {};
  return fetch(`${baseUrl}/upload`, { method: 'POST', body: form, headers });
}

test('POST /upload grava o arquivo em disco e retorna os metadados', async () => {
  const response = await uploadFile('alice');
  const body = await response.json();

  assert.strictEqual(response.status, 201);
  assert.ok(body.id);
  assert.strictEqual(body.originalName, 'relatorio.txt');
  assert.strictEqual(body.owner, 'alice');
  assert.strictEqual(body.size, Buffer.byteLength('conteúdo de teste'));
  assert.strictEqual(body.storedName, undefined);
  assert.strictEqual(fs.readdirSync(storageDir).length >= 1, true);
});

test('POST /upload sem X-User-Id retorna 400', async () => {
  const response = await uploadFile(null);
  assert.strictEqual(response.status, 400);
});

test('POST /upload sem arquivo retorna 400', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData(),
    headers: { 'X-User-Id': 'alice' },
  });
  assert.strictEqual(response.status, 400);
});

test('POST /upload acima do limite retorna 413', async () => {
  const response = await uploadFile('alice', 'x'.repeat(2048));
  assert.strictEqual(response.status, 413);
});

test('GET /documents lista apenas os documentos do usuário', async () => {
  await uploadFile('bob', 'arquivo do bob', 'bob.txt');

  const response = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': 'bob' } });
  const body = await response.json();

  assert.strictEqual(response.status, 200);
  assert.ok(body.length >= 1);
  assert.ok(body.every((document) => document.owner === 'bob'));
});

test('GET /documents sem X-User-Id retorna 400', async () => {
  const response = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(response.status, 400);
});

test('GET /documents/:id/download retorna o arquivo ao dono', async () => {
  const created = await (await uploadFile('carol', 'conteúdo da carol', 'carol.txt')).json();

  const response = await fetch(`${baseUrl}/documents/${created.id}/download`, {
    headers: { 'X-User-Id': 'carol' },
  });

  assert.strictEqual(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /carol\.txt/);
  assert.strictEqual(await response.text(), 'conteúdo da carol');
});

test('GET /documents/:id/download retorna 404 para outro usuário', async () => {
  const created = await (await uploadFile('dave')).json();

  const response = await fetch(`${baseUrl}/documents/${created.id}/download`, {
    headers: { 'X-User-Id': 'eve' },
  });
  assert.strictEqual(response.status, 404);
});

test('GET /documents/:id/download retorna 404 para id inexistente', async () => {
  const response = await fetch(`${baseUrl}/documents/inexistente/download`, {
    headers: { 'X-User-Id': 'alice' },
  });
  assert.strictEqual(response.status, 404);
});
