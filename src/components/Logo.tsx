/** The site's mark. */

/** The mark: three venue quotes at different heights, and the median line through the middle one. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <line x1="2" y1="12" x2="22" y2="12" stroke="var(--color-glow)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5.5" cy="6" r="2.25" fill="var(--color-fg-2)" />
      <circle cx="12" cy="18" r="2.25" fill="var(--color-fg-2)" />
      <circle cx="18.5" cy="12" r="2.75" fill="var(--color-glow)" />
    </svg>
  );
}
