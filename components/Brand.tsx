export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <line x1="6" y1="3" x2="6" y2="25" stroke="#C2413A" strokeWidth="2" />
      <rect x="3" y="9" width="6" height="9" rx="1" fill="#C2413A" />
      <line x1="14" y1="2" x2="14" y2="22" stroke="#1C8A5B" strokeWidth="2" />
      <rect x="11" y="6" width="6" height="11" rx="1" fill="#1C8A5B" />
      <line x1="22" y1="1" x2="22" y2="18" stroke="#1C8A5B" strokeWidth="2" />
      <rect x="19" y="3" width="6" height="9" rx="1" fill="#1C8A5B" />
    </svg>
  );
}

export function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="topbar">
      <a href="/" className="brand">
        <BrandMark />
        <span>Trade Zone Premium</span>
      </a>
      {right}
    </header>
  );
}

/** Decorative candle strip used on the home page. */
export function CandleStrip() {
  // [open, close, high, low] on a 0-100 scale (higher = higher price)
  const candles: [number, number, number, number][] = [
    [30, 38, 42, 26], [38, 34, 44, 30], [34, 45, 48, 32], [45, 41, 50, 38], [41, 52, 56, 40],
    [52, 49, 58, 45], [49, 60, 63, 47], [60, 57, 66, 54], [57, 66, 70, 55], [66, 62, 72, 59],
    [62, 71, 75, 60], [71, 78, 82, 69],
  ];
  const w = 22;
  const gap = 10;
  const H = 120;
  const y = (v: number) => H - v * 1.4;
  return (
    <svg className="candles" viewBox={`0 0 ${candles.length * (w + gap)} ${H}`} role="img" aria-label="Illustration of a rising candlestick chart">
      {[30, 60, 90].map((g) => (
        <line key={g} x1="0" x2={candles.length * (w + gap)} y1={y(g)} y2={y(g)} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 5" />
      ))}
      {candles.map(([o, c, h, l], i) => {
        const up = c >= o;
        const color = up ? "#1C8A5B" : "#C2413A";
        const x = i * (w + gap) + gap / 2;
        return (
          <g key={i}>
            <line x1={x + w / 2} x2={x + w / 2} y1={y(h)} y2={y(l)} stroke={color} strokeWidth="2" />
            <rect x={x} y={y(Math.max(o, c))} width={w} height={Math.max(4, Math.abs(y(o) - y(c)))} rx="2" fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
