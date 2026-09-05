import type { Plugin } from "vite";
import { bundle } from "@remotion/bundler";
import { fork, type ChildProcess } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

type JobStatus = "queued" | "preparing" | "rendering" | "encoding" | "completed" | "failed" | "cancelled";
interface RenderJob {
  id: string;
  status: JobStatus;
  progress: number;
  renderedFrames: number;
  encodedFrames: number;
  totalFrames: number;
  fps: number;
  speed: number;
  etaSeconds: number | null;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  message: string;
  error?: string;
  output?: string;
  fileName?: string;
  directory: string;
  child?: ChildProcess;
  request: Record<string, unknown>;
}

const terminal = new Set<JobStatus>(["completed", "failed", "cancelled"]);

export function remotionRenderPlugin(): Plugin {
  const root = resolve(".temp", "remotion-renders");
  const jobs = new Map<string, RenderJob>();
  const audio = new Map<string, { path: string; name: string; mimeType: string }>();
  const queue: string[] = [];
  let activeId: string | null = null;
  let bundlePromise: Promise<string> | null = null;

  const ensureBundle = () => bundlePromise ??= bundle({
    entryPoint: resolve("remotion", "index.ts"),
    publicDir: resolve("assets"),
    outDir: resolve(".temp", "remotion-bundle"),
    enableCaching: true,
    onProgress: (progress) => {
      if (!activeId) return;
      const job = jobs.get(activeId);
      const normalized = progress > 1 ? progress / 100 : progress;
      if (job?.status === "preparing") { job.progress = normalized * .06; job.message = `Preparing renderer… ${Math.round(normalized * 100)}%`; }
    },
  });

  const processQueue = async () => {
    if (activeId) return;
    const id = queue.shift();
    if (!id) return;
    const job = jobs.get(id);
    if (!job || job.status === "cancelled") return void processQueue();
    activeId = id;
    job.status = "preparing"; job.startedAt = Date.now(); job.message = "Preparing cached Remotion bundle…";
    try {
      await mkdir(job.directory, { recursive: true });
      const serveUrl = await ensureBundle();
      if ((job.status as JobStatus) === "cancelled") throw new Error("Render cancelled.");
      const jobFile = join(job.directory, "job.json");
      await writeFile(jobFile, JSON.stringify({ ...job.request, id, serveUrl, directory: job.directory }), "utf8");
      const child = fork(resolve("server", "remotion-render-worker.mjs"), [jobFile], { cwd: resolve("."), stdio: ["ignore", "pipe", "pipe", "ipc"] });
      job.child = child;
      let stderr = "";
      child.stderr?.on("data", (chunk) => { stderr = (stderr + chunk).slice(-12000); });
      child.on("message", (raw: unknown) => {
        const message = raw as Record<string, any>;
        if (message.type === "progress") Object.assign(job, message.value);
        if (message.type === "complete") {
          job.status = "completed"; job.progress = 1; job.finishedAt = Date.now(); job.message = "Render complete";
          job.output = message.output; job.fileName = message.fileName;
        }
        if (message.type === "failed" && job.status !== "cancelled") { job.status = "failed"; job.error = message.error; job.message = "Render failed"; job.finishedAt = Date.now(); }
      });
      child.on("error", (error) => { if (!terminal.has(job.status)) { job.status = "failed"; job.error = error.message; job.finishedAt = Date.now(); } });
      child.on("exit", (code) => {
        if (!terminal.has(job.status)) { job.status = code === 0 && job.output ? "completed" : "failed"; job.error = job.error ?? (stderr || `Renderer exited with code ${code}.`); job.finishedAt = Date.now(); }
        job.child = undefined; activeId = null; void processQueue();
      });
    } catch (reason) {
      if ((job.status as JobStatus) !== "cancelled") { job.status = "failed"; job.error = reason instanceof Error ? reason.message : String(reason); job.finishedAt = Date.now(); }
      activeId = null; void processQueue();
    }
  };

  return { name: "algowzxd-remotion-renderer", configureServer(server) {
    server.watcher.on("change", (changed) => {
      if ([resolve("remotion"), resolve("src")].some((directory) => changed.startsWith(directory))) bundlePromise = null;
    });
    server.middlewares.use(async (request: any, response: any, next: any) => {
      const parsed = new URL(request.url ?? "/", "http://local"), path = parsed.pathname;
      if (!path.startsWith("/api/render")) return next();
      try {
        if (path === "/api/render/status") return sendJson(response, 200, { ready: true, renderer: "Remotion 4.0.518", active: activeId, queued: queue.length, bundleCached: Boolean(bundlePromise) });
        if (path === "/api/render/active") return sendJson(response, 200, { jobs: [...jobs.values()].filter((job) => !terminal.has(job.status)).map(publicJob) });
        if (path === "/api/render/audio" && request.method === "POST") {
          const id = randomUUID(), name = decodeURIComponent(String(request.headers["x-file-name"] || "dialogue.audio")), extension = extname(name) || ".audio", directory = join(root, "audio");
          await mkdir(directory, { recursive: true });
          const target = join(directory, `${id}${extension}`); await writeFile(target, await readBuffer(request, 500_000_000));
          audio.set(id, { path: target, name, mimeType: String(request.headers["content-type"] || "application/octet-stream") });
          return sendJson(response, 200, { audioId: id });
        }
        const audioMatch = path.match(/^\/api\/render\/audio\/([^/]+)$/);
        if (audioMatch && request.method === "GET") {
          const item = audio.get(audioMatch[1]); if (!item) return sendJson(response, 404, { error: "Audio file was not found." });
          response.statusCode = 200; response.setHeader("content-type", item.mimeType); response.setHeader("accept-ranges", "bytes"); return createReadStream(item.path).pipe(response);
        }
        if (path === "/api/render" && request.method === "POST") {
          const input = await readJson(request, 150_000_000), project = input.project as any, settings = input.settings as any;
          if (!project?.stage || !settings?.format) return sendJson(response, 400, { error: "Project snapshot and export settings are required." });
          const id = randomUUID(), directory = join(root, id), totalFrames = Math.max(1, Math.ceil(Number(project.stage.duration) * Number(settings.fps)));
          const audioId = typeof input.audioId === "string" ? input.audioId : undefined;
          const host = request.headers.host || "localhost:4173";
          const job: RenderJob = { id, status: "queued", progress: 0, renderedFrames: 0, encodedFrames: 0, totalFrames, fps: Number(settings.fps), speed: 0, etaSeconds: null, createdAt: Date.now(), message: "Queued", directory, request: { project, settings, audioUrl: audioId ? `http://${host}/api/render/audio/${audioId}` : undefined } };
          jobs.set(id, job); queue.push(id); void processQueue();
          return sendJson(response, 202, publicJob(job));
        }
        const match = path.match(/^\/api\/render\/([^/]+)(?:\/(file))?$/), job = match ? jobs.get(match[1]) : undefined;
        if (!job) return sendJson(response, 404, { error: "Render job was not found." });
        if (match?.[2] === "file" && request.method === "GET") {
          if (job.status !== "completed" || !job.output) return sendJson(response, 409, { error: "Render is not complete." });
          response.statusCode = 200; response.setHeader("content-disposition", `attachment; filename="${job.fileName}"`); response.setHeader("content-type", job.fileName?.endsWith(".mp4") ? "video/mp4" : job.fileName?.endsWith(".webm") ? "video/webm" : "application/zip"); return createReadStream(job.output).pipe(response);
        }
        if (request.method === "DELETE" || request.method === "POST" && path.endsWith("/cancel")) {
          if (!terminal.has(job.status)) { job.status = "cancelled"; job.message = "Cancelled"; job.finishedAt = Date.now(); const index = queue.indexOf(job.id); if (index >= 0) queue.splice(index, 1); job.child?.send({ type: "cancel" }); }
          return sendJson(response, 200, publicJob(job));
        }
        if (request.method === "GET") return sendJson(response, 200, publicJob(job));
        return sendJson(response, 405, { error: "Method not allowed." });
      } catch (reason) { return sendJson(response, 500, { error: reason instanceof Error ? reason.message : "Render request failed." }); }
    });
  }, config() { return { server: { watch: { ignored: ["**/.temp/**"] } } }; } };
}

