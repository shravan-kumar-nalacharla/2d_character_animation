import { renderFrames, renderMedia, selectComposition, makeCancelSignal } from "@remotion/renderer";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { availableParallelism } from "node:os";

const config = JSON.parse(await readFile(process.argv[2], "utf8"));
const { project, settings, audioUrl, serveUrl, directory } = config;
const inputProps = { project, settings, audioUrl };
const { cancelSignal, cancel } = makeCancelSignal();
process.on("message", (message) => { if (message?.type === "cancel") cancel(); });
const started = Date.now();
const totalFrames = Math.max(1, Math.ceil(project.stage.duration * settings.fps));
const concurrency = resolveConcurrency(settings.concurrency);
const send = (value) => process.send?.(value);
const report = (renderedFrames, encodedFrames = 0, stitchStage = "encoding") => {
  const elapsed = Math.max(.001, (Date.now() - started) / 1000), speed = renderedFrames / elapsed;
  send({ type: "progress", value: { status: stitchStage === "muxing" || renderedFrames >= totalFrames ? "encoding" : "rendering", progress: Math.min(.995, Math.max(renderedFrames / totalFrames * .94, encodedFrames / totalFrames * .98)), renderedFrames, encodedFrames, totalFrames, speed, etaSeconds: speed ? Math.max(0, (totalFrames - renderedFrames) / speed) : null, message: stitchStage === "muxing" ? "Muxing original audio…" : renderedFrames >= totalFrames ? "Encoding video…" : `Rendering with ${concurrency ?? "auto"} workers…` } });
};

try {
  const composition = await selectComposition({ serveUrl, id: "AlgowzxdCharacter", inputProps });
  const baseName = `algowzxd-${settings.width}x${settings.height}-${settings.fps}fps`;
  if (settings.format === "png") {
    const frames = join(directory, "frames"); await mkdir(frames, { recursive: true });
    await renderFrames({ composition, serveUrl, inputProps, outputDir: frames, imageFormat: "png", concurrency, cancelSignal, onStart: () => report(0), onFrameUpdate: (count) => report(count) });
    const output = join(directory, `${baseName}-png.zip`);
    const zipped = spawnSync("powershell.exe", ["-NoProfile", "-Command", "Compress-Archive -Path $args[0] -DestinationPath $args[1] -Force", join(frames, "*.png"), output], { windowsHide: true, encoding: "utf8" });
    if (zipped.status !== 0) throw new Error(zipped.stderr || "Could not package PNG sequence.");
    send({ type: "complete", output, fileName: `${baseName}-png.zip` });
  } else {
    const extension = settings.format === "webm" ? "webm" : "mp4", output = join(directory, `${baseName}.${extension}`);
    const crf = { Draft: 28, Standard: 23, High: 18, Maximum: 15 }[settings.quality] ?? 18;
    await renderMedia({ composition, serveUrl, inputProps, outputLocation: output, codec: settings.format === "webm" ? "vp9" : "h264", imageFormat: settings.background === "transparent" ? "png" : "jpeg", pixelFormat: settings.background === "transparent" ? "yuva420p" : "yuv420p", crf, concurrency, cancelSignal, logLevel: "warn", timeoutInMilliseconds: 120000, hardwareAcceleration: "if-possible", onStart: () => report(0), onProgress: ({ renderedFrames, encodedFrames, stitchStage }) => report(renderedFrames, encodedFrames, stitchStage) });
    send({ type: "complete", output, fileName: `${baseName}.${extension}` });
  }
  process.disconnect?.();
} catch (error) {
  const cancelled = /cancel/i.test(error instanceof Error ? error.message : String(error));
  if (!cancelled) send({ type: "failed", error: error instanceof Error ? error.stack || error.message : String(error) });
  process.exitCode = cancelled ? 0 : 1;
  process.disconnect?.();
}

function resolveConcurrency(value) {
  if (typeof value === "number") return Math.max(1, Math.min(availableParallelism(), Math.round(value)));
  if (value === "low") return "25%";
  if (value === "medium") return "50%";
  if (value === "high") return "75%";
  return null;
}
