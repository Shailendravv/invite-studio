// Renders the artwork from video/public/assets/svg (via svg-docs.generated.ts) as
// inline SVG, recoloured to the template palette, with any part animatable by id.
import React from "react";
import type { SvgNode } from "./svg-doc";
import { SVG_DOCS } from "./svg-docs.generated";

export type SvgName = keyof typeof SVG_DOCS;

/** The one ink colour every asset is drawn in. */
export const SVG_INK = "#5A1818";

/** What an animation callback can change about one element on this frame. */
export interface SvgAnim {
  /** SVG transform applied inside the element's own transform (so a `use` or a rotated petal spins about its own origin). */
  transform?: string;
  opacity?: number;
  /** 0..1: draws strokes in from nothing (no effect on dashed strokes, which fade instead). Inherited by descendants. */
  draw?: number;
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeDashoffset?: number;
  /** Replaces the stroke width (in the file's own units), for fine line art that needs more weight at small sizes. */
  strokeWidth?: number;
}

export interface SvgNodeInfo {
  tag: string;
  id?: string;
  attrs: Record<string, string>;
  /** Ids of the ancestor groups (including the group a `use` points to). */
  path: string[];
  /** Position among its siblings. */
  idx: number;
  /** Position among elements of the same kind in the whole drawing (for `use`: among uses of the same target). */
  nth: number;
}

export type SvgAnimate = (node: SvgNodeInfo) => SvgAnim | undefined;

interface Ctx {
  map: Record<string, string>;
  defs: Map<string, SvgNode>;
  animate?: SvgAnimate;
  counters: Map<string, number>;
}

const SHAPES = new Set(["path", "circle", "ellipse", "line", "rect"]);

function collectDefs(nodes: readonly SvgNode[], into = new Map<string, SvgNode>()): Map<string, SvgNode> {
  for (const n of nodes) {
    if (n.t === "defs") for (const d of n.c) if (d.a.id) into.set(d.a.id, d);
    collectDefs(n.c, into);
  }
  return into;
}

const camel = (k: string) => k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

function recolor(value: string, map: Record<string, string>): string {
  return map[value.toLowerCase()] ?? value;
}

function renderNode(node: SvgNode, ctx: Ctx, path: string[], idx: number, inherited: number | undefined, key: string): React.ReactNode {
  if (node.t === "defs") return null;
  const a = node.a;
  const isUse = node.t === "use";
  const target = isUse ? ctx.defs.get((a.href ?? "").slice(1)) : undefined;
  if (isUse && !target) return null;

  const counterKey = isUse ? `use:${a.href}` : node.t;
  const nth = ctx.counters.get(counterKey) ?? 0;
  ctx.counters.set(counterKey, nth + 1);

  const anim = ctx.animate?.({ tag: node.t, id: a.id, attrs: a, path, idx, nth });
  const draw = anim?.draw ?? inherited;
  const childPath = a.id ? [...path, a.id] : path;

  // `use` places its target with x/y (and optional transform); everything else keeps its transform.
  const placed = isUse ? [a.transform, a.x || a.y ? `translate(${a.x ?? 0} ${a.y ?? 0})` : undefined].filter(Boolean).join(" ") : a.transform;

  const props: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(a)) {
    if (k === "id" || k === "transform" || k === "href" || (isUse && (k === "x" || k === "y"))) continue;
    props[camel(k)] = k === "fill" || k === "stroke" ? recolor(v, ctx.map) : v;
  }
  if (anim?.fill !== undefined) props.fill = anim.fill;
  if (anim?.stroke !== undefined) props.stroke = anim.stroke;
  if (anim?.fillOpacity !== undefined) props.fillOpacity = anim.fillOpacity;
  if (anim?.strokeDashoffset !== undefined) props.strokeDashoffset = anim.strokeDashoffset;
  if (anim?.strokeWidth !== undefined) props.strokeWidth = anim.strokeWidth;

  let content: React.ReactNode;
  if (SHAPES.has(node.t)) {
    if (draw !== undefined) {
      const ramp = Math.max(0, Math.min(1, draw * 2.5));
      if (a["stroke-dasharray"] === undefined) {
        props.pathLength = 1;
        props.strokeDasharray = 1;
        props.strokeDashoffset = 1 - draw;
      }
      props.opacity = ramp;
    }
    content = React.createElement(node.t, { ...props, key });
  } else {
    const kids = (isUse ? [target as SvgNode] : node.c).map((c, i) => renderNode(c, ctx, childPath, i, draw, `${key}.${i}`));
    content = node.t === "g" ? React.createElement("g", { ...props, key }, kids) : <React.Fragment key={key}>{kids}</React.Fragment>;
  }

  const animated =
    anim && (anim.transform !== undefined || anim.opacity !== undefined) ? (
      <g key={`${key}a`} transform={anim.transform} opacity={anim.opacity}>
        {content}
      </g>
    ) : (
      content
    );
  return placed ? (
    <g key={`${key}p`} transform={placed}>
      {animated}
    </g>
  ) : (
    animated
  );
}

export const SvgArt: React.FC<{
  name: SvgName;
  /** Replaces the ink colour (#5A1818). */
  color?: string;
  /** Replaces other colours used in the file, keyed by hex (case-insensitive). */
  recolor?: Record<string, string>;
  animate?: SvgAnimate;
  style?: React.CSSProperties;
  /** Extra drawing in the file's own coordinates, behind (`under`) or in front of (`over`) the artwork. */
  under?: React.ReactNode;
  over?: React.ReactNode;
}> = ({ name, color, recolor: extra, animate, style, under, over }) => {
  const doc = SVG_DOCS[name];
  const defs = React.useMemo(() => collectDefs(doc.nodes as unknown as SvgNode[]), [doc]);
  const map: Record<string, string> = { [SVG_INK.toLowerCase()]: color ?? SVG_INK };
  for (const [k, v] of Object.entries(extra ?? {})) map[k.toLowerCase()] = v;
  const ctx: Ctx = { map, defs, animate, counters: new Map() };
  return (
    <svg viewBox={doc.viewBox} width="100%" height="100%" style={{ display: "block", overflow: "visible", ...style }}>
      {under}
      {(doc.nodes as unknown as SvgNode[]).map((n, i) => renderNode(n, ctx, [], i, undefined, `n${i}`))}
      {over}
    </svg>
  );
};
