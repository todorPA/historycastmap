import { useState } from 'react';
import { t } from '../../lib/i18n';
import { useFilters } from '../../state/FilterContext';

/**
 * Source line and copy-link. Copying the current view must not need a selection (decision of
 * 2026-10-05), so the action stays here even though the episode card gets its own in Phase 3.
 */
export default function PanelFooter() {
  const { lang } = useFilters();
  const [copied, setCopied] = useState(false);

  /**
   * UrlSync keeps the address bar current, so the current href is the shareable link. Falls back
   * to a prompt where the clipboard API is unavailable (http, or no user-gesture permission).
   */
  async function copyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(t(lang, 'copyLink'), url);
    }
  }

  return (
    <footer className="panel-foot">
      <span className="panel-foot__source">
        {t(lang, 'source')}:{' '}
        <a href="https://rss.com/podcasts/rs-historycast/" target="_blank" rel="noreferrer">
          HistoryCast
        </a>{' '}
        · Natural Earth
      </span>
      <button type="button" className="hc-link" onClick={copyLink} title={t(lang, 'copyLinkHint')} aria-live="polite">
        {copied ? t(lang, 'linkCopied') : t(lang, 'copyLink')}
      </button>
    </footer>
  );
}
