const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');
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

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(storageDir, { recursive: true, force: true });
});

function uniqueUser() {
  return `user-${randomUUID()}`;
}

function uploadFile(userId, content = 'conteúdo de teste', fileName = 'relatorio.txt', type = 'text/plain') {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), fileName);
  const headers = userId ? { 'X-User-Id': userId } : {};
  return fetch(`${baseUrl}/upload`, { method: 'POST', body: form, headers });
}

function downloadFile(userId, id) {
  return fetch(`${baseUrl}/documents/${id}/download`, { headers: { 'X-User-Id': userId } });
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

test('GET /documents lista apenas os documentos do usuário, do mais recente ao mais antigo', async () => {
  const owner = uniqueUser();
  const first = await (await uploadFile(owner, 'primeiro', 'primeiro.txt')).json();
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = await (await uploadFile(owner, 'segundo', 'segundo.txt')).json();
  await uploadFile(uniqueUser(), 'de outro usuário');

  const response = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': owner } });
  const body = await response.json();

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(body.map((document) => document.id), [second.id, first.id]);
});

test('X-User-Id inválido retorna 400', async () => {
  const response = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': '../admin' } });
  assert.strictEqual(response.status, 400);
});

test('POST /upload preserva nomes não-ASCII', async () => {
  const owner = uniqueUser();
  const created = await (await uploadFile(owner, 'conteúdo', 'relatório-ação.txt')).json();

  assert.strictEqual(created.originalName, 'relatório-ação.txt');
  const response = await downloadFile(owner, created.id);
  assert.match(response.headers.get('content-disposition'), /filename="relatório-ação\.txt"/);
});

test('GET /documents/:id/download usa octet-stream para tipo inválido e envia nosniff', async () => {
  const owner = uniqueUser();
  const created = await (await uploadFile(owner, 'x', 'x.bin', 'tipo inválido')).json();

  const response = await downloadFile(owner, created.id);

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.headers.get('content-type'), 'application/octet-stream');
  assert.strictEqual(response.headers.get('x-content-type-options'), 'nosniff');
});

test('GET /documents/:id/download retorna 404 quando o arquivo sumiu do disco', async () => {
  const owner = uniqueUser();
  const created = await (await uploadFile(owner)).json();
  const storedFiles = fs.readdirSync(storageDir);
  storedFiles.forEach((fileName) => fs.rmSync(path.join(storageDir, fileName)));

  const response = await downloadFile(owner, created.id);
  assert.strictEqual(response.status, 404);
});

test('rota inexistente retorna 404 em JSON', async () => {
  const response = await fetch(`${baseUrl}/inexistente`);
  assert.strictEqual(response.status, 404);
  assert.ok((await response.json()).error);
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
