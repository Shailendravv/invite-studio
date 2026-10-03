import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export type EntranceKind = "rise" | "pop" | "fade" | "unfold" | "drop";

/** Entrance animation for an element, `delay` frames after its scene starts. */
export function useEntrance(delay: number, kind: EntranceKind): React.CSSProperties {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  switch (kind) {
    case "pop": {
      const s = spring({ frame: f, fps, config: { damping: 9, stiffness: 140, mass: 0.6 } });
      return { opacity, transform: `scale(${interpolate(s, [0, 1], [0.4, 1])})` };
    }
    case "rise": {
      const s = spring({ frame: f, fps, config: { damping: 18, stiffness: 90 } });
      return { opacity, transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)` };
    }
    case "drop": {
      const s = spring({ frame: f, fps, config: { damping: 12, stiffness: 120 } });
      return { opacity, transform: `translateY(${interpolate(s, [0, 1], [-80, 0])}px)` };
    }
    case "unfold": {
      const p = interpolate(f, [0, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
      return { opacity, transform: `scaleY(${0.6 + 0.4 * p})`, letterSpacing: undefined, filter: `blur(${(1 - p) * 6}px)` };
    }
    default:
      return { opacity };
  }
}

export const Enter: React.FC<{ delay?: number; kind?: EntranceKind; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay = 0,
  kind = "rise",
  children,
  style,
}) => {
  const anim = useEntrance(delay, kind);
  return <div style={{ ...style, ...anim, display: "flex", flexDirection: "column", alignItems: "center" }}>{children}</div>;
};

/** Fades a whole scene in and out. `duration` is the scene length in frames. */
export const SceneFade: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", inset: 0, opacity: Math.min(fadeIn, fadeOut) }}>{children}</div>;
};

/** Slow sine wave helper for idle motion. */
export function wave(frame: number, periodFrames: number, amplitude: number, phase = 0): number {
  return Math.sin((frame / periodFrames) * Math.PI * 2 + phase) * amplitude;
}
