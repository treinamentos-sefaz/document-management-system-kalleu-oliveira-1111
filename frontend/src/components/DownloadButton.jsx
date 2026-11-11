import { useState } from 'react';
import { downloadDocument } from '../services/documentService.js';

export default function DownloadButton({ userId, document }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setIsDownloading(true);
    setError('');
    try {
      await downloadDocument(userId, document);
    } catch (downloadError) {
      setError(`Erro ao baixar: ${downloadError.message}`);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={isDownloading}>
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span role="alert"> {error}</span>}
    </>
  );
}
