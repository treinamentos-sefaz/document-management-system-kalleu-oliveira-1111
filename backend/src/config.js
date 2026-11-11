const path = require('node:path');

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

module.exports = {
  port: Number(process.env.PORT) || DEFAULT_PORT,
  storageDir: path.resolve(process.env.STORAGE_DIR || path.join(__dirname, '..', 'storage')),
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_BYTES) || DEFAULT_MAX_FILE_SIZE_BYTES,
};
