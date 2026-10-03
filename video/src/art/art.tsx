// Original SVG artwork. Everything is drawn in code; no external images.
import React from "react";
import { interpolate, random, useCurrentFrame } from "remotion";
import { HEIGHT, WIDTH } from "../timeline";
import { wave } from "../components/anim";

const full: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" };

// ------------------------------------------------------------------ generic

/** Twinkling four-point sparkles. `avoid` keeps them off a rectangle (e.g. the text column), where a small sparkle can read as a dot or nukta on a letter. */
export const Sparkles: React.FC<{
  count?: number;
  color: string;
  seed?: string;
  size?: number;
  area?: { top: number; bottom: number };
  avoid?: { left: number; right: number; top: number; bottom: number };
}> = ({ count = 24, color, seed = "sp", size = 22, area = { top: 0, bottom: HEIGHT }, avoid }) => {
  const frame = useCurrentFrame();
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {Array.from({ length: count }).map((_, i) => {
        const x = random(`${seed}x${i}`) * WIDTH;
        const y = area.top + random(`${seed}y${i}`) * (area.bottom - area.top);
        const s = size * (0.4 + random(`${seed}s${i}`) * 0.8);
        if (avoid && x > avoid.left && x < avoid.right && y > avoid.top && y < avoid.bottom) return null;
        const tw = (Math.sin(frame / (12 + random(`${seed}p${i}`) * 20) + i) + 1) / 2;
        return (
          <path
            key={i}
            d={`M ${x} ${y - s} Q ${x} ${y} ${x + s} ${y} Q ${x} ${y} ${x} ${y + s} Q ${x} ${y} ${x - s} ${y} Q ${x} ${y} ${x} ${y - s} Z`}
            fill={color}
            opacity={0.15 + tw * 0.75}
            transform={`rotate(${frame * 0.5 + i * 20} ${x} ${y})`}
          />
        );
      })}
    </svg>
  );
};

/** Larger eight-ray starbursts at fixed spots (the "ornament" stars of a printed invitation); each pops in, then turns and pulses slowly. */
export const StarBursts: React.FC<{ stars: { x: number; y: number; size: number; delay?: number }[]; color: string; opacity?: number }> = ({ stars, color, opacity = 0.85 }) => {
  const frame = useCurrentFrame();
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {stars.map((st, i) => {
        const appear = interpolate(frame - (st.delay ?? 0) - i * 5, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pulse = 1 + 0.07 * Math.sin(frame / 14 + i * 1.7);
        const r = st.size / 2;
        return (
          <g key={i} transform={`translate(${st.x} ${st.y}) rotate(${frame * 0.35 + i * 11}) scale(${appear * pulse})`} opacity={opacity * (0.7 + 0.3 * Math.sin(frame / 20 + i))} stroke={color} strokeLinecap="round" fill="none">
            {Array.from({ length: 8 }).map((_, k) => (
              <line key={k} x1={r * 0.16} y1={0} x2={r} y2={0} strokeWidth={Math.max(2, st.size / 28)} transform={`rotate(${k * 45})`} />
            ))}
            {Array.from({ length: 8 }).map((_, k) => (
              <line key={`s${k}`} x1={r * 0.16} y1={0} x2={r * 0.62} y2={0} strokeWidth={Math.max(1.5, st.size / 40)} transform={`rotate(${k * 45 + 22.5})`} />
            ))}
            <circle r={r * 0.1} fill={color} stroke="none" />
          </g>
        );
      })}
    </svg>
  );
};

export const Confetti: React.FC<{ count?: number; colors: string[]; seed?: string; speed?: number }> = ({ count = 70, colors, seed = "cf", speed = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {Array.from({ length: count }).map((_, i) => {
        const r = (k: string) => random(`${seed}${k}${i}`);
        const v = (2 + r("v") * 4) * speed;
        const y = ((r("y") * (HEIGHT + 200) + frame * v) % (HEIGHT + 200)) - 100;
        const x = r("x") * WIDTH + wave(frame, 60 + r("w") * 60, 30, i);
        const rot = frame * (2 + r("r") * 6) + i * 30;
        const c = colors[i % colors.length];
        const w = 14 + r("s") * 14;
        return r("t") > 0.5 ? (
          <rect key={i} x={x} y={y} width={w} height={w * 0.45} fill={c} transform={`rotate(${rot} ${x} ${y})`} rx={2} />
        ) : (
          <circle key={i} cx={x} cy={y} r={w * 0.3} fill={c} />
        );
      })}
    </svg>
  );
};

