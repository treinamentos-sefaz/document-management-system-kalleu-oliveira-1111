const { test } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

const documentService = require('../src/services/documentService');
const { storageDir } = require('../src/config');

function uniqueUser() {
  return `user-${randomUUID()}`;
}

function buildUploadInput(overrides = {}) {
  return {
    originalName: 'contrato.pdf',
    storedName: randomUUID(),
    mimeType: 'application/pdf',
    size: 42,
    ...overrides,
  };
}

test('registerUpload gera id e data e não expõe storedName', () => {
  const owner = uniqueUser();
  const document = documentService.registerUpload(buildUploadInput(), owner);

  assert.ok(document.id);
  assert.ok(!Number.isNaN(Date.parse(document.uploadedAt)));
  assert.strictEqual(document.owner, owner);
  assert.strictEqual(document.originalName, 'contrato.pdf');
  assert.strictEqual(document.storedName, undefined);
});

test('listByOwner retorna apenas documentos do dono, sem storedName', () => {
  const owner = uniqueUser();
  documentService.registerUpload(buildUploadInput(), owner);
  documentService.registerUpload(buildUploadInput(), uniqueUser());

  const documents = documentService.listByOwner(owner);

  assert.strictEqual(documents.length, 1);
  assert.strictEqual(documents[0].owner, owner);
  assert.strictEqual(documents[0].storedName, undefined);
});

test('listByOwner retorna lista vazia para usuário sem documentos', () => {
  assert.deepStrictEqual(documentService.listByOwner(uniqueUser()), []);
});

test('getForDownload retorna o caminho do arquivo dentro do storage para o dono', () => {
  const owner = uniqueUser();
  const input = buildUploadInput();
  const document = documentService.registerUpload(input, owner);

  const result = documentService.getForDownload(document.id, owner);

  assert.strictEqual(result.filePath, path.join(storageDir, input.storedName));
});

test('getForDownload retorna null para outro usuário ou id inexistente', () => {
  const document = documentService.registerUpload(buildUploadInput(), uniqueUser());

  assert.strictEqual(documentService.getForDownload(document.id, uniqueUser()), null);
  assert.strictEqual(documentService.getForDownload('inexistente', uniqueUser()), null);
});
