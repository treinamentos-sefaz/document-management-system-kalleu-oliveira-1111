import { useState } from 'react';
import Icon from './Icon.jsx';
import { downloadDocument } from '../services/documentService.js';

export default function DownloadButton({ userId, document, onError }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleClick() {
    setIsDownloading(true);
    try {
      await downloadDocument(userId, document);
    } catch (downloadError) {
      onError(`Falha ao baixar "${document.originalName}": ${downloadError.message}`);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      type="button"
      className="button button--ghost"
      onClick={handleClick}
      disabled={isDownloading}
      aria-label={`Baixar ${document.originalName}`}
    >
      {isDownloading ? <span className="spinner" /> : <Icon name="download" size={18} />}
      <span className="button__label">{isDownloading ? 'Baixando' : 'Baixar'}</span>
    </button>
  );
}
