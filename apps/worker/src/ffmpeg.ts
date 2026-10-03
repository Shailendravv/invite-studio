import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Duration in seconds of any media file (ffprobe). */
export async function probeDuration(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
  const d = Number(stdout.trim());
  if (!Number.isFinite(d) || d <= 0) throw new Error(`Could not read duration of ${file}`);
  return d;
}

export const SHARE_TARGET_BYTES = 15 * 1024 * 1024; // stay under WhatsApp's ~16 MB limit

/**
 * WhatsApp-friendly copy: H.264 + AAC, bitrate chosen from the duration so the
 * file lands under ~15 MB, faststart for instant playback. Long videos drop to 720p.
 */
export async function makeShareCopy(input: string, output: string, durationSec: number): Promise<void> {
  const audioKbps = 128;
  const totalKbps = Math.floor((SHARE_TARGET_BYTES * 8) / 1000 / Math.max(1, durationSec)) - audioKbps;
  const videoKbps = Math.max(600, Math.min(4500, Math.floor(totalKbps * 0.92)));
  const scale = videoKbps < 1800 ? "scale=720:1280:flags=lanczos" : "scale=1080:1920:flags=lanczos";
  await run(
    "ffmpeg",
    [
      "-y",
      "-loglevel", "error",
      "-i", input,
      "-vf", scale,
      "-c:v", "libx264",
      "-preset", "slow",
      "-profile:v", "high",
      "-pix_fmt", "yuv420p",
      "-b:v", `${videoKbps}k`,
      "-maxrate", `${Math.floor(videoKbps * 1.4)}k`,
      "-bufsize", `${videoKbps * 2}k`,
      "-c:a", "aac",
      "-b:a", `${audioKbps}k`,
      "-ac", "2",
      "-movflags", "+faststart",
      output,
    ],
    { maxBuffer: 10 * 1024 * 1024 },
  );
}

export async function ffmpegAvailable(): Promise<boolean> {
  try {
    await run("ffmpeg", ["-version"]);
    await run("ffprobe", ["-version"]);
    return true;
  } catch {
    return false;
  }
}