/** Soft blurred colour blobs drifting slowly (pastel backgrounds). */
export const Blobs: React.FC<{ colors: string[]; seed?: string; opacity?: number }> = ({ colors, seed = "bl", opacity = 0.55 }) => {
  const frame = useCurrentFrame();
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <defs>
        <filter id={`blur-${seed}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="70" />
        </filter>
      </defs>
      <g filter={`url(#blur-${seed})`} opacity={opacity}>
        {colors.map((c, i) => {
          const cx = random(`${seed}x${i}`) * WIDTH + wave(frame, 240 + i * 40, 90, i);
          const cy = random(`${seed}y${i}`) * HEIGHT + wave(frame, 300 + i * 30, 110, i * 2);
          return <circle key={i} cx={cx} cy={cy} r={260 + random(`${seed}r${i}`) * 160} fill={c} />;
        })}
      </g>
    </svg>
  );
};

// ------------------------------------------------------------------ birthday

export const Balloon: React.FC<{ x: number; y: number; color: string; scale?: number; sway?: number }> = ({ x, y, color, scale = 1, sway = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${sway})`}>
    <path d="M 0 120 C 10 170, -14 210, 6 260" stroke="#00000040" strokeWidth={3} fill="none" />
    <ellipse cx={0} cy={0} rx={70} ry={86} fill={color} />
    <ellipse cx={-24} cy={-30} rx={16} ry={26} fill="#ffffff" opacity={0.45} transform="rotate(-20 -24 -30)" />
    <path d="M -10 84 L 10 84 L 0 100 Z" fill={color} />
  </g>
);

export const BalloonField: React.FC<{ colors: string[]; count?: number; seed?: string }> = ({ colors, count = 9, seed = "bal" }) => {
  const frame = useCurrentFrame();
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {Array.from({ length: count }).map((_, i) => {
        const r = (k: string) => random(`${seed}${k}${i}`);
        const speed = 1.2 + r("v") * 1.6;
        const travel = HEIGHT + 600;
        const y = HEIGHT + 300 - ((r("y") * travel + frame * speed) % travel);
        const x = 60 + r("x") * (WIDTH - 120) + wave(frame, 90 + r("w") * 50, 24, i);
        return <Balloon key={i} x={x} y={y} color={colors[i % colors.length]} scale={0.6 + r("s") * 0.6} sway={wave(frame, 70, 6, i)} />;
      })}
    </svg>
  );
};

export const Bunting: React.FC<{ colors: string[]; y?: number }> = ({ colors, y = 70 }) => {
  const frame = useCurrentFrame();
  const n = 11;
  const sag = 70 + wave(frame, 80, 6);
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <path d={`M -20 ${y} Q ${WIDTH / 2} ${y + sag * 2} ${WIDTH + 20} ${y}`} stroke="#00000055" strokeWidth={3} fill="none" />
      {Array.from({ length: n }).map((_, i) => {
        const t = (i + 0.5) / n;
        const x = -20 + t * (WIDTH + 40);
        const yy = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + sag * 2) + t * t * y;
        return <path key={i} d={`M ${x - 34} ${yy} L ${x + 34} ${yy} L ${x} ${yy + 80} Z`} fill={colors[i % colors.length]} transform={`rotate(${wave(frame, 50, 4, i)} ${x} ${yy})`} />;
      })}
    </svg>
  );
};

export const Cake: React.FC<{ size?: number; colors: { base: string; icing: string; flame: string } }> = ({ size = 220, colors }) => {
  const frame = useCurrentFrame();
  const flick = 1 + wave(frame, 9, 0.08);
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <rect x={30} y={110} width={140} height={70} rx={12} fill={colors.base} />
      <path d="M 30 125 Q 45 145 60 125 Q 75 145 90 125 Q 105 145 120 125 Q 135 145 150 125 Q 165 145 170 125 L 170 112 Q 170 108 160 108 L 40 108 Q 30 108 30 112 Z" fill={colors.icing} />
      <rect x={20} y={176} width={160} height={10} rx={5} fill="#00000030" />
      {[70, 100, 130].map((x, i) => (
        <g key={x}>
          <rect x={x - 5} y={70} width={10} height={40} rx={3} fill={i === 1 ? colors.icing : "#ffffff"} />
          <ellipse cx={x} cy={58} rx={8 * flick} ry={14 * flick} fill={colors.flame} />
          <ellipse cx={x} cy={62} rx={3.5} ry={7} fill="#fff8d0" />
        </g>
      ))}
    </svg>
  );
};

// ------------------------------------------------------------------ indian traditional

/** Concentric rings of petals. */
export const Mandala: React.FC<{ size: number; color: string; accent: string; rotation?: number; opacity?: number }> = ({ size, color, accent, rotation = 0, opacity = 1 }) => {
  const rings = [
    { r: 40, n: 8, len: 34, w: 14, fill: accent },
    { r: 90, n: 12, len: 50, w: 20, fill: color },
    { r: 150, n: 16, len: 60, w: 22, fill: accent },
    { r: 215, n: 24, len: 56, w: 18, fill: color },
    { r: 275, n: 32, len: 44, w: 14, fill: accent },
  ];
  return (
    <svg width={size} height={size} viewBox="-320 -320 640 640" style={{ opacity, transform: `rotate(${rotation}deg)` }}>
      {rings.map((ring, ri) => (
        <g key={ri}>
          <circle r={ring.r - 6} fill="none" stroke={ring.fill} strokeWidth={2} opacity={0.7} />
          {Array.from({ length: ring.n }).map((_, i) => (
            <path
              key={i}
              d={`M 0 ${-ring.r} C ${ring.w} ${-ring.r - ring.len * 0.4}, ${ring.w * 0.6} ${-ring.r - ring.len * 0.9}, 0 ${-ring.r - ring.len} C ${-ring.w * 0.6} ${-ring.r - ring.len * 0.9}, ${-ring.w} ${-ring.r - ring.len * 0.4}, 0 ${-ring.r} Z`}
              fill="none"
              stroke={ring.fill}
              strokeWidth={3}
              transform={`rotate(${(360 / ring.n) * i + (ri % 2 ? 180 / ring.n : 0)})`}
            />
          ))}
        </g>
      ))}
      <circle r={22} fill={accent} />
      <circle r={10} fill={color} />
    </svg>
  );
};

export const Marigold: React.FC<{ r: number; cx: number; cy: number; color?: string; dark?: string }> = ({ r, cx, cy, color = "#f7a400", dark = "#d97a00" }) => (
  <g transform={`translate(${cx} ${cy})`}>
    {[1, 0.78, 0.55].map((k, layer) =>
      Array.from({ length: 12 }).map((_, i) => (
        <ellipse key={`${layer}-${i}`} cx={0} cy={-r * k * 0.55} rx={r * 0.28 * k} ry={r * 0.5 * k} fill={layer % 2 ? dark : color} transform={`rotate(${i * 30 + layer * 15})`} />
      )),
    )}
    <circle r={r * 0.2} fill={dark} />
  </g>
);

const Leaf: React.FC<{ x: number; y: number; angle: number; size: number; color: string }> = ({ x, y, angle, size, color }) => (
  <path d={`M 0 0 C ${size * 0.4} ${size * 0.2}, ${size * 0.4} ${size * 0.8}, 0 ${size} C ${-size * 0.4} ${size * 0.8}, ${-size * 0.4} ${size * 0.2}, 0 0 Z`} fill={color} transform={`translate(${x} ${y}) rotate(${angle})`} />
);

/** Toran: hanging marigold strings and mango leaves across the top. */
export const Toran: React.FC<{ strings?: number; leafColor?: string; flower?: string; flowerDark?: string }> = ({
  strings = 7,
  leafColor = "#2f7d32",
  flower = "#f7a400",
  flowerDark = "#e0661b",
}) => {
  const frame = useCurrentFrame();
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <rect x={0} y={0} width={WIDTH} height={26} fill={flowerDark} />
      {Array.from({ length: 16 }).map((_, i) => (
        <Leaf key={`l${i}`} x={(i + 0.5) * (WIDTH / 16)} y={20} angle={wave(frame, 60, 5, i)} size={70} color={leafColor} />
      ))}
      {Array.from({ length: strings }).map((_, s) => {
        const x = ((s + 0.5) * WIDTH) / strings;
        const len = s % 2 ? 6 : 9;
        const sway = wave(frame, 75, 4, s);
        return (
          <g key={s} transform={`rotate(${sway} ${x} 20)`}>
            <line x1={x} y1={20} x2={x} y2={40 + len * 42} stroke="#7a4a00" strokeWidth={2} />
            {Array.from({ length: len }).map((__, k) => (
              <Marigold key={k} cx={x} cy={50 + k * 42} r={24} color={k % 3 === 2 ? "#ffd23f" : flower} dark={flowerDark} />
            ))}
          </g>
        );
      })}
    </svg>
  );
};

/** Scalloped jharokha arch drawn with an animated stroke. */
export const Arch: React.FC<{ color: string; progress: number; inset?: number; width?: number }> = ({ color, progress, inset = 60, width = 6 }) => {
  const w = WIDTH - inset * 2;
  const top = 300;
  const bottom = HEIGHT - 120;
  const cx = WIDTH / 2;
  const d = [
    `M ${inset} ${bottom}`,
    `L ${inset} ${top + 260}`,
    `C ${inset} ${top + 120}, ${cx - w * 0.28} ${top + 40}, ${cx - 70} ${top}`,
    `Q ${cx} ${top - 120} ${cx + 70} ${top}`,
    `C ${cx + w * 0.28} ${top + 40}, ${WIDTH - inset} ${top + 120}, ${WIDTH - inset} ${top + 260}`,
    `L ${WIDTH - inset} ${bottom}`,
  ].join(" ");
  const len = 5200;
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={len} strokeDashoffset={len * (1 - progress)} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        opacity={0.6}
        transform={`translate(${WIDTH / 2} ${HEIGHT / 2}) scale(0.95 0.97) translate(${-WIDTH / 2} ${-HEIGHT / 2})`}
        strokeDasharray={len}
        strokeDashoffset={len * (1 - progress)}
      />
      {/* finial */}
      <g opacity={progress} transform={`translate(${cx} ${top - 150})`}>
        <circle r={14} fill={color} />
        <path d="M 0 -50 C 12 -30, 12 -16, 0 -10 C -12 -16, -12 -30, 0 -50 Z" fill={color} />
      </g>
    </svg>
  );
};

export const Diya: React.FC<{ x: number; y: number; scale?: number; seed?: number; body: string; rim: string }> = ({ x, y, scale = 1, seed = 0, body, rim }) => {
  const frame = useCurrentFrame();
  const flick = 1 + wave(frame, 7 + (seed % 3), 0.07, seed) + (random(`d${seed}${Math.floor(frame / 3)}`) - 0.5) * 0.05;
  const glow = 0.5 + wave(frame, 11, 0.15, seed);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        <radialGradient id={`glow${seed}`}>
          <stop offset="0%" stopColor="#ffd27a" stopOpacity={glow} />
          <stop offset="100%" stopColor="#ffd27a" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={0} cy={-70} r={120} fill={`url(#glow${seed})`} />
      <path d="M -90 -10 Q 0 90 90 -10 Q 60 -20 0 -18 Q -60 -20 -90 -10 Z" fill={body} />
      <path d="M -90 -10 Q 0 6 90 -10" stroke={rim} strokeWidth={6} fill="none" />
      <path d="M 70 -16 Q 100 -26 104 -40" stroke={body} strokeWidth={14} strokeLinecap="round" fill="none" />
      <g transform={`translate(0 -22) scale(${flick} ${flick * 1.05})`}>
        <path d="M 0 -80 C 22 -50, 20 -18, 0 -8 C -20 -18, -22 -50, 0 -80 Z" fill="#ff9d1c" />
        <path d="M 0 -56 C 10 -40, 10 -20, 0 -14 C -10 -20, -10 -40, 0 -56 Z" fill="#fff1b0" />
      </g>
    </g>
  );
};

/** A row of diyas. `x0`/`x1` (centres of the first and last diya) and `size` let a frame template seat them inside its plinth. */
export const DiyaRow: React.FC<{ y?: number; count?: number; body: string; rim: string; x0?: number; x1?: number; size?: number }> = ({ y = HEIGHT - 90, count = 5, body, rim, x0, x1, size = 1 }) => (
  <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
    {Array.from({ length: count }).map((_, i) => {
      const x = x0 !== undefined && x1 !== undefined ? x0 + ((x1 - x0) * i) / Math.max(1, count - 1) : ((i + 0.5) * WIDTH) / count;
      return <Diya key={i} x={x} y={y} scale={(i % 2 ? 0.55 : 0.7) * size} seed={i} body={body} rim={rim} />;
    })}
  </svg>
);

export const Rings: React.FC<{ size?: number; color: string; gem?: string }> = ({ size = 200, color, gem = "#ffffff" }) => {
  const frame = useCurrentFrame();
  const shine = (Math.sin(frame / 10) + 1) / 2;
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 200 150">
      <circle cx={78} cy={90} r={46} fill="none" stroke={color} strokeWidth={10} />
      <circle cx={122} cy={90} r={46} fill="none" stroke={color} strokeWidth={10} />
      <path d="M 106 32 L 122 18 L 138 32 L 122 50 Z" fill={gem} stroke={color} strokeWidth={3} />
      <path d="M 122 4 L 125 13 L 134 16 L 125 19 L 122 28 L 119 19 L 110 16 L 119 13 Z" fill="#ffffff" opacity={shine} />
    </svg>
  );
};

