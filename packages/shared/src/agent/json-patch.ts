// Minimal RFC 6902 subset (add / replace / remove) used for spec revisions.

export interface PatchOp {
  op: "add" | "replace" | "remove";
  path: string;
  value?: unknown;
}

export class PatchError extends Error {}

function parsePointer(pointer: string): string[] {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) throw new PatchError(`Invalid JSON pointer "${pointer}"`);
  return pointer
    .slice(1)
    .split("/")
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
}

const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

export function applyPatch<T>(doc: T, ops: PatchOp[]): T {
  const root = structuredClone(doc) as unknown;
  for (const op of ops) {
    const parts = parsePointer(op.path);
    if (parts.length === 0) throw new PatchError("Replacing the whole document is not allowed");
    if (parts.some((p) => FORBIDDEN.has(p))) throw new PatchError(`Forbidden path "${op.path}"`);
    let parent: any = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (parent[key] === undefined || parent[key] === null) {
        if (op.op === "remove") throw new PatchError(`Path not found: ${op.path}`);
        parent[key] = /^\d+$/.test(parts[i + 1]) || parts[i + 1] === "-" ? [] : {};
      }
      parent = parent[key];
      if (typeof parent !== "object") throw new PatchError(`Path not found: ${op.path}`);
    }
    const last = parts[parts.length - 1];
    if (Array.isArray(parent)) {
      const idx = last === "-" ? parent.length : Number(last);
      if (!Number.isInteger(idx) || idx < 0 || idx > parent.length) throw new PatchError(`Bad array index in ${op.path}`);
      if (op.op === "add") parent.splice(idx, 0, op.value);
      else if (op.op === "replace") {
        if (idx >= parent.length) throw new PatchError(`Path not found: ${op.path}`);
        parent[idx] = op.value;
      } else {
        if (idx >= parent.length) throw new PatchError(`Path not found: ${op.path}`);
        parent.splice(idx, 1);
      }
    } else if (op.op === "remove") {
      delete parent[last];
    } else {
      // "replace" of a missing optional field behaves like "add": friendlier for LLM output.
      parent[last] = op.value;
    }
  }
  return root as T;
}
