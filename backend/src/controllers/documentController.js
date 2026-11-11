const documentService = require('../services/documentService');

const USER_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const SAFE_MIME_TYPE_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;
const DEFAULT_MIME_TYPE = 'application/octet-stream';
const DEFAULT_FILE_NAME = 'arquivo';
const MAX_FILE_NAME_LENGTH = 255;

function sanitizeFileName(rawName) {
  const name = rawName
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_FILE_NAME_LENGTH);
  return name || DEFAULT_FILE_NAME;
}

function sanitizeMimeType(mimeType) {
  return SAFE_MIME_TYPE_PATTERN.test(mimeType) ? mimeType : DEFAULT_MIME_TYPE;
}

function toUploadInput(file) {
  return {
    originalName: sanitizeFileName(file.originalname),
    storedName: file.filename,
    mimeType: sanitizeMimeType(file.mimetype),
    size: file.size,
  };
}

function requireUser(req, res, next) {
  const userId = req.get('X-User-Id')?.trim();
  if (!userId || !USER_ID_PATTERN.test(userId)) {
    return res.status(400).json({
      error: 'Cabeçalho X-User-Id ausente ou inválido (use até 64 letras, números, ".", "_" ou "-").',
    });
  }
  res.locals.userId = userId;
  return next();
}

function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado no campo "file".' });
  }
  const document = documentService.registerUpload(toUploadInput(req.file), res.locals.userId);
  return res.status(201).json(document);
}

function list(req, res) {
  return res.json(documentService.listByOwner(res.locals.userId));
}

function download(req, res, next) {
  const document = documentService.getForDownload(req.params.id, res.locals.userId);
  if (!document) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }
  const options = {
    headers: {
      'Content-Type': document.mimeType,
      'X-Content-Type-Options': 'nosniff',
    },
  };
  return res.download(document.filePath, document.originalName, options, (err) => {
    if (!err || res.headersSent) {
      return;
    }
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'Arquivo do documento não encontrado.' });
      return;
    }
    next(err);
  });
}

module.exports = { requireUser, upload, list, download };