// ------------------------------------------------------------------ florals

export const Flower: React.FC<{ cx: number; cy: number; r: number; petals?: number; color: string; center: string; rotation?: number; bloom?: number }> = ({
  cx,
  cy,
  r,
  petals = 6,
  color,
  center,
  rotation = 0,
  bloom = 1,
}) => (
  <g transform={`translate(${cx} ${cy}) rotate(${rotation}) scale(${bloom})`}>
    {Array.from({ length: petals }).map((_, i) => (
      <ellipse key={i} cx={0} cy={-r * 0.55} rx={r * 0.34} ry={r * 0.58} fill={color} opacity={0.88} transform={`rotate(${(360 / petals) * i})`} />
    ))}
    {Array.from({ length: petals }).map((_, i) => (
      <ellipse key={`in${i}`} cx={0} cy={-r * 0.3} rx={r * 0.16} ry={r * 0.32} fill="#ffffff" opacity={0.35} transform={`rotate(${(360 / petals) * i + 180 / petals})`} />
    ))}
    <circle r={r * 0.2} fill={center} />
  </g>
);

/** Cluster of flowers, leaves and buds for a corner. `bloom` 0..1 grows it in. */
export const FloralCorner: React.FC<{
  corner: "tl" | "tr" | "bl" | "br";
  bloom: number;
  colors: { petal: string; petal2: string; leaf: string; center: string };
  scale?: number;
}> = ({ corner, bloom, colors, scale = 1 }) => {
  const frame = useCurrentFrame();
  const flipX = corner === "tr" || corner === "br" ? -1 : 1;
  const flipY = corner === "bl" || corner === "br" ? -1 : 1;
  const tx = flipX === 1 ? 0 : WIDTH;
  const ty = flipY === 1 ? 0 : HEIGHT;
  const g = (i: number) => interpolate(bloom, [i * 0.12, i * 0.12 + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const leaves = [
    { x: 250, y: 60, a: 120, s: 150 },
    { x: 80, y: 260, a: 200, s: 140 },
    { x: 330, y: 170, a: 80, s: 110 },
    { x: 170, y: 330, a: 170, s: 120 },
    { x: 420, y: 40, a: 100, s: 100 },
    { x: 40, y: 420, a: 210, s: 100 },
  ];
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <g transform={`translate(${tx} ${ty}) scale(${flipX * scale} ${flipY * scale})`}>
        {leaves.map((l, i) => (
          <Leaf key={i} x={l.x * g(i % 3)} y={l.y * g(i % 3)} angle={l.a + wave(frame, 90, 3, i)} size={l.s * g(i % 3)} color={colors.leaf} />
        ))}
        <Flower cx={110} cy={110} r={130} petals={7} color={colors.petal} center={colors.center} bloom={g(0)} rotation={frame * 0.05} />
        <Flower cx={300} cy={70} r={80} petals={6} color={colors.petal2} center={colors.center} bloom={g(1)} rotation={-frame * 0.08} />
        <Flower cx={70} cy={300} r={80} petals={6} color={colors.petal2} center={colors.center} bloom={g(2)} rotation={frame * 0.07} />
        <Flower cx={260} cy={240} r={52} petals={5} color={colors.petal} center={colors.center} bloom={g(3)} />
        <circle cx={420} cy={150} r={16 * g(4)} fill={colors.petal} />
        <circle cx={150} cy={420} r={16 * g(4)} fill={colors.petal} />
      </g>
    </svg>
  );
};

// ------------------------------------------------------------------ frames + icons

export const LineFrame: React.FC<{ color: string; progress: number; inset?: number; double?: boolean }> = ({ color, progress, inset = 50, double = true }) => {
  const w = WIDTH - inset * 2;
  const h = HEIGHT - inset * 2;
  const per = 2 * (w + h);
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <rect x={inset} y={inset} width={w} height={h} fill="none" stroke={color} strokeWidth={3} strokeDasharray={per} strokeDashoffset={per * (1 - progress)} />
      {double && (
        <rect
          x={inset + 18}
          y={inset + 18}
          width={w - 36}
          height={h - 36}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.7}
          strokeDasharray={per}
          strokeDashoffset={per * (1 - progress)}
        />
      )}
      {[
        [inset, inset],
        [WIDTH - inset, inset],
        [inset, HEIGHT - inset],
        [WIDTH - inset, HEIGHT - inset],
      ].map(([x, y], i) => (
        <path key={i} d={`M ${x} ${y - 22} L ${x + 22} ${y} L ${x} ${y + 22} L ${x - 22} ${y} Z`} fill={color} opacity={progress} />
      ))}
    </svg>
  );
};

