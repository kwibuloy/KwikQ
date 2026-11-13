import { useEffect } from 'react';

/** Sets the tab title, e.g. "Live queue · KwikQ". Pass a falsy value for just "KwikQ". */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · KwikQ` : 'KwikQ';
  }, [title]);
}
