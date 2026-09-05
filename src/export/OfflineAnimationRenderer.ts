export interface ExportSettings { renderer: "remotion" | "legacy"; concurrency: "auto" | "low" | "medium" | "high" | number; format: "mp4" | "webm" | "png"; width: number; height: number; fps: 24 | 30 | 60; quality: "Draft" | "Standard" | "High" | "Maximum"; background: "project" | "transparent" | "solid"; color: string; fit: "Fit" | "Fill" | "Stretch"; includeAudio: boolean; keepFrames: boolean; ffmpegPath?: string }

interface Options { settings: ExportSettings; duration: number; projectBackground: string; audioFile: File | null; setTime(time: number): void; onProgress(message: string, current: number, total: number): void; signal: AbortSignal }

const dataUrls = new Map<string, string>();

export async function exportOffline(options: Options) {
  const { settings, signal } = options, total = Math.ceil(options.duration * settings.fps);
  const start = await postJson("/api/export/start", { settings, total }, signal) as { id: string };
  try {
    if (settings.includeAudio && options.audioFile) await fetch(`/api/export/audio?id=${encodeURIComponent(start.id)}&name=${encodeURIComponent(options.audioFile.name)}`, { method: "POST", body: options.audioFile, signal }).then(assertOk);
    for (let frame = 0; frame < total; frame++) {
      if (signal.aborted) throw new DOMException("Export canceled", "AbortError");
      options.setTime(frame / settings.fps);
      await nextPaint();
      const png = await renderFrame(settings, options.projectBackground);
      await fetch(`/api/export/frame?id=${encodeURIComponent(start.id)}&index=${frame}`, { method: "POST", body: png, signal }).then(assertOk);
      options.onProgress("Rendering frames…", frame + 1, total);
    }
    options.onProgress(settings.format === "png" ? "Packaging PNG sequence…" : "Encoding video and muxing audio…", total, total);
    const finished = await postJson("/api/export/finish", { id: start.id }, signal) as { downloadUrl: string; fileName: string };
    const link = document.createElement("a"); link.href = finished.downloadUrl; link.download = finished.fileName; link.click();
    return finished.fileName;
  } catch (error) {
    await fetch(`/api/export/cancel?id=${encodeURIComponent(start.id)}`, { method: "POST" }).catch(() => undefined);
    throw error;
  }
}

async function renderFrame(settings: ExportSettings, projectBackground: string) {
  const source = document.querySelector<SVGSVGElement>(".character-stage");
  if (!source) throw new Error("Character viewport is not available.");
  const svg = source.cloneNode(true) as SVGSVGElement;
  svg.setAttribute("viewBox", "0 0 1920 1080"); svg.setAttribute("width", "1920"); svg.setAttribute("height", "1080");
  svg.querySelectorAll(".bone-overlay,.control-overlay,.face-debug,.anchor-debug").forEach((node) => node.remove());
  const background = svg.querySelector<SVGRectElement>(".stage-background"); if (background) background.setAttribute("fill", "none");
  await inlineImages(svg);
  const markup = new XMLSerializer().serializeToString(svg), image = new Image();
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  try { await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not rasterize the SVG frame.")); image.src = url; }); }
  finally { URL.revokeObjectURL(url); }
  const canvas = document.createElement("canvas"); canvas.width = settings.width; canvas.height = settings.height;
  const context = canvas.getContext("2d", { alpha: true }); if (!context) throw new Error("Canvas rendering is unavailable.");
  const color = settings.background === "transparent" ? null : settings.background === "project" ? projectBackground : settings.color;
  if (color) { context.fillStyle = color; context.fillRect(0, 0, canvas.width, canvas.height); }
  const sourceRatio = 1920 / 1080, outputRatio = settings.width / settings.height;
  if (settings.fit === "Stretch") context.drawImage(image, 0, 0, settings.width, settings.height);
  else if (settings.fit === "Fit") { const width = outputRatio > sourceRatio ? settings.height * sourceRatio : settings.width, height = outputRatio > sourceRatio ? settings.height : settings.width / sourceRatio; context.drawImage(image, (settings.width - width) / 2, (settings.height - height) / 2, width, height); }
  else { const width = outputRatio > sourceRatio ? settings.width : settings.height * sourceRatio, height = outputRatio > sourceRatio ? settings.width / sourceRatio : settings.height; context.drawImage(image, (settings.width - width) / 2, (settings.height - height) / 2, width, height); }
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not encode PNG frame.")), "image/png"));
}

async function inlineImages(svg: SVGSVGElement) {
  await Promise.all(Array.from(svg.querySelectorAll<SVGImageElement>("image")).map(async (image) => {
    const href = image.getAttribute("href") || image.getAttribute("xlink:href"); if (!href || href.startsWith("data:")) return;
    const absolute = new URL(href, location.href).href; let data = dataUrls.get(absolute);
    if (!data) { const blob = await fetch(absolute).then(assertOk).then((response) => response.blob()); data = await blobToDataUrl(blob); dataUrls.set(absolute, data); }
    image.setAttribute("href", data);
  }));
}

const nextPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
async function postJson(url: string, value: unknown, signal: AbortSignal) { const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(value), signal }); await assertOk(response); return response.json(); }
async function assertOk(response: Response) { if (!response.ok) { const value = await response.json().catch(() => ({})) as { error?: string }; throw new Error(value.error ?? `Export request failed (${response.status}).`); } return response; }
