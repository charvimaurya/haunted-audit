/**
 * HeroScene: decorative art for the Home hero (witch ghost, graveyard, pumpkins, bats).
 * Inline SVG, aria-hidden, no pointer events, not focusable. It is not the GhostMascot.
 */
function Pumpkin({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="0" r="74" fill="var(--scene-pumpkin)" fillOpacity="0.18" />
      <ellipse cx="0" cy="0" rx="46" ry="38" fill="var(--scene-pumpkin)" />
      <path d="M-18 -34 Q-24 0 -18 34 M18 -34 Q24 0 18 34" stroke="var(--scene-face)" strokeOpacity="0.35" strokeWidth="3" fill="none" />
      <rect x="-4" y="-48" width="8" height="14" rx="2" fill="var(--scene-face)" />
      <path d="M-26 -10 L-10 -10 L-18 -24 Z M10 -10 L26 -10 L18 -24 Z" fill="var(--scene-face)" />
      <path d="M-24 8 L-14 18 L-6 10 L0 20 L6 10 L14 18 L24 8 Q0 32 -24 8 Z" fill="var(--scene-face)" />
    </g>
  );
}
function Bat({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 0 Q-10 -12 -26 -8 Q-18 -2 -20 6 Q-10 0 -6 8 Q-2 2 0 8 Q2 2 6 8 Q10 0 20 6 Q18 -2 26 -8 Q10 -12 0 0 Z"
      fill="var(--scene-bat)"
    />
  );
}
function Grave({ x, y, w = 36, h = 56 }: { x: number; y: number; w?: number; h?: number }) {
  return <path d={`M${x} ${y} v${-h + w / 2} a${w / 2} ${w / 2} 0 0 1 ${w} 0 v${h - w / 2} Z`} fill="var(--scene-grave)" />;
}

