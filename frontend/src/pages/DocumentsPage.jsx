import { useCallback, useEffect, useMemo, useState } from 'react';
import UploadComponent from '../components/UploadComponent.jsx';
import DocumentList from '../components/DocumentList.jsx';
import StatCard from '../components/StatCard.jsx';
import Toast from '../components/Toast.jsx';
import Icon from '../components/Icon.jsx';
import { listDocuments } from '../services/documentService.js';
import { formatDate, formatSize } from '../utils/format.js';

const DEFAULT_USER_ID = 'usuario-demo';
// Mesmo formato aceito pelo backend no cabeçalho X-User-Id.
const USER_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const USER_CHANGE_DEBOUNCE_MS = 300;

export default function DocumentsPage() {
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [highlightedIds, setHighlightedIds] = useState(new Set());

  const trimmedUserId = userId.trim();
  const isUserValid = USER_ID_PATTERN.test(trimmedUserId);

  const showError = useCallback((message) => setToast({ type: 'error', message }), []);
  const closeToast = useCallback(() => setToast(null), []);

  const handleUploaded = useCallback((uploadedDocuments) => {
    setHighlightedIds(new Set(uploadedDocuments.map((document) => document.id)));
    setToast({
      type: 'success',
      message: uploadedDocuments.length === 1
        ? `"${uploadedDocuments[0].originalName}" enviado com sucesso.`
        : `${uploadedDocuments.length} arquivos enviados com sucesso.`,
    });
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    setSearch('');
    setHighlightedIds(new Set());
    setIsLoading(true);
  }, [trimmedUserId]);

  useEffect(() => {
    // Ignora respostas de requisições antigas quando o usuário muda antes de elas terminarem.
    let isCurrent = true;
    if (!isUserValid) {
      setDocuments([]);
      setIsLoading(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      listDocuments(trimmedUserId)
        .then((loadedDocuments) => isCurrent && setDocuments(loadedDocuments))
        .catch((loadError) => {
          if (isCurrent) {
            setDocuments([]);
            showError(`Erro ao carregar documentos: ${loadError.message}`);
          }
        })
        .finally(() => isCurrent && setIsLoading(false));
    }, USER_CHANGE_DEBOUNCE_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [trimmedUserId, isUserValid, reloadKey, showError]);

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter((document) => document.originalName.toLowerCase().includes(term));
  }, [documents, search]);

  const totalSize = documents.reduce((sum, document) => sum + document.size, 0);
  const lastUpload = documents[0]?.uploadedAt;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__logo">
            <Icon name="file" size={20} />
          </span>
          <div>
            <p className="brand__name">DMS</p>
            <p className="brand__tagline">Gestão de documentos</p>
          </div>
        </div>

        <label className={`user-field${isUserValid ? '' : ' user-field--invalid'}`}>
          <span className="user-field__avatar">{trimmedUserId.charAt(0).toUpperCase() || '?'}</span>
          <span className="sr-only">Usuário</span>
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Identificador do usuário"
            spellCheck="false"
            aria-invalid={!isUserValid}
          />
        </label>
      </header>

      <main className="content">
        <section className="hero">
          <h1>Seus documentos, organizados e seguros.</h1>
          <p>Envie, encontre e baixe arquivos em segundos. Tudo armazenado localmente.</p>
        </section>

        {!isUserValid && (
          <p className="inline-alert" role="alert">
            <Icon name="alert" size={18} />
            Informe um usuário com até 64 letras, números, ".", "_" ou "-".
          </p>
        )}

        <section className="stats">
          <StatCard icon="file" label="Documentos" value={documents.length} />
          <StatCard icon="database" label="Armazenamento" value={formatSize(totalSize)} />
          <StatCard icon="clock" label="Último envio" value={lastUpload ? formatDate(lastUpload) : '—'} />
        </section>

        <UploadComponent
          userId={trimmedUserId}
          disabled={!isUserValid}
          onUploaded={handleUploaded}
          onError={showError}
        />

        <section className="panel">
          <div className="panel__header">
            <div>
              <h2>Meus documentos</h2>
              <p className="panel__subtitle">
                {filteredDocuments.length} de {documents.length} {documents.length === 1 ? 'arquivo' : 'arquivos'}
              </p>
            </div>
            <label className="search">
              <Icon name="search" size={18} />
              <span className="sr-only">Buscar documentos</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome"
                disabled={documents.length === 0}
              />
            </label>
          </div>

          <DocumentList
            userId={trimmedUserId}
            documents={filteredDocuments}
            isLoading={isLoading}
            isFiltered={search.trim() !== ''}
            highlightedIds={highlightedIds}
            onError={showError}
          />
        </section>
      </main>

      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
