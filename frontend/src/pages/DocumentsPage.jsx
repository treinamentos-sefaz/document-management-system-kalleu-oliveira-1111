import { useCallback, useEffect, useState } from 'react';
import UploadComponent from '../components/UploadComponent.jsx';
import DocumentList from '../components/DocumentList.jsx';
import { listDocuments } from '../services/documentService.js';

const DEFAULT_USER_ID = 'usuario-demo';

export default function DocumentsPage() {
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const trimmedUserId = userId.trim();
  const reloadDocuments = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    // Ignora respostas de requisições antigas quando o usuário muda antes de elas terminarem.
    let isCurrent = true;
    setError('');
    if (!trimmedUserId) {
      setDocuments([]);
      return undefined;
    }
    listDocuments(trimmedUserId)
      .then((loadedDocuments) => isCurrent && setDocuments(loadedDocuments))
      .catch((loadError) => {
        if (isCurrent) {
          setDocuments([]);
          setError(`Erro ao carregar documentos: ${loadError.message}`);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [trimmedUserId, reloadKey]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Document Management System</h1>

      <label>
        Usuário:{' '}
        <input value={userId} onChange={(event) => setUserId(event.target.value)} />
      </label>

      <UploadComponent userId={trimmedUserId} onUploaded={reloadDocuments} />

      <h2>Meus documentos</h2>
      {error && <p role="alert">{error}</p>}
      <DocumentList userId={trimmedUserId} documents={documents} />
    </main>
  );
}
