// Animated versions of the artwork in video/public/assets/svg. Each motif tells
// SvgArt what to do with the named parts of its file on every frame (draw the
// outline in, swing, bloom, flicker...). Only useCurrentFrame/interpolate/random,
// like every other template animation.
import React from "react";
import { Easing, interpolate, random, useCurrentFrame } from "remotion";
import { wave } from "../components/anim";
import { SvgArt, type SvgAnimate } from "./svg-art";

const ease = Easing.out(Easing.cubic);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0..1 between two frames, easing out. */
const prog = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });

/** 0..1 with a small overshoot, for things that pop into place. */
function pop(frame: number, from: number, len = 14): number {
  const p = interpolate(frame, [from, from + len], [0, 1], clamp);
  return p >= 1 ? 1 : p * (1 + 0.28 * Math.sin(p * Math.PI));
}

/** Applies `inner` (a transform) about the point (cx, cy). */
const about = (cx: number, cy: number, inner: string) => `translate(${cx} ${cy}) ${inner} translate(${-cx} ${-cy})`;

/** Absolutely positioned box for an SvgArt, optionally rotated about `origin` or mirrored. */
export const Place: React.FC<{
  left: number;
  top: number;
  width: number;
  height: number;
  rotate?: number;
  origin?: string;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number;
  children: React.ReactNode;
}> = ({ left, top, width, height, rotate = 0, origin = "50% 50%", flipX, flipY, opacity, children }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      height,
      opacity,
      transformOrigin: origin,
      // CSS needs commas here (SVG transform strings use spaces), or the whole value is ignored.
      transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1}) rotate(${rotate}deg)`,
      pointerEvents: "none",
    }}
  >
    {children}
  </div>
);

// ------------------------------------------------------------------ Marigold Garland (hanging strand)

export interface GarlandColors {
  petal: string;
  petal2: string;
  center: string;
  ring: string;
  leaf: string;
  leafDark: string;
  string: string;
}

/** A hanging strand of marigolds and mango leaves: flowers pop in one by one, then turn; the strand sways from the top. */
export const MarigoldStrand: React.FC<{ colors: GarlandColors; delay?: number; phase?: number }> = ({ colors, delay = 0, phase = 0 }) => {
  const frame = useCurrentFrame();
  const animate: SvgAnimate = (n) => {
    if (n.tag === "use" && n.attrs.href === "#single_genda_flower") {
      const s = pop(frame, delay + n.nth * 6);
      return { transform: `scale(${s}) rotate(${frame * (n.nth % 2 ? 0.45 : -0.45)})`, opacity: s > 0 ? 1 : 0 };
    }
    if (n.tag === "use") {
      const s = pop(frame, delay + 8 + n.nth * 6);
      return { transform: `rotate(${wave(frame, 80, 8, n.nth + phase)}) scale(${s})`, opacity: s > 0 ? 1 : 0 };
    }
    if (n.tag === "line") return { opacity: prog(frame, delay, delay + 14) };
    if (n.tag === "circle") return { transform: about(+n.attrs.cx, +n.attrs.cy, `scale(${pop(frame, delay + 40 + n.idx * 4)})`) };
    return undefined;
  };
  return (
    <SvgArt
      name="marigold_garland"
      color={colors.string}
      recolor={{
        "#f28c0f": colors.petal,
        "#b85a00": colors.ring,
        "#ffb52e": colors.petal2,
        "#d97706": colors.ring,
        "#ffd54a": colors.center,
        "#3e8e41": colors.leaf,
        "#1f5a24": colors.leafDark,
      }}
      animate={animate}
      style={{ transformOrigin: "50% 0%", transform: `rotate(${wave(frame, 100, 2.4, phase)}deg)` }}
    />
  );
};

// ------------------------------------------------------------------ Toran Bandhanwar

/** Door-top toran: the rope draws across, the pendants drop in and swing. */
export const ToranSwing: React.FC<{ color: string; delay?: number }> = ({ color, delay = 0 }) => {
  const frame = useCurrentFrame();
  const animate: SvgAnimate = (n) => {
    if (n.id === "main_rope") return { draw: prog(frame, delay, delay + 28) };
    if (n.id === "rope_scallop_accent") return { opacity: prog(frame, delay + 10, delay + 30), strokeDashoffset: -frame * 0.3 };
    if (n.tag === "use") {
      const s = pop(frame, delay + 14 + n.nth * 5, 16);
      return { transform: `rotate(${wave(frame, 70, 4.5, n.nth * 0.9)}) scale(1 ${s})`, opacity: s > 0 ? 1 : 0 };
    }
    if (n.tag === "circle" && !n.path.includes("toran_drop")) return { transform: about(+n.attrs.cx, +n.attrs.cy, `scale(${pop(frame, delay + 8 + (+n.attrs.cx / 800) * 20)})`) };
    return undefined;
  };
  return <SvgArt name="05_toran_bandhanwar" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Mehndi Corner Ornament

/** Henna corner (drawn for the top-right corner; mirror it with Place): hub opens, scallops fan out, the paisley is drawn in. */
export const MehndiCorner: React.FC<{ color: string; accent: string; delay?: number }> = ({ color, accent, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "hub-core") return { transform: about(400, 0, `scale(${pop(frame, d)})`) };
    if (n.id === "hub-ring-01") return { draw: prog(frame, d + 4, d + 30) };
    if (n.id === "hub-ring-02") return { transform: `rotate(${frame * 0.5} 400 0)`, opacity: prog(frame, d + 10, d + 30) };
    if (n.path.includes("scallop-rays") && n.tag === "path") return { transform: about(400, 0, `scale(${pop(frame, d + 12 + n.idx * 5, 16)})`) };
    if (n.id === "paisley-main-outline") return { draw: prog(frame, d + 10, d + 75), fill: accent, fillOpacity: 0.16 };
    if (n.id === "paisley-main-inner") return { opacity: prog(frame, d + 55, d + 85) };
    if (n.path.includes("dots")) return { transform: about(+n.attrs.cx, +n.attrs.cy, `scale(${pop(frame, d + 62 + n.idx * 6)})`) };
    if (n.id === "teardrop-01") return { transform: `translate(0 ${-30 * (1 - prog(frame, d + 66, d + 88))})`, opacity: prog(frame, d + 66, d + 82) };
    return undefined;
  };
  return <SvgArt name="01_mehndi_corner" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Elegant Paisley (Ambi)

/** Ambi paisley: the body and inner frame are drawn in, the pearl band marches along, the lotus opens. */
export const AmbiPaisley: React.FC<{ color: string; accent: string; delay?: number }> = ({ color, accent, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "shell-outer") return { draw: prog(frame, d, d + 55), fill: accent, fillOpacity: 0.12 };
    if (n.id === "shell-inner") return { draw: prog(frame, d + 12, d + 65) };
    if (n.id === "shell-curl") return { draw: prog(frame, d + 45, d + 75) };
    if (n.path.includes("pearls")) return { opacity: prog(frame, d + 30, d + 60), strokeDashoffset: -frame * 0.25 };
    if (n.path.includes("lotus") && n.tag === "path") {
      const open = pop(frame, d + 50 + (n.idx === 0 ? 0 : 6 + n.idx * 3), 22);
      const side = n.id?.includes("left") ? -1 : n.id?.includes("right") ? 1 : 0;
      const outer = n.id?.includes("outer");
      return {
        transform: about(150, 290, `rotate(${side * (1 - open) * (outer ? 50 : 30) + wave(frame, 90, side * 1.5, n.idx)}) scale(${open})`),
        fill: n.idx === 0 || outer ? accent : undefined,
      };
    }
    if (n.path.includes("lotus-dots")) return { transform: about(+n.attrs.cx, +n.attrs.cy, `scale(${pop(frame, d + 80 + n.idx * 4)})`) };
    return undefined;
  };
  return <SvgArt name="ambi" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Mandala border / floral border

/** Geometric mandala border strip (800x120): rails draw across, the tiles pop in and breathe. */
export const MandalaBorder: React.FC<{ color: string; delay?: number }> = ({ color, delay = 0 }) => {
  const frame = useCurrentFrame();
  const animate: SvgAnimate = (n) => {
    if (n.tag === "line") return { draw: prog(frame, delay, delay + 40) };
    if (n.tag === "use") {
      const s = pop(frame, delay + 10 + n.nth * 7, 16);
      return { transform: about(75, 60, `scale(${s * (1 + 0.035 * Math.sin(frame / 14 + n.nth))}) rotate(${wave(frame, 160, 4, n.nth)})`), opacity: s > 0 ? 1 : 0 };
    }
    return undefined;
  };
  return <SvgArt name="24_mandala_border" color={color} animate={animate} />;
};

/** Floral vine border strip (800x120): rails draw across, the vine units rise and sway. */
export const FloralBorder: React.FC<{ color: string; delay?: number }> = ({ color, delay = 0 }) => {
  const frame = useCurrentFrame();
  const animate: SvgAnimate = (n) => {
    if (n.tag === "line") return n.attrs["stroke-dasharray"] ? { opacity: prog(frame, delay + 10, delay + 40), strokeDashoffset: -frame * 0.2 } : { draw: prog(frame, delay, delay + 40) };
    if (n.tag === "use") {
      const s = prog(frame, delay + 8 + n.nth * 8, delay + 30 + n.nth * 8);
      return { transform: `translate(0 ${14 * (1 - s) + wave(frame, 90, 3, n.nth)})`, opacity: s };
    }
    return undefined;
  };
  return <SvgArt name="12_floral_border" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Haldi bowl

/** Ubtan bowl: the vessel draws in, the turmeric paste rises, petals float on it. */
export const HaldiBowl: React.FC<{ color: string; paste: string; petal: string; delay?: number }> = ({ color, paste, petal, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "haldi_mound") {
      const grow = 0.15 + 0.85 * prog(frame, d + 14, d + 55);
      return { transform: about(150, 106, `scale(1 ${grow * (1 + 0.025 * Math.sin(frame / 12))})`), fill: paste, fillOpacity: 0.92 };
    }
    if (n.path.includes("floating_petals")) {
      return { transform: `translate(${wave(frame, 90, 2, n.idx)} ${wave(frame, 46, 3.5, n.idx * 2)})`, fill: petal, opacity: prog(frame, d + 50 + n.idx * 5, d + 62 + n.idx * 5) };
    }
    if (n.path.length === 1 && n.id !== "floating_petals" && n.tag !== "g") return { draw: prog(frame, d + n.idx * 4, d + 34 + n.idx * 4) };
    return undefined;
  };
  return <SvgArt name="16_haldi_bowl" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Wedding diya

/** Diya with a flickering flame and a soft glow. */
export const DiyaFlame: React.FC<{ color: string; flame: string; core: string; delay?: number }> = ({ color, flame, core, delay = 0 }) => {
  const frame = useCurrentFrame();
  const jitter = (random(`dy${Math.floor(frame / 2)}`) - 0.5) * 0.07;
  const sx = 1 + wave(frame, 9, 0.06) + jitter;
  const sy = 1 + wave(frame, 7, 0.08) + jitter;
  const glow = 0.45 + wave(frame, 11, 0.12) + jitter;
  const animate: SvgAnimate = (n) => {
    if (n.id === "diya_flame") return { transform: about(125, 125, `skewX(${wave(frame, 13, 3)}) scale(${sx * pop(frame, delay + 30)} ${sy * pop(frame, delay + 30)})`) };
    if (n.path.includes("diya_flame")) {
      if (n.idx === 0) return { fill: core, fillOpacity: 0.95, stroke: core };
      if (n.idx === 1) return { fill: flame, fillOpacity: 0.85, stroke: flame };
      return { fill: flame };
    }
    if (n.path.includes("wedding_diya") && n.tag === "path") return { draw: prog(frame, delay + n.idx * 6, delay + 30 + n.idx * 6) };
    if (n.tag === "line") return { draw: prog(frame, delay + 6, delay + 30) };
    return undefined;
  };
  const under = (
    <>
      <defs>
        <radialGradient id="diya-glow">
          <stop offset="0%" stopColor={flame} stopOpacity={glow} />
          <stop offset="100%" stopColor={flame} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={125} cy={78} r={125} fill="url(#diya-glow)" />
    </>
  );
  return <SvgArt name="06_wedding_diya" color={color} animate={animate} under={under} />;
};

// ------------------------------------------------------------------ Royal jhummar

/** Hanging chandelier: swings from its chain, the tiers draw in and the crystals shimmer. */
export const Jhummar: React.FC<{ color: string; crystal: string; delay?: number }> = ({ color, crystal, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.path.includes("crystal_drops")) {
      return { fill: crystal, opacity: prog(frame, d + 40 + n.idx * 3, d + 55 + n.idx * 3) * (0.62 + 0.38 * Math.sin(frame / 8 + n.idx)) };
    }
    if (n.tag === "line") return { opacity: prog(frame, d, d + 12), strokeDashoffset: -frame * 0.3 };
    if (n.tag === "circle") return { transform: about(150, 70, `scale(${pop(frame, d + 6)})`) };
    if (n.tag === "path" && n.attrs["stroke-dasharray"]) return { opacity: prog(frame, d + 28, d + 48), strokeDashoffset: -frame * 0.2 };
    if (n.tag === "path") return { draw: prog(frame, d + 8 + n.idx * 7, d + 40 + n.idx * 7), fill: crystal, fillOpacity: 0.14 };
    return undefined;
  };
  return <SvgArt name="22_royal_jhummar" color={color} animate={animate} style={{ transformOrigin: "50% 0%", transform: `rotate(${wave(frame, 130, 3)}deg)` }} />;
};

// ------------------------------------------------------------------ Rangoli

/** Concentric rangoli: rings draw in, dashed rings march, the petals and spokes turn in opposite directions. */
export const Rangoli: React.FC<{ color: string; delay?: number }> = ({ color, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "center_bindu") return { transform: about(200, 200, `scale(${pop(frame, d) * (1 + 0.12 * Math.sin(frame / 10))})`) };
    if (n.tag === "circle") return n.attrs["stroke-dasharray"] ? { opacity: prog(frame, d + n.idx * 6, d + 30 + n.idx * 6), strokeDashoffset: -frame * 0.35 } : { draw: prog(frame, d + n.idx * 6, d + 40 + n.idx * 6) };
    if (n.id === "radial_spokes") return { transform: `rotate(${frame * 0.2} 200 200)`, opacity: prog(frame, d + 20, d + 45) };
    if (n.id === "petals_cardinal") return { transform: `rotate(${frame * 0.25} 200 200)` };
    if (n.id === "petals_diagonal") return { transform: `rotate(${-frame * 0.25} 200 200)` };
    if (n.id === "petal_loops") return { opacity: prog(frame, d + 30, d + 60) };
    return undefined;
  };
  return <SvgArt name="03_circular_rangoli" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Sacred lotus

/** Lotus that opens petal by petal from the centre outwards, then breathes. */
export const LotusBloom: React.FC<{ color: string; fill?: string; delay?: number }> = ({ color, fill, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (!n.path.includes("sacred_lotus")) return undefined;
    if (n.tag === "circle") return { transform: about(150, 205, `scale(${pop(frame, d + 40)})`) };
    const order = [0, 1, 2, 3, 4, 5, 6][n.idx] ?? 0;
    const open = pop(frame, d + order * 7, 24);
    const breathe = 1 + 0.012 * Math.sin(frame / 18);
    const pod = n.idx >= 5;
    return {
      transform: pod
        ? about(150, 190, `scale(${open} 1)`)
        : about(150, 190, `scale(${(0.15 + 0.85 * open) * breathe} ${(0.3 + 0.7 * open) * breathe})`),
      opacity: Math.min(1, open * 1.5),
      fill: fill ?? undefined,
      fillOpacity: fill ? 0.28 - n.idx * 0.02 : undefined,
    };
  };
  return <SvgArt name="09_sacred_lotus" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Peacock feather

export interface FeatherColors {
  stalk: string;
  barb: string;
  outer: string;
  mid: string;
  eye: string;
  core: string;
}

/** One peacock feather (200x400, quill foot at 100,380): grows from the quill, the eye opens and pulses, the barbs ripple. */
export const PeacockFeatherSvg: React.FC<{ colors: FeatherColors; delay?: number }> = ({ colors, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "feather_quill") return { draw: prog(frame, d, d + 24) };
    if (n.id === "feather_eye") return { transform: about(100, 115, `scale(${pop(frame, d + 16, 20) * (1 + 0.03 * Math.sin(frame / 14 + d))})`) };
    if (n.path.includes("feather_eye")) {
      if (n.idx === 0) return { fill: colors.outer, fillOpacity: 0.55, stroke: colors.barb };
      if (n.idx === 1) return { fill: colors.mid, fillOpacity: 0.78, stroke: colors.mid };
      if (n.idx === 2) return { fill: colors.eye, fillOpacity: 0.95, stroke: colors.mid };
      return { fill: colors.core, fillOpacity: 1, stroke: colors.core };
    }
    if (n.path.includes("feather_barbs") && n.tag === "path") {
      const m = /M\s*([\d.]+)[ ,]+([\d.]+)/.exec(n.attrs.d ?? "");
      return { draw: prog(frame, d + 10 + n.idx * 3, d + 40 + n.idx * 3), transform: `rotate(${wave(frame, 80, 2.4, n.idx)} ${m?.[1] ?? 100} ${m?.[2] ?? 200})`, stroke: colors.barb };
    }
    return undefined;
  };
  return <SvgArt name="23_peacock_feather" color={colors.stalk} animate={animate} />;
};

/** Fan of feathers opening from a point; `open` 0..1 spreads them out. */
export const PeacockFan: React.FC<{ cx: number; cy: number; length: number; open: number; colors: FeatherColors; base: string; angles?: number[] }> = ({
  cx,
  cy,
  length,
  open,
  colors,
  base,
  angles = [-80, -60, -40, -20, 0, 20, 40, 60, 80],
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {angles.map((a, i) => {
        const len = length - Math.abs(a) * 0.5;
        return (
          <Place
            key={a}
            left={cx - len / 4}
            top={cy - len * 0.95}
            width={len / 2}
            height={len}
            origin="50% 95%"
            rotate={a * (0.25 + 0.75 * open) + wave(frame, 90, 1.6, i)}
            opacity={open}
          >
            <PeacockFeatherSvg colors={colors} delay={i * 3} />
          </Place>
        );
      })}
      {/* the knot the quills grow from */}
      <svg style={{ position: "absolute", left: cx - 44, top: cy - 44, opacity: open }} width={88} height={88} viewBox="-44 -44 88 88">
        <circle r={40} fill={base} />
        <circle r={27} fill="none" stroke={colors.core} strokeWidth={3} />
        <circle r={9} fill={colors.core} />
      </svg>
    </>
  );
};

// ------------------------------------------------------------------ Ganesha

/**
 * Ganesha icon: outlines draw in, the ears flap, the tilak glows, a halo breathes behind.
 * `strength` scales the gold wash inside the outlines (1 = light icon, ~2.5 = solid golden idol for a hero placement).
 */
export const GaneshaBlessing: React.FC<{ color: string; fill: string; glow: string; height?: number; delay?: number; strength?: number }> = ({ color, fill, glow, height = 210, delay = 0, strength = 1 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const halo = 0.32 + wave(frame, 60, 0.1);
  const wash = (o: number) => Math.min(0.85, o * strength);
  const animate: SvgAnimate = (n) => {
    if (n.id === "ganesha_icon") return { transform: about(150, 175, `scale(${1 + 0.012 * Math.sin(frame / 18)})`) };
    if (n.id === "mukut_crown") return { draw: prog(frame, d, d + 24), fill, fillOpacity: wash(0.55), strokeWidth: 5 };
    if (n.id === "face_trunk") return { draw: prog(frame, d + 10, d + 55), fill, fillOpacity: wash(0.3), strokeWidth: 6 };
    if (n.id === "tilak_marks") return { transform: about(150, 110, `scale(${pop(frame, d + 50)})`), fill: glow };
    if (n.path.length === 1 && n.tag === "line") return { draw: prog(frame, d + 14, d + 28), strokeWidth: 3.5 };
    if (n.path.length === 1 && n.tag === "path") {
      if (n.idx === 2 || n.idx === 3) {
        const left = n.idx === 2;
        return { draw: prog(frame, d + 8 + (n.idx - 2) * 4, d + 40), transform: `rotate(${wave(frame, 70, left ? 3 : -3, n.idx)} ${left ? 120 : 180} 100)`, fill, fillOpacity: wash(0.22), strokeWidth: 5 };
      }
      return { transform: about(127, 154, `scale(${pop(frame, d + 46)})`), fill: glow }; // tusk
    }
    return undefined;
  };
  const under = (
    <>
      <defs>
        <radialGradient id="ganesha-halo">
          <stop offset="0%" stopColor={glow} stopOpacity={halo} />
          <stop offset="100%" stopColor={glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={150} cy={140} r={190} fill="url(#ganesha-halo)" />
    </>
  );
  return (
    <div style={{ width: (height * 300) / 350, height }}>
      <SvgArt name="18_ganesha_icon" color={color} animate={animate} under={under} />
    </div>
  );
};

// ------------------------------------------------------------------ Rajasthani jharokha

/** Jharokha arch (400x500) as a frame: the arch and its inner contour are drawn in, the plinth follows, the pendant swings. */
export const Jharokha: React.FC<{ color: string; fill: string; glow: string; delay?: number; pendant?: boolean }> = ({ color, fill, glow, delay = 0, pendant = true }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "arch_pendant" && !pendant) return { opacity: 0 };
    if (n.id === "arch_pendant") return { transform: `rotate(${wave(frame, 75, 6)})`, opacity: prog(frame, d + 50, d + 70) };
    if (n.path.includes("arch_pendant")) return undefined;
    if (n.path.length !== 1) return undefined;
    if (n.tag === "rect") return n.attrs["stroke-dasharray"] ? { opacity: prog(frame, d + 20, d + 55), strokeDashoffset: -frame * 0.25 } : { draw: prog(frame, d + 6, d + 55), fill, fillOpacity: 0.06 };
    if (n.tag === "path" && n.idx === 2) return { draw: prog(frame, d, d + 60), fill, fillOpacity: 0.16 };
    if (n.tag === "path") return { draw: prog(frame, d + 14, d + 68) };
    if (n.tag === "line") return { draw: prog(frame, d + 40 + n.idx * 4, d + 70) };
    return undefined;
  };
  const under = (
    <>
      <defs>
        <radialGradient id="jharokha-glow">
          <stop offset="0%" stopColor={glow} stopOpacity={0.28 + wave(frame, 90, 0.04)} />
          <stop offset="100%" stopColor={glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={200} cy={300} rx={190} ry={230} fill="url(#jharokha-glow)" />
    </>
  );
  return <SvgArt name="11_rajasthani_jharokha" color={color} animate={animate} under={under} />;
};

// ------------------------------------------------------------------ Royal peacock (bird)

/** The royal peacock bird: body and wing draw in, the tail fans sway, the eyespots pulse in turn. */
export const RoyalPeacock: React.FC<{ color: string; fill: string; delay?: number }> = ({ color, fill, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "royal_peacock") return { transform: `translate(0 ${wave(frame, 90, 2.5)})` };
    if (n.id === "peacock_body") return { draw: prog(frame, d, d + 55), fill, fillOpacity: 0.16, strokeWidth: 4 };
    if (n.id === "peacock_beak") return { transform: about(140, 78, `scale(${pop(frame, d + 40)})`) };
    if (n.id === "peacock_eye") return { transform: about(160, 73, `scale(${pop(frame, d + 46)})`) };
    if (n.id === "peacock_wing") return { draw: prog(frame, d + 20, d + 65), fill, fillOpacity: 0.26, transform: `rotate(${wave(frame, 80, 1.6)} 165 185)` };
    if (n.path.includes("feather_train_fans")) {
      const m = /M\s*([\d.]+)[ ,]+([\d.]+)/.exec(n.attrs.d ?? "");
      return { draw: prog(frame, d + 30 + n.idx * 9, d + 75 + n.idx * 9), transform: `rotate(${wave(frame, 95, 2.4, n.idx)} ${m?.[1] ?? 190} ${m?.[2] ?? 250})`, strokeWidth: 2 };
    }
    if (n.path.includes("feather_eyespots") && n.tag === "circle") {
      const spot = Math.floor(n.idx / 2);
      const beat = 1 + 0.14 * Math.max(0, Math.sin(frame / 13 - spot * 1.4));
      return { transform: about(+n.attrs.cx, +n.attrs.cy, `scale(${pop(frame, d + 70 + spot * 8) * beat})`), ...(n.idx % 2 === 0 ? { fill, fillOpacity: 0.4 } : {}) };
    }
    if (n.tag === "path" && n.path.length === 1 && n.idx === 3) return { draw: prog(frame, d + 45, d + 70), strokeWidth: 2 };
    if (n.tag === "circle" && n.attrs.r === "2.5" && !n.path.includes("feather_eyespots")) return { transform: about(+n.attrs.cx, +n.attrs.cy, `scale(${pop(frame, d + 62 + n.idx * 6)})`) };
    return undefined;
  };
  return <SvgArt name="10_royal_peacock" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Mandap pillar

/** Mandap pillar (200x500): the plinth, shaft and capital are drawn up from the base; the temple bell swings. */
export const MandapPillar: React.FC<{ color: string; fill: string; delay?: number }> = ({ color, fill, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "hanging_bell") return { transform: `rotate(${wave(frame, 64, 7)} 0 380)`, opacity: prog(frame, d + 55, d + 70) };
    if (n.path.includes("pillar_shaft")) return n.tag === "rect" ? { draw: prog(frame, d + 14, d + 48), fill, fillOpacity: 0.05 } : { draw: prog(frame, d + 26 + n.idx * 3, d + 52) };
    if (n.path.includes("pillar_capital")) {
      if (n.tag === "path") return { draw: prog(frame, d + 34, d + 60), fill, fillOpacity: 0.28 };
      if (n.tag === "circle") return { transform: about(100, 100, `scale(${pop(frame, d + 56)})`) };
      return { draw: prog(frame, d + 40, d + 62) };
    }
    if (n.path.length === 1 && n.id !== "pillar_shaft" && n.id !== "pillar_capital") return { draw: prog(frame, d + n.idx * 5, d + 24 + n.idx * 5), fill, fillOpacity: 0.16 };
    return undefined;
  };
  return <SvgArt name="15_mandap_pillar" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Purna kalash

/**
 * Purna kalash: the pot and mauli draw in, the mango leaves sway, the coconut settles on top.
 * The file also engraves a swastika on the pot; it is hidden here, so the kalash is safe for every design.
 */
export const PurnaKalash: React.FC<{ color: string; fill: string; delay?: number }> = ({ color, fill, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.tag === "path" && (n.attrs.d ?? "").startsWith("M 130,220")) return { opacity: 0 };
    if (n.id === "coconut_top") return { transform: about(150, 135, `scale(${pop(frame, d + 44)})`), fill };
    if (n.path.includes("mango_leaves_cluster")) return { draw: prog(frame, d + 16 + n.idx * 4, d + 46), transform: `rotate(${wave(frame, 88, 3.2, n.idx)} 150 135)`, fill, fillOpacity: 0.3 };
    if (n.path.length === 1 && n.tag === "path" && n.idx === 1) return { draw: prog(frame, d + 4, d + 40), fill, fillOpacity: 0.22, strokeWidth: 4 };
    if (n.path.length === 1) return { draw: prog(frame, d + n.idx * 4, d + 26 + n.idx * 4) };
    return undefined;
  };
  return <SvgArt name="07_purna_kalash" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Elephant and chhatri (small corner pieces)

/** Royal elephant: outline draws in, then the trunk and ear move slowly and the whole figure rocks as if walking. */
export const RoyalElephant: React.FC<{ color: string; fill: string; delay?: number }> = ({ color, fill, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "royal_elephant") return { transform: about(190, 350, `rotate(${wave(frame, 70, 1.2)})`) };
    if (n.id === "elephant_body") return { draw: prog(frame, d, d + 50), fill, fillOpacity: 0.14 };
    if (n.id === "elephant_trunk") return { draw: prog(frame, d + 20, d + 55), transform: `rotate(${wave(frame, 66, 5)} 335 150)` };
    if (n.id === "elephant_ear") return { draw: prog(frame, d + 24, d + 58), transform: `rotate(${wave(frame, 78, 4, 1)} 240 120)`, fill, fillOpacity: 0.28 };
    if (n.id === "royal_jhul") return { draw: prog(frame, d + 30, d + 65), fill, fillOpacity: 0.36 };
    if (n.tag === "circle") return { transform: about(295, 130, `scale(${pop(frame, d + 60)})`) };
    if (n.tag === "path" && n.attrs["stroke-dasharray"]) return { opacity: prog(frame, d + 50, d + 70) };
    return { draw: prog(frame, d + 40, d + 66) };
  };
  return <SvgArt name="14_royal_elephant" color={color} animate={animate} />;
};

/** Royal umbrella: the canopy and valance draw in, the pearl tassels swing in turn, the whole canopy tilts a little. */
export const RoyalChhatri: React.FC<{ color: string; fill: string; delay?: number }> = ({ color, fill, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "royal_chhatri") return { transform: about(175, 400, `rotate(${wave(frame, 120, 1.6)})`) };
    if (n.id === "canopy_dome") return { draw: prog(frame, d, d + 45), fill, fillOpacity: 0.16 };
    if (n.id === "scallop_valance") return { draw: prog(frame, d + 20, d + 55), fill, fillOpacity: 0.3 };
    if (n.tag === "circle" && n.path.length === 1 && n.idx === 5) return { transform: about(175, 14, `scale(${pop(frame, d + 52)})`) };
    if (n.tag === "circle") return { transform: `translate(0 ${wave(frame, 46, 3.5, n.idx * 0.9)})`, opacity: prog(frame, d + 55 + n.idx * 4, d + 70 + n.idx * 4) };
    if (n.tag === "path" && n.attrs["stroke-dasharray"]) return { opacity: prog(frame, d + 30, d + 55) };
    return { draw: prog(frame, d + 8 + n.idx * 6, d + 40 + n.idx * 6) };
  };
  return <SvgArt name="17_royal_chhatri" color={color} animate={animate} />;
};

// ------------------------------------------------------------------ Baraat: horse, dhol, shehnai

/** Baraat horse: draws in, then trots in place (a gentle bob, legs and kalgi plume swaying). */
export const BaaratHorse: React.FC<{ color: string; fill: string; accent: string; delay?: number }> = ({ color, fill, accent, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.id === "baarat_horse") return { transform: `translate(0 ${wave(frame, 44, 3)})` };
    if (n.id === "horse_body") return { draw: prog(frame, d, d + 50), fill, fillOpacity: 0.18, strokeWidth: 4 };
    if (n.id === "legs_front") return { draw: prog(frame, d + 10, d + 46), transform: `rotate(${wave(frame, 44, 2.6)} 280 280)`, strokeWidth: 3.5 };
    if (n.id === "legs_rear") return { draw: prog(frame, d + 14, d + 50), transform: `rotate(${wave(frame, 44, -2.6)} 118 280)`, strokeWidth: 3 };
    if (n.tag === "rect") return { draw: prog(frame, d + 34, d + 60), fill: accent, fillOpacity: 0.34, transform: about(232, 182, `scale(${1 + 0.02 * Math.sin(frame / 12)})`) };
    if (n.tag === "circle") return { transform: about(232, 182, `scale(${pop(frame, d + 58)})`) };
    if (n.tag === "path" && n.idx === 3) return { draw: prog(frame, d + 30, d + 58), fill: accent, fillOpacity: 0.9, transform: `rotate(${wave(frame, 36, 6)} 140 63)` };
    return { draw: prog(frame, d + 40, d + 64), strokeWidth: 2 };
  };
  return <SvgArt name="19_baarat_horse" color={color} animate={animate} />;
};

/** Dhol: the barrel and ropes draw in, then both drumheads take turns pulsing like a slow beat. */
export const Dhol: React.FC<{ color: string; fill: string; delay?: number }> = ({ color, fill, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const beat = (phase: number) => Math.max(0, Math.sin(frame / 7 + phase)) ** 3;
  const animate: SvgAnimate = (n) => {
    if (n.id === "dhol_barrel") return { draw: prog(frame, d, d + 42), fill, fillOpacity: 0.16, strokeWidth: 4 };
    if (n.tag === "ellipse") {
      const b = beat(n.idx === 1 ? 0 : Math.PI);
      return { transform: about(+n.attrs.cx, +n.attrs.cy, `scale(${1 + 0.06 * b} ${1 + 0.025 * b})`), fill, fillOpacity: 0.3 + 0.2 * b, strokeWidth: 4 };
    }
    if (n.path.includes("tension_ropes")) return n.attrs["stroke-dasharray"] ? { opacity: prog(frame, d + 30, d + 50) } : { draw: prog(frame, d + 18 + n.idx * 6, d + 52 + n.idx * 6), strokeWidth: 2.5 };
    if (n.tag === "circle") return { transform: about(170, 245, `scale(${pop(frame, d + 52)})`) };
    return { draw: prog(frame, d + 24, d + 54) };
  };
  return <SvgArt name="13_sangeet_dhol" color={color} animate={animate} />;
};

/** Shehnai: the pipe draws in, the finger holes light up one after another as if a tune is played, the tassel swings. */
export const Shehnai: React.FC<{ color: string; fill: string; delay?: number }> = ({ color, fill, delay = 0 }) => {
  const frame = useCurrentFrame();
  const d = delay;
  const animate: SvgAnimate = (n) => {
    if (n.path.includes("finger_holes")) return { opacity: prog(frame, d + 36 + n.idx * 3, d + 46 + n.idx * 3) * (0.4 + 0.6 * Math.max(0, Math.sin(frame / 9 - n.idx * 0.9))) };
    if (n.id === "tassel_cluster") return { transform: `rotate(${wave(frame, 52, 6)} 230 120)`, opacity: prog(frame, d + 40, d + 56) };
    if (n.path.includes("tassel_cluster")) return undefined;
    if (n.tag === "path" && n.idx === 0) return { draw: prog(frame, d, d + 40), fill, fillOpacity: 0.22, strokeWidth: 3 };
    if (n.tag === "path" && n.idx === 2) return { draw: prog(frame, d + 14, d + 50), fill, fillOpacity: 0.34, strokeWidth: 3.5 };
    if (n.tag === "path" && n.attrs["stroke-dasharray"]) return { opacity: prog(frame, d + 36, d + 54) };
    return { draw: prog(frame, d + 20, d + 52), strokeWidth: 3 };
  };
  return <SvgArt name="08_shehnai" color={color} animate={animate} />;
};
