import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { openToken, sealToken } from "../security/sign";
import type { SignedUrlOptions, StorageAdapter, StoredObject } from "./types";

const FILE_TOKEN_PURPOSE = "file";

export class InvalidKeyError extends Error {}

/** Rejects anything that could escape the storage root. */
export function normalizeKey(key: string): string {
  if (typeof key !== "string" || key.length === 0 || key.length > 512) throw new InvalidKeyError("Invalid storage key");
  if (key.includes("\0") || key.includes("\\") || /^[a-zA-Z]:/.test(key) || key.startsWith("/")) {
    throw new InvalidKeyError("Invalid storage key");
  }
  const parts = key.split("/");
  const trailingSlash = key.endsWith("/");
  const clean = parts.filter((p, i) => !(p === "" && (i === parts.length - 1 || i === 0)));
  if (clean.some((p) => p === "" || p === "." || p === "..")) throw new InvalidKeyError("Invalid storage key");
  return clean.join("/") + (trailingSlash && clean.length ? "/" : "");
}

export class LocalDiskStorage implements StorageAdapter {
  readonly root: string;

  constructor(
    root: string,
    private readonly opts: { signingSecret: string; publicBaseUrl: string; defaultTtlHours: number },
  ) {
    this.root = path.resolve(root);
    fs.mkdirSync(this.root, { recursive: true });
  }

  localPath(key: string): string {
    const clean = normalizeKey(key);
    const full = path.resolve(this.root, ...clean.split("/").filter(Boolean));
    const rel = path.relative(this.root, full);
    if (rel.startsWith("..") || path.isAbsolute(rel)) throw new InvalidKeyError("Invalid storage key");
    return full;
  }

  async put(key: string, data: Buffer | string | Readable): Promise<void> {
    const file = this.localPath(key);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    if (data instanceof Readable) await pipeline(data, fs.createWriteStream(tmp));
    else await fsp.writeFile(tmp, data);
    await fsp.rename(tmp, file);
  }

  async putFile(key: string, sourcePath: string, opts: { move?: boolean } = {}): Promise<void> {
    const file = this.localPath(key);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    if (opts.move) {
      try {
        await fsp.rename(sourcePath, file);
        return;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EXDEV") throw e;
      }
      await fsp.copyFile(sourcePath, file);
      await fsp.rm(sourcePath, { force: true });
      return;
    }
    await fsp.copyFile(sourcePath, file);
  }

  async get(key: string): Promise<Buffer> {
    return fsp.readFile(this.localPath(key));
  }

  getStream(key: string, range?: { start: number; end: number }): Readable {
    return fs.createReadStream(this.localPath(key), range ? { start: range.start, end: range.end } : undefined);
  }

  async stat(key: string): Promise<StoredObject | null> {
    try {
      const s = await fsp.stat(this.localPath(key));
      if (!s.isFile()) return null;
      return { key: normalizeKey(key), size: s.size, modifiedAt: s.mtime };
    } catch {
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.stat(key)) !== null;
  }

  async list(prefix: string): Promise<StoredObject[]> {
    const base = prefix ? this.localPath(prefix) : this.root;
    const out: StoredObject[] = [];
    const walk = async (dir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) await walk(full);
        else if (e.isFile() && !e.name.endsWith(".tmp")) {
          const s = await fsp.stat(full);
          out.push({ key: path.relative(this.root, full).split(path.sep).join("/"), size: s.size, modifiedAt: s.mtime });
        }
      }
    };
    await walk(base);
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }

  async delete(keyOrPrefix: string): Promise<void> {
    const target = this.localPath(keyOrPrefix);
    if (target === this.root) throw new InvalidKeyError("Refusing to delete the storage root");
    await fsp.rm(target, { recursive: keyOrPrefix.endsWith("/"), force: true });
    await this.pruneEmptyParents(path.dirname(target));
  }

  async movePrefix(fromPrefix: string, toPrefix: string): Promise<void> {
    const from = this.localPath(fromPrefix);
    const to = this.localPath(toPrefix);
    if (!fs.existsSync(from)) return;
    await fsp.mkdir(path.dirname(to), { recursive: true });
    try {
      await fsp.rename(from, to);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EXDEV" && (e as NodeJS.ErrnoException).code !== "EPERM") throw e;
      await fsp.cp(from, to, { recursive: true, errorOnExist: true, force: false });
      await fsp.rm(from, { recursive: true, force: true });
    }
    await this.pruneEmptyParents(path.dirname(from));
  }

  createSignedUrl(key: string, opts: SignedUrlOptions = {}): string {
    const k = normalizeKey(key);
    const ttl = opts.ttlHours ?? this.opts.defaultTtlHours;
    const token = sealToken(
      { k, ...(opts.downloadName ? { n: opts.downloadName } : {}) },
      { secret: this.opts.signingSecret, purpose: FILE_TOKEN_PURPOSE, expiresAt: Date.now() + ttl * 3600_000 },
    );
    return `${this.opts.publicBaseUrl}/api/files/${token}`;
  }

  verifySignedToken(token: string): { key: string; downloadName?: string } | null {
    const payload = openToken<{ k: string; n?: string }>(token, { secret: this.opts.signingSecret, purpose: FILE_TOKEN_PURPOSE });
    if (!payload || typeof payload.k !== "string") return null;
    try {
      return { key: normalizeKey(payload.k), downloadName: typeof payload.n === "string" ? payload.n : undefined };
    } catch {
      return null;
    }
  }

  private async pruneEmptyParents(dir: string): Promise<void> {
    let current = dir;
    while (current.startsWith(this.root) && current !== this.root) {
      try {
        const entries = await fsp.readdir(current);
        if (entries.length) return;
        await fsp.rmdir(current);
      } catch {
        return;
      }
      current = path.dirname(current);
    }
  }
}
