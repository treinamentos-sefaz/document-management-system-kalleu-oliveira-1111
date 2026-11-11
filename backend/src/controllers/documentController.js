const documentService = require('../services/documentService');

function requireUser(req, res, next) {
  const userId = req.get('X-User-Id')?.trim();
  if (!userId) {
    return res.status(400).json({ error: 'O cabeçalho X-User-Id é obrigatório.' });
  }
  res.locals.userId = userId;
  return next();
}

function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado no campo "file".' });
  }
  const document = documentService.registerUpload(req.file, res.locals.userId);
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
  const options = { headers: { 'Content-Type': document.mimeType } };
  return res.download(document.filePath, document.originalName, options, (err) => {
    if (err && !res.headersSent) {
      next(err);
    }
  });
}

module.exports = { requireUser, upload, list, download };
