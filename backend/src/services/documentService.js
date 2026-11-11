const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');

function toPublic({ storedName, ...publicFields }) {
  return publicFields;
}

function registerUpload(file, owner) {
  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
  };
  return toPublic(documentRepository.save(document));
}

function listByOwner(owner) {
  return documentRepository
    .findByOwner(owner)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    .map(toPublic);
}

// Retorna null também quando o documento é de outro usuário, para não revelar sua existência.
function getForDownload(id, owner) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    return null;
  }
  return {
    ...toPublic(document),
    filePath: documentRepository.resolveFilePath(document.storedName),
  };
}

module.exports = { registerUpload, listByOwner, getForDownload };
