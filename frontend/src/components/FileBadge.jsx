import { getExtension } from '../utils/format.js';

const CATEGORY_BY_EXTENSION = {
  pdf: 'pdf',
  doc: 'doc', docx: 'doc', odt: 'doc', rtf: 'doc', txt: 'doc', md: 'doc',
  xls: 'sheet', xlsx: 'sheet', csv: 'sheet', ods: 'sheet',
  ppt: 'slide', pptx: 'slide', odp: 'slide',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
};

export default function FileBadge({ fileName }) {
  const extension = getExtension(fileName);
  const category = CATEGORY_BY_EXTENSION[extension] ?? 'other';
  return (
    <span className={`file-badge file-badge--${category}`} aria-hidden="true">
      {(extension || 'arq').slice(0, 4)}
    </span>
  );
}
