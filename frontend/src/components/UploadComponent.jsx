import { useState } from 'react';
import { uploadDocument } from '../services/documentService.js';

export default function UploadComponent({ userId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [inputKey, setInputKey] = useState(0);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      setMessage('Selecione um arquivo para enviar.');
      return;
    }
    setIsUploading(true);
    setMessage('');
    try {
      const document = await uploadDocument(userId, file);
      setMessage(`"${document.originalName}" enviado com sucesso.`);
      setFile(null);
      setInputKey((key) => key + 1);
      onUploaded();
    } catch (error) {
      setMessage(`Erro ao enviar: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Enviar documento</h2>
      <input
        key={inputKey}
        type="file"
        onChange={(event) => setFile(event.target.files[0] ?? null)}
      />
      <button type="submit" disabled={isUploading || !userId}>
        {isUploading ? 'Enviando...' : 'Enviar'}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
