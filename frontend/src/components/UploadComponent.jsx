import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { uploadDocument } from '../services/documentService.js';

export default function UploadComponent({ userId, disabled, onUploaded, onError }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(null);

  const isUploading = progress !== null;
  const isDisabled = disabled || isUploading;

  // O backend aceita um arquivo por requisição, então múltiplos arquivos são enviados em sequência.
  async function uploadFiles(fileList) {
    const files = Array.from(fileList);
    if (files.length === 0 || isDisabled) return;

    const uploaded = [];
    for (const [index, file] of files.entries()) {
      setProgress({ current: index + 1, total: files.length, name: file.name });
      try {
        uploaded.push(await uploadDocument(userId, file));
      } catch (error) {
        onError(`Falha ao enviar "${file.name}": ${error.message}`);
      }
    }
    setProgress(null);
    if (uploaded.length > 0) onUploaded(uploaded);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    uploadFiles(event.dataTransfer.files);
  }

  function handleChange(event) {
    uploadFiles(event.target.files);
    event.target.value = '';
  }

  const className = [
    'dropzone',
    isDragging && 'dropzone--active',
    isDisabled && 'dropzone--disabled',
  ].filter(Boolean).join(' ');

  return (
    <section
      className={className}
      onDragOver={(event) => {
        event.preventDefault();
        if (!isDisabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      aria-busy={isUploading}
    >
      <span className="dropzone__icon">
        {isUploading ? <span className="spinner spinner--lg" /> : <Icon name="upload" size={28} />}
      </span>

      {isUploading ? (
        <>
          <p className="dropzone__title">
            Enviando {progress.current} de {progress.total}
          </p>
          <p className="dropzone__hint">{progress.name}</p>
          <div className="progress">
            <div
              className="progress__bar"
              style={{ width: `${((progress.current - 1) / progress.total) * 100}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <p className="dropzone__title">Arraste seus arquivos para cá</p>
          <p className="dropzone__hint">ou selecione no seu computador</p>
          <button
            type="button"
            className="button button--primary"
            onClick={() => inputRef.current.click()}
            disabled={isDisabled}
          >
            Selecionar arquivos
          </button>
        </>
      )}

      <input ref={inputRef} type="file" multiple hidden onChange={handleChange} />
    </section>
  );
}
