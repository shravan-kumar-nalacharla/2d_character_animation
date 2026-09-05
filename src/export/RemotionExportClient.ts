import type { ProjectDocument } from "../project/schema";
import type { ExportSettings } from "./OfflineAnimationRenderer";

export interface RenderJobProgress {
  id: string;
  status: "queued" | "preparing" | "rendering" | "encoding" | "completed" | "failed" | "cancelled";
  progress: number;
  renderedFrames: number;
  encodedFrames: number;
  totalFrames: number;
  speed: number;
  etaSeconds: number | null;
  message: string;
  error?: string;
  fileName?: string;
  downloadUrl?: string;
}

interface StartOptions { project: ProjectDocument; settings: ExportSettings; audioFile: File | null; signal: AbortSignal; onProgress(job: RenderJobProgress): void }
const activeKey = "algowzxd.active-render";

export async function startRemotionExport(options: StartOptions) {
  let audioId: string | undefined;
  if (options.settings.includeAudio && options.audioFile) {
    const response = await fetch("/api/render/audio", { method: "POST", headers: { "content-type": options.audioFile.type || "application/octet-stream", "x-file-name": encodeURIComponent(options.audioFile.name) }, body: options.audioFile, signal: options.signal });
    audioId = (await jsonOk<{ audioId: string }>(response)).audioId;
  }
  const response = await fetch("/api/render", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project: options.project, settings: options.settings, audioId }), signal: options.signal });
  const job = await jsonOk<RenderJobProgress>(response);
  localStorage.setItem(activeKey, job.id);
  return watchRemotionExport(job.id, options.signal, options.onProgress);
}

export async function watchRemotionExport(id: string, signal: AbortSignal, onProgress: (job: RenderJobProgress) => void) {
  const cancel = () => { void fetch(`/api/render/${encodeURIComponent(id)}`, { method: "DELETE" }); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    for (;;) {
      if (signal.aborted) throw new DOMException("Export cancelled", "AbortError");
      const response = await fetch(`/api/render/${encodeURIComponent(id)}`);
      if (response.status === 404) localStorage.removeItem(activeKey);
      const job = await jsonOk<RenderJobProgress>(response);
      onProgress(job);
      if (job.status === "completed" && job.downloadUrl) {
        localStorage.removeItem(activeKey);
        const link = document.createElement("a"); link.href = job.downloadUrl; link.download = job.fileName ?? "algowzxd-export"; link.click();
        return job.fileName ?? "algowzxd-export";
      }
      if (job.status === "failed") { localStorage.removeItem(activeKey); throw new Error(job.error || "Remotion render failed."); }
      if (job.status === "cancelled") { localStorage.removeItem(activeKey); throw new DOMException("Export cancelled", "AbortError"); }
      await wait(500, signal);
    }
  } finally { signal.removeEventListener("abort", cancel); }
}

export function storedRenderId() { return localStorage.getItem(activeKey); }

async function jsonOk<T>(response: Response): Promise<T> { const value = await response.json().catch(() => ({})) as T & { error?: string }; if (!response.ok) throw new Error(value.error || `Render request failed (${response.status}).`); return value; }
const wait = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => { const timer = window.setTimeout(resolve, milliseconds); signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Export cancelled", "AbortError")); }, { once: true }); });
