import DownloadButton from './DownloadButton.jsx';
import FileBadge from './FileBadge.jsx';
import Icon from './Icon.jsx';
import { formatDate, formatSize } from '../utils/format.js';

const SKELETON_ROWS = 3;

function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon name="file" size={28} />
      </span>
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__description">{description}</p>
    </div>
  );
}

export default function DocumentList({ userId, documents, isLoading, isFiltered, highlightedIds, onError }) {
  if (isLoading) {
    return (
      <ul className="document-list" aria-busy="true">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <li key={index} className="document-row document-row--skeleton">
            <span className="skeleton skeleton--badge" />
            <span className="skeleton skeleton--text" />
          </li>
        ))}
      </ul>
    );
  }

  if (documents.length === 0) {
    return isFiltered ? (
      <EmptyState title="Nenhum resultado" description="Nenhum documento corresponde à sua busca." />
    ) : (
      <EmptyState title="Nenhum documento ainda" description="Envie seu primeiro arquivo usando a área acima." />
    );
  }

  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li
          key={document.id}
          className={`document-row${highlightedIds.has(document.id) ? ' document-row--new' : ''}`}
        >
          <FileBadge fileName={document.originalName} />
          <div className="document-row__info">
            <p className="document-row__name" title={document.originalName}>
              {document.originalName}
            </p>
            <p className="document-row__meta">
              <span>{formatSize(document.size)}</span>
              <span className="dot" aria-hidden="true" />
              <span>{formatDate(document.uploadedAt)}</span>
            </p>
          </div>
          <DownloadButton userId={userId} document={document} onError={onError} />
        </li>
      ))}
    </ul>
  );
}