/** Small ornament used as a divider between lines. */
export const Divider: React.FC<{ color: string; width?: number; progress?: number; variant?: "dots" | "diamond" | "leaf" }> = ({ color, width = 420, progress = 1, variant = "diamond" }) => {
  const half = (width / 2) * progress;
  return (
    <svg width={width} height={40} viewBox={`0 0 ${width} 40`}>
      <line x1={width / 2 - half} y1={20} x2={width / 2 - 26} y2={20} stroke={color} strokeWidth={2} />
      <line x1={width / 2 + 26} y1={20} x2={width / 2 + half} y2={20} stroke={color} strokeWidth={2} />
      {variant === "diamond" && <path d={`M ${width / 2} 6 L ${width / 2 + 14} 20 L ${width / 2} 34 L ${width / 2 - 14} 20 Z`} fill={color} opacity={progress} />}
      {variant === "dots" && [-14, 0, 14].map((d) => <circle key={d} cx={width / 2 + d} cy={20} r={4} fill={color} opacity={progress} />)}
      {variant === "leaf" && (
        <path d={`M ${width / 2 - 20} 20 Q ${width / 2} 0 ${width / 2 + 20} 20 Q ${width / 2} 40 ${width / 2 - 20} 20 Z`} fill={color} opacity={progress} />
      )}
    </svg>
  );
};

