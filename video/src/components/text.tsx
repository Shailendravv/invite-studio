import React, { createContext, useContext, useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { fontsReady } from "../fonts";
import { WIDTH } from "../timeline";

/** 8% safe area on every side. */
export const SAFE_X = Math.round(WIDTH * 0.08);
export const SAFE_Y = Math.round(1920 * 0.08);
export const CONTENT_WIDTH = WIDTH - SAFE_X * 2;

/** Width available to text at this point of the tree (smaller inside padded panels). */
export const WidthContext = createContext(CONTENT_WIDTH);

let ready = false;
fontsReady.then(() => (ready = true));

/** Renders children only after every font has loaded, so text measurement is exact. */
export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setReady] = useState(ready);
  const [handle] = useState(() => (ready ? null : delayRender("Loading fonts")));
  useEffect(() => {
    if (isReady) return;
    fontsReady.then(() => {
      setReady(true);
      if (handle !== null) continueRender(handle);
    });
  }, [isReady, handle]);
  return isReady ? <>{children}</> : null;
};

let ctx: CanvasRenderingContext2D | null = null;

/** Width of a single line of text in px at the given size. */
export function measure(text: string, fontFamily: string, fontSize: number, weight: number | string = 400, letterSpacingEm = 0): number {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * fontSize * 0.6;
  ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width + Math.max(0, text.length - 1) * letterSpacingEm * fontSize;
}

/** Largest size (<= max) at which `text` fits on one line within `width`. */
export function fitSize(text: string, opts: { fontFamily: string; weight?: number | string; width: number; max: number; min?: number; letterSpacingEm?: number; italic?: boolean }): number {
  const at100 = measure(text, opts.italic ? `italic ${opts.fontFamily}` : opts.fontFamily, 100, opts.weight, opts.letterSpacingEm);
  if (at100 <= 0) return opts.max;
  const size = Math.floor((100 * opts.width) / at100);
  return Math.max(opts.min ?? 24, Math.min(opts.max, size));
}

export interface TextStyle {
  fontFamily: string;
  weight?: number | string;
  color: string;
  italic?: boolean;
  letterSpacingEm?: number;
  uppercase?: boolean;
  shadow?: string;
  /** CSS background for gradient text (background-clip). */
  gradient?: string;
  lineHeight?: number;
}

function cssFor(s: TextStyle, fontSize: number): React.CSSProperties {
  return {
    fontFamily: s.fontFamily,
    fontWeight: s.weight ?? 400,
    fontStyle: s.italic ? "italic" : "normal",
    fontSize,
    lineHeight: s.lineHeight ?? 1.25,
    letterSpacing: s.letterSpacingEm ? `${s.letterSpacingEm}em` : undefined,
    textTransform: s.uppercase ? "uppercase" : undefined,
    textShadow: s.gradient ? undefined : s.shadow,
    filter: s.gradient && s.shadow ? `drop-shadow(${s.shadow})` : undefined,
    color: s.gradient ? "transparent" : s.color,
    backgroundImage: s.gradient,
    WebkitBackgroundClip: s.gradient ? "text" : undefined,
    backgroundClip: s.gradient ? "text" : undefined,
    textAlign: "center",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    margin: 0,
    padding: s.gradient ? "0.08em 0.12em" : undefined,
  };
}

const DEVANAGARI_RUN = /[ऀ-ॿ]+(?:[\s।॥]+[ऀ-ॿ]+)*/g;

/**
 * Devanagari must never get letter-spacing (it breaks conjuncts), uppercase or
 * a synthetic italic, so those runs are wrapped in a neutral span.
 */
function ScriptRuns({ text, style }: { text: string; style: TextStyle }): React.ReactNode {
  if (!style.letterSpacingEm && !style.italic && !style.uppercase) return text;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(DEVANAGARI_RUN)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    parts.push(
      <span key={m.index} style={{ letterSpacing: "normal", fontStyle: "normal", textTransform: "none" }}>
        {m[0]}
      </span>,
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * Text that shrinks to fit the width on one line. With maxLines=2 it may break
 * at the best word boundary when two balanced lines allow a clearly larger size.
 * If it would get smaller than `min`, it wraps at `min` (still inside the safe area).
 */
export const FitLine: React.FC<{
  text: string;
  style: TextStyle;
  max: number;
  min?: number;
  width?: number;
  maxLines?: 1 | 2;
  extraStyle?: React.CSSProperties;
}> = ({ text, style, max, min = 40, width: widthProp, maxLines = 1, extraStyle }) => {
  const ctxWidth = useContext(WidthContext);
  const width = widthProp ?? ctxWidth;
  const upper = (t: string) => (style.uppercase ? t.toUpperCase() : t);
  // Leave room for gradient padding / italic overhang.
  const opts = { fontFamily: style.fontFamily, weight: style.weight, width: width * 0.94, max, min, letterSpacingEm: style.letterSpacingEm, italic: style.italic };
  let size = fitSize(upper(text), opts);
  let content = text;
  const words = text.trim().split(/\s+/);
  if (maxLines === 2 && words.length > 1 && size < max * 0.85) {
    let best: { a: string; b: string; size: number } | null = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      const s2 = Math.min(fitSize(upper(a), opts), fitSize(upper(b), opts));
      if (!best || s2 > best.size) best = { a, b, size: s2 };
    }
    if (best && best.size > size * 1.15) {
      size = best.size;
      content = `${best.a}
${best.b}`;
    }
  }
  return (
    <div style={{ ...cssFor(style, size), maxWidth: width, ...extraStyle }}>
      <ScriptRuns text={content} style={style} />
    </div>
  );
};

/**
 * Multi-line text sized from its length so it fills (but never exceeds) a box.
 * Area model: each character needs ~0.62em x lineHeight.
 */
export const Paragraph: React.FC<{
  text: string;
  style: TextStyle;
  max: number;
  min?: number;
  width?: number;
  height: number;
  extraStyle?: React.CSSProperties;
}> = ({ text, style, max, min = 34, width: widthProp, height, extraStyle }) => {
  const ctxWidth = useContext(WidthContext);
  const width = widthProp ?? ctxWidth;
  const lh = style.lineHeight ?? 1.35;
  const chars = Math.max(1, text.length);
  let size = Math.sqrt((width * height) / (chars * 0.62 * lh));
  size = Math.max(min, Math.min(max, size));
  // Never let the longest word overflow the line.
  const longest = text.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), "");
  if (longest) size = Math.min(size, fitSize(longest, { fontFamily: style.fontFamily, weight: style.weight, width: width * 0.95, max: size, min: 20 }));
  return (
    <div style={{ ...cssFor({ ...style, lineHeight: lh }, Math.floor(size)), maxWidth: width, textWrap: "balance", ...extraStyle } as React.CSSProperties}>
      <ScriptRuns text={text} style={style} />
    </div>
  );
};