export function HeroScene() {
  return (
    <div className="hero-scene absolute inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
      {/* Night backdrop: stars, one dead tree, and ground that fades into the page (docs/ui-fidelity.md D2, D4) */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice" focusable="false" role="presentation">
        {[[120,60],[260,30],[420,90],[560,40],[700,20],[860,70],[980,36],[1120,80],[1260,40],[1360,110],[330,150],[1040,150],[640,110]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="var(--scene-star)" fillOpacity="0.7" />
        ))}
        {/* Twisted bare trees at both edges, a graveyard fence and tombstones (v7 hero) */}
        <g stroke="var(--scene-tree)" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path transform="translate(250 0)" strokeWidth="26" d="M40 420 C60 340 20 280 50 200 C70 150 40 110 60 40" />
          <path transform="translate(250 0)" strokeWidth="12" d="M52 250 C90 230 130 200 170 170 M60 190 C20 170 -10 150 -20 110 M48 130 C90 110 120 80 150 40 M170 170 C190 160 205 140 215 120 M150 40 C165 30 175 20 180 0" />
          <path transform="translate(250 0)" strokeWidth="6" d="M100 220 C120 215 135 225 150 215 M90 120 C100 100 110 95 118 80" />
          <path transform="translate(-215 0)" strokeWidth="24" d="M1400 420 C1380 350 1410 290 1385 220 C1370 170 1395 120 1380 50" />
          <path transform="translate(-215 0)" strokeWidth="11" d="M1390 260 C1350 240 1310 215 1270 180 M1385 190 C1420 170 1450 150 1470 110 M1380 120 C1340 100 1310 70 1290 30 M1270 180 C1250 170 1240 150 1232 130" />
          <path transform="translate(-215 0)" strokeWidth="6" d="M1340 230 C1320 228 1305 240 1290 232" />
          <path strokeWidth="9" d="M330 420 V300 M330 340 L300 300 M330 320 L362 280 M330 300 L318 270" />
          <path strokeWidth="3" d="M560 400 H900 M560 384 H900" strokeOpacity="0.55" />
        </g>
        <g fill="var(--scene-tree)" fillOpacity="0.9">
          {Array.from({ length: 18 }, (_, i) => 560 + i * 20).map((x) => (
            <path key={x} d={`M${x} 410 V372 L${x + 3} 366 L${x + 6} 372 V410 Z`} />
          ))}
        </g>
        <g fill="var(--scene-grave)">
          <path d="M600 420 v-46 a18 18 0 0 1 36 0 v46 Z" />
          <path d="M690 420 v-34 a14 14 0 0 1 28 0 v34 Z" />
          <path d="M770 420 v-52 a18 18 0 0 1 36 0 v52 Z" />
          <path d="M850 420 v-36 a14 14 0 0 1 28 0 v36 Z" />
          <path d="M1170 420 v-40 a16 16 0 0 1 32 0 v40 Z" />
          <path d="M1250 420 v-30 a13 13 0 0 1 26 0 v30 Z" />
          <path d="M930 420 v-44 h-14 v-10 h14 v-12 h10 v12 h14 v10 h-14 v44 Z" />
        </g>
        <defs>
          <linearGradient id="hero-ground-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-base)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--color-base)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect x="0" y="300" width="1440" height="120" fill="url(#hero-ground-fade)" />
      </svg>
      {/* Left: graveyard, witch ghost, pumpkin */}
      <svg className="absolute bottom-0 left-0 hidden h-full max-h-[420px] w-[34%] min-w-[260px] lg:block" viewBox="0 0 300 400" preserveAspectRatio="xMinYMax meet" focusable="false" role="presentation">
        <Grave x={36} y={400} w={44} h={90} />
        <Grave x={96} y={400} w={30} h={60} />
        <Bat x={190} y={44} s={1.1} />
        <Bat x={262} y={78} s={0.7} />
        <g className="scene-ghost-bob" style={{ filter: 'drop-shadow(0 0 14px var(--color-violet-neon))' }}>
          {/* body with tail and wavy hem */}
          <path d="M60 330 C40 250 50 170 120 150 C190 140 215 210 200 290 C196 320 220 330 232 318 C222 352 190 356 176 336 C168 352 148 354 140 338 C128 354 104 352 98 336 C86 350 66 346 60 330 Z" fill="var(--scene-ghost)" fillOpacity="0.93" />
          {/* hat, tilted */}
          <g transform="rotate(-9 128 120)">
          <path d="M70 160 Q130 140 190 158 L152 56 Q132 14 112 54 Z" fill="var(--scene-hat)" />
          <ellipse cx="128" cy="160" rx="82" ry="16" fill="var(--scene-hat)" />
          <path d="M92 142 Q130 134 168 142 L170 156 Q130 148 90 156 Z" fill="var(--scene-band)" />
          <rect x="120" y="138" width="20" height="18" rx="3" fill="none" stroke="var(--scene-gold)" strokeWidth="4" />
          </g>
          {/* face */}
          <ellipse cx="108" cy="204" rx="9" ry="14" fill="var(--scene-eye)" />
          <ellipse cx="150" cy="204" rx="9" ry="14" fill="var(--scene-eye)" />
          <ellipse cx="92" cy="220" rx="9" ry="5" fill="var(--scene-blush)" fillOpacity="0.7" />
          <ellipse cx="166" cy="220" rx="9" ry="5" fill="var(--scene-blush)" fillOpacity="0.7" />
          <path d="M122 226 Q129 231 136 226" stroke="var(--scene-eye)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* laptop with access symbol */}
          <rect x="84" y="262" width="92" height="60" rx="6" fill="var(--scene-lens)" stroke="var(--scene-glyph)" strokeWidth="3" />
          <circle cx="130" cy="290" r="15" fill="none" stroke="var(--scene-glyph)" strokeWidth="3" />
          <path d="M118 286 H142 M130 286 V304 M130 300 L122 312 M130 300 L138 312" stroke="var(--scene-glyph)" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* magnifier with code glyph */}
          <path d="M214 240 L238 286" stroke="var(--scene-gold)" strokeWidth="7" strokeLinecap="round" />
          <circle cx="200" cy="214" r="34" fill="var(--scene-lens)" stroke="var(--scene-gold)" strokeWidth="7" />
          <path d="M190 204 L180 214 L190 224 M210 204 L220 214 L210 224 M203 200 L197 228" stroke="var(--scene-pumpkin)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <Pumpkin x={46} y={366} s={0.9} />
      </svg>
      {/* Right: bats and pumpkin; the moon and castle are HeroCastle */}
      <svg className="absolute bottom-0 right-0 hidden h-[200px] w-[200px] lg:block" viewBox="0 0 200 200" preserveAspectRatio="xMaxYMax meet" focusable="false" role="presentation">
        <Pumpkin x={150} y={160} s={1} />
      </svg>
      <svg className="absolute right-[34%] top-6 hidden h-16 w-40 lg:block" viewBox="0 0 160 64" focusable="false" role="presentation">
        <Bat x={40} y={26} s={1} />
        <Bat x={120} y={44} s={0.7} />
      </svg>
    </div>
  );
}