export const Icon: React.FC<{ kind: "calendar" | "clock" | "pin" | "phone"; color: string; size?: number }> = ({ kind, color, size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    {kind === "calendar" && (
      <>
        <rect x={6} y={10} width={36} height={32} rx={4} />
        <path d="M 6 20 H 42 M 16 6 V 14 M 32 6 V 14" />
      </>
    )}
    {kind === "clock" && (
      <>
        <circle cx={24} cy={24} r={18} />
        <path d="M 24 14 V 24 L 31 29" />
      </>
    )}
    {kind === "pin" && (
      <>
        <path d="M 24 44 C 24 44 38 30 38 19 A 14 14 0 0 0 10 19 C 10 30 24 44 24 44 Z" />
        <circle cx={24} cy={19} r={5} />
      </>
    )}
    {kind === "phone" && <path d="M 14 6 L 20 6 L 23 15 L 18 19 C 20 25 23 28 29 30 L 33 25 L 42 28 L 42 34 C 42 38 38 42 34 42 C 18 41 7 30 6 14 C 6 10 10 6 14 6 Z" />}
  </svg>
);

// ------------------------------------------------------------------ petals, splatter

const clamp01 = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Petals drifting down, turning as they fall. */
export const FallingPetals: React.FC<{ colors: string[]; count?: number; seed?: string; size?: number; speed?: number; opacity?: number }> = ({
  colors,
  count = 34,
  seed = "pt",
  size = 26,
  speed = 1,
  opacity = 0.8,
}) => {
  const frame = useCurrentFrame();
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      {Array.from({ length: count }).map((_, i) => {
        const r = (k: string) => random(`${seed}${k}${i}`);
        const v = (1.4 + r("v") * 2.2) * speed;
        const y = ((r("y") * (HEIGHT + 240) + frame * v) % (HEIGHT + 240)) - 120;
        const x = r("x") * WIDTH + wave(frame, 70 + r("w") * 70, 36, i);
        const s = size * (0.6 + r("s") * 0.8);
        const spin = frame * (1 + r("r") * 3) + i * 40;
        const turn = 0.45 + 0.55 * Math.abs(Math.cos(frame / (20 + r("f") * 20) + i));
        return (
          <path
            key={i}
            d={`M 0 ${-s} C ${s * 0.8} ${-s * 0.5}, ${s * 0.7} ${s * 0.6}, 0 ${s} C ${-s * 0.7} ${s * 0.6}, ${-s * 0.8} ${-s * 0.5}, 0 ${-s} Z`}
            fill={colors[i % colors.length]}
            opacity={opacity}
            transform={`translate(${x} ${y}) rotate(${spin}) scale(${turn} 1)`}
          />
        );
      })}
    </svg>
  );
};