function publicJob(job: RenderJob) { return { id: job.id, status: job.status, progress: job.progress, renderedFrames: job.renderedFrames, encodedFrames: job.encodedFrames, totalFrames: job.totalFrames, fps: job.fps, speed: job.speed, etaSeconds: job.etaSeconds, message: job.message, error: job.error, createdAt: job.createdAt, startedAt: job.startedAt, finishedAt: job.finishedAt, fileName: job.fileName, downloadUrl: job.status === "completed" ? `/api/render/${job.id}/file` : undefined }; }
function readBuffer(request: any, limit: number): Promise<Buffer> { return new Promise((resolveBuffer, reject) => { const chunks: Buffer[] = []; let size = 0; request.on("data", (chunk: Buffer) => { size += chunk.length; if (size > limit) { reject(new Error("Upload is too large.")); request.destroy(); } else chunks.push(chunk); }); request.on("end", () => resolveBuffer(Buffer.concat(chunks))); request.on("error", reject); }); }
function readJson(request: any, limit: number): Promise<Record<string, unknown>> { return new Promise((resolveJson, reject) => { let body = ""; request.setEncoding("utf8"); request.on("data", (chunk: string) => { body += chunk; if (body.length > limit) { reject(new Error("Request is too large.")); request.destroy(); } }); request.on("end", () => { try { resolveJson(JSON.parse(body || "{}")); } catch { reject(new Error("Invalid JSON request.")); } }); request.on("error", reject); }); }
function sendJson(response: any, status: number, value: unknown) { response.statusCode = status; response.setHeader("content-type", "application/json; charset=utf-8"); response.end(JSON.stringify(value)); }
