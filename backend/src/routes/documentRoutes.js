const { randomUUID } = require('node:crypto');
const express = require('express');
const multer = require('multer');
const { storageDir, maxFileSizeBytes } = require('../config');
const documentController = require('../controllers/documentController');

// Nome em disco gerado pelo servidor; o nome original fica apenas nos metadados.
const storage = multer.diskStorage({
  destination: storageDir,
  filename: (req, file, callback) => callback(null, randomUUID()),
});

// defParamCharset utf8: navegadores enviam o nome do arquivo em UTF-8 (o padrão do multer é latin1).
const uploadSingleFile = multer({
  storage,
  defParamCharset: 'utf8',
  limits: { fileSize: maxFileSizeBytes, files: 1, fields: 0 },
}).single('file');

const router = express.Router();

router.post('/upload', documentController.requireUser, uploadSingleFile, documentController.upload);
router.get('/documents', documentController.requireUser, documentController.list);
router.get('/documents/:id/download', documentController.requireUser, documentController.download);

module.exports = router;
