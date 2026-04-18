'use client';

import DOMPurify from 'isomorphic-dompurify';
import { useMemo } from 'react';

/**
 * Minimal markdown-light → HTML renderer with DOMPurify sanitization.
 * Supports **bold**, _italic_, `code`, and preserves line breaks.
 * No third-party markdown library dependency — keeps surface area small.
 */
function miniMd(s: string): string {
  const esc = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_(.+?)_(?=[\s.,)!?]|$)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br />');
}

export function SafeMarkdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const html = useMemo(
    () =>
      DOMPurify.sanitize(miniMd(source ?? ''), {
        ALLOWED_TAGS: ['strong', 'em', 'code', 'br'],
        ALLOWED_ATTR: [],
      }),
    [source],
  );
  return (
    <div
      className={className}
      // Content passed through mini-md + DOMPurify allowlist.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
