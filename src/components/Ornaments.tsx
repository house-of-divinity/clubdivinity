// Tarot ornaments — gold filigree SVGs used across the marketing site.
// Pure server components (no state).

export function OrnamentDivider() {
  return (
    <div className="ornament-divider" aria-hidden="true">
      <span className="od-line" />
      <span className="od-star">✦</span>
      <span className="od-dot">·</span>
      <span className="od-star od-star-big">✶</span>
      <span className="od-dot">·</span>
      <span className="od-star">✦</span>
      <span className="od-line" />
    </div>
  );
}

// Round to 3 decimals so SSR and client produce the same string —
// Node and V8-in-browser sometimes return trig results with different
// trailing precision, which trips React's hydration check.
const r3 = (n: number) => Number(n.toFixed(3));

export function HeroSun() {
  return (
    <svg className="hero-corner-orn hero-sun" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="1" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const x1 = r3(50 + Math.cos(a) * 18);
        const y1 = r3(50 + Math.sin(a) * 18);
        const x2 = r3(50 + Math.cos(a) * 32);
        const y2 = r3(50 + Math.sin(a) * 32);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        );
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = ((i + 0.5) / 12) * Math.PI * 2;
        const x1 = r3(50 + Math.cos(a) * 17);
        const y1 = r3(50 + Math.sin(a) * 17);
        const x2 = r3(50 + Math.cos(a) * 25);
        const y2 = r3(50 + Math.sin(a) * 25);
        return (
          <line key={"s" + i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="currentColor" strokeWidth=".6" strokeLinecap="round" opacity=".65" />
        );
      })}
      <circle cx="46" cy="49" r=".8" fill="currentColor" />
      <circle cx="54" cy="49" r=".8" fill="currentColor" />
      <path d="M 45 54 Q 50 57 55 54" stroke="currentColor"
        strokeWidth=".7" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function HeroMoon() {
  return (
    <svg className="hero-corner-orn hero-moon" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <mask id="ornMoonMask">
          <rect width="100" height="100" fill="white" />
          <circle cx="58" cy="42" r="18" fill="black" />
        </mask>
      </defs>
      <circle cx="48" cy="50" r="22" fill="currentColor" opacity=".95" mask="url(#ornMoonMask)" />
      <circle cx="38" cy="46" r=".8" fill="#0a0807" />
      <path d="M 34 52 Q 38 55 42 52" stroke="#0a0807"
        strokeWidth=".7" fill="none" strokeLinecap="round" />
      <g fill="currentColor" opacity=".8">
        <circle cx="22" cy="28" r=".8" />
        <circle cx="78" cy="72" r="1" />
        <circle cx="14" cy="70" r=".6" />
        <circle cx="76" cy="22" r=".5" />
      </g>
    </svg>
  );
}

export function CornerFiligree({ variant }: { variant: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg className={"corner-filigree cf-" + variant} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M 4 4 L 16 4 M 4 4 L 4 16 M 4 4 L 12 12"
        stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" opacity=".7" />
    </svg>
  );
}

export function WingedHeart() {
  return (
    <svg className="winged-heart" viewBox="0 0 260 70" aria-hidden="true">
      <path d="M 130 56 C 120 44, 110 40, 110 30 C 110 22, 118 20, 124 24 L 130 30 L 136 24 C 142 20, 150 22, 150 30 C 150 40, 140 44, 130 56 Z"
        stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <circle cx="130" cy="34" r="1.6" fill="currentColor" opacity=".75" />
      <path d="M 112 36 C 92 32, 70 36, 48 44 C 66 40, 88 40, 110 44"
        stroke="currentColor" strokeWidth=".9" fill="none" strokeLinecap="round" />
      <path d="M 108 42 C 88 42, 68 48, 52 56"
        stroke="currentColor" strokeWidth=".7" fill="none" strokeLinecap="round" opacity=".75" />
      <path d="M 100 46 C 84 48, 68 54, 56 60"
        stroke="currentColor" strokeWidth=".5" fill="none" strokeLinecap="round" opacity=".55" />
      <path d="M 148 36 C 168 32, 190 36, 212 44 C 194 40, 172 40, 150 44"
        stroke="currentColor" strokeWidth=".9" fill="none" strokeLinecap="round" />
      <path d="M 152 42 C 172 42, 192 48, 208 56"
        stroke="currentColor" strokeWidth=".7" fill="none" strokeLinecap="round" opacity=".75" />
      <path d="M 160 46 C 176 48, 192 54, 204 60"
        stroke="currentColor" strokeWidth=".5" fill="none" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}
