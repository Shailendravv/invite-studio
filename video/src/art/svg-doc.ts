/** A parsed SVG element. Generated from the files in video/public/assets/svg. */
export interface SvgNode {
  /** Tag name: g, defs, path, circle, ellipse, line, rect or use. */
  t: string;
  /** Attributes as written in the file (`xlink:href` is stored as `href`). */
  a: Record<string, string>;
  c: SvgNode[];
}

export interface SvgDoc {
  viewBox: string;
  nodes: SvgNode[];
}
