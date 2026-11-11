import { useCallback, useEffect, useState } from 'react';
import UploadComponent from '../components/UploadComponent.jsx';
import DocumentList from '../components/DocumentList.jsx';
import { listDocuments } from '../services/documentService.js';

const DEFAULT_USER_ID = 'usuario-demo';

export default function DocumentsPage() {
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');

  const trimmedUserId = userId.trim();

  const loadDocuments = useCallback(async () => {
    if (!trimmedUserId) {
      setDocuments([]);
      return;
    }
    try {
      setError('');
      setDocuments(await listDocuments(trimmedUserId));
    } catch (loadError) {
      setError(`Erro ao carregar documentos: ${loadError.message}`);
    }
  }, [trimmedUserId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Document Management System</h1>

      <label>
        Usuário:{' '}
        <input value={userId} onChange={(event) => setUserId(event.target.value)} />
      </label>

      <UploadComponent userId={trimmedUserId} onUploaded={loadDocuments} />

      <h2>Meus documentos</h2>
      {error && <p role="alert">{error}</p>}
      <DocumentList userId={trimmedUserId} documents={documents} />
    </main>
  );
}
