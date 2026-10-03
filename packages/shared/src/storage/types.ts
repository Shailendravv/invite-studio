import type { Readable } from "node:stream";

export interface StoredObject {
  key: string;
  size: number;
  modifiedAt: Date;
}

export interface SignedUrlOptions {
  /** Defaults to LINK_TTL_HOURS. */
  ttlHours?: number;
  /** Suggested download file name (Content-Disposition). */
  downloadName?: string;
}

/**
 * Object storage abstraction. Keys are POSIX-style relative paths such as
 * "clients/rahul-priya/2026-03-15_engagement_ab12cd34/invitation.mp4".
 * LocalDiskStorage is the only implementation today; an S3-compatible adapter
 * (Garage, SeaweedFS, MinIO...) can implement the same interface later.
 */
export interface StorageAdapter {
  put(key: string, data: Buffer | string | Readable): Promise<void>;
  /** Copies (or moves) a local file into storage. Efficient path for large videos. */
  putFile(key: string, sourcePath: string, opts?: { move?: boolean }): Promise<void>;
  get(key: string): Promise<Buffer>;
  getStream(key: string, range?: { start: number; end: number }): Readable;
  stat(key: string): Promise<StoredObject | null>;
  exists(key: string): Promise<boolean>;
  /** Lists object keys under a prefix (recursive). */
  list(prefix: string): Promise<StoredObject[]>;
  /** Deletes one object, or every object under the prefix when it ends with "/". */
  delete(keyOrPrefix: string): Promise<void>;
  /** Moves every object under one prefix to another. */
  movePrefix(fromPrefix: string, toPrefix: string): Promise<void>;
  createSignedUrl(key: string, opts?: SignedUrlOptions): string;
  /** Validates a token from createSignedUrl; returns the key or null. */
  verifySignedToken(token: string): { key: string; downloadName?: string } | null;
  /**
   * Absolute local path for tools that need a real file (ffmpeg, Remotion).
   * Remote adapters would download to a temp file here.
   */
  localPath(key: string): string;
}
