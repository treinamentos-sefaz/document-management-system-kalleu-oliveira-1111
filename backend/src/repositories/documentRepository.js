const path = require('node:path');
const { storageDir } = require('../config');

// Metadados em memória nesta fase; os arquivos ficam em disco (storageDir).
const documents = new Map();

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id) ?? null;
}

function findByOwner(owner) {
  return [...documents.values()].filter((document) => document.owner === owner);
}

function resolveFilePath(storedName) {
  return path.join(storageDir, path.basename(storedName));
}

module.exports = { save, findById, findByOwner, resolveFilePath };