/** Corner cluster of dots and blobs, like turmeric paste flicked from a hand. `bloom` 0..1 grows it in. */
export const Splatter: React.FC<{ corner: "tl" | "tr" | "bl" | "br"; bloom: number; colors: string[]; seed?: string; reach?: number }> = ({
  corner,
  bloom,
  colors,
  seed = "spl",
  reach = 560,
}) => {
  const flipX = corner === "tr" || corner === "br" ? -1 : 1;
  const flipY = corner === "bl" || corner === "br" ? -1 : 1;
  const n = 30;
  return (
    <svg style={full} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <g transform={`translate(${flipX === 1 ? 0 : WIDTH} ${flipY === 1 ? 0 : HEIGHT}) scale(${flipX} ${flipY})`}>
        {[
          { x: 40, y: 50, r: 190 },
          { x: 190, y: 20, r: 110 },
          { x: 30, y: 210, r: 120 },
        ].map((b, i) => (
          <circle key={`b${i}`} cx={b.x} cy={b.y} r={b.r * interpolate(bloom, [i * 0.1, i * 0.1 + 0.4], [0, 1], clamp01)} fill={colors[i % colors.length]} opacity={0.9} />
        ))}
        {Array.from({ length: n }).map((_, i) => {
          const a = random(`${seed}a${i}`) * (Math.PI / 2);
          const dist = 150 + Math.pow(random(`${seed}d${i}`), 1.4) * reach;
          const r = (6 + random(`${seed}r${i}`) * 30) * (1 - (dist / (reach + 150)) * 0.6);
          const grow = interpolate(bloom, [0.2 + (i / n) * 0.5, 0.2 + (i / n) * 0.5 + 0.3], [0, 1], clamp01);
          return <circle key={i} cx={Math.cos(a) * dist} cy={Math.sin(a) * dist} r={r * grow} fill={colors[i % colors.length]} opacity={0.55 + random(`${seed}o${i}`) * 0.4} />;
        })}
      </g>
    </svg>
  );
};
