import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { spawn, spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { remotionRenderPlugin } from "./server/remotionRenderPlugin";
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, ".", "");
    const apiKey = env.GEMINI_API_KEY ?? "";
    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    const transcriptionModel = env.GEMINI_TRANSCRIPTION_MODEL || "gemini-3.5-transcribe";
    return { plugins: [react(), geminiBridge(apiKey, model, transcriptionModel), remotionRenderPlugin(), exportBridge()], publicDir: "assets", server: { port: 4173 } };
});
function exportBridge() {
    const jobs = new Map(), tempRoot = resolve(".temp");
    return { name: "algowzxd-export-bridge", configureServer(server) {
            server.middlewares.use(async (request, response, next) => {
                const parsed = new URL(request.url ?? "/", "http://local"), url = parsed.pathname;
                if (!url.startsWith("/api/export/"))
                    return next();
                try {
                    if (url === "/api/export/status") {
                        const path = parsed.searchParams.get("path") || "ffmpeg";
                        const probe = spawnSync(path, ["-version"], { windowsHide: true });
                        return json(response, 200, { ready: probe.status === 0, path: probe.status === 0 ? path : "" });
                    }
                    if (url === "/api/export/start") {
                        const input = await readJson(request, 1000000), id = randomUUID(), directory = join(tempRoot, `render-${id}`), frames = join(directory, "frames");
                        await mkdir(frames, { recursive: true });
                        jobs.set(id, { id, directory, frames, settings: input.settings, total: Number(input.total) || 0 });
                        return json(response, 200, { id });
                    }
                    const id = parsed.searchParams.get("id") || String((request.method === "POST" && request.headers["content-type"]?.includes("json") ? (await readJson(request, 100000)).id : "") || ""), job = jobs.get(id);
                    if (!job)
                        return json(response, 404, { error: "Export job was not found." });
                    if (url === "/api/export/frame") {
                        const index = Number(parsed.searchParams.get("index"));
                        if (!Number.isInteger(index) || index < 0 || index >= job.total)
                            return json(response, 400, { error: "Invalid frame index." });
                        await writeFile(join(job.frames, `frame_${String(index).padStart(6, "0")}.png`), await readBuffer(request, 50000000));
                        return json(response, 200, { ok: true });
                    }
                    if (url === "/api/export/audio") {
                        const extension = extname(parsed.searchParams.get("name") || "") || ".audio";
                        job.audio = join(job.directory, `audio${extension}`);
                        await writeFile(job.audio, await readBuffer(request, 200000000));
                        return json(response, 200, { ok: true });
                    }
                    if (url === "/api/export/cancel") {
                        job.process?.kill();
                        await rm(job.directory, { recursive: true, force: true });
                        jobs.delete(id);
                        return json(response, 200, { canceled: true });
                    }
                    if (url === "/api/export/finish") {
                        try {
                            await finishRender(job);
                        }
                        catch (error) {
                            await rm(job.directory, { recursive: true, force: true });
                            jobs.delete(id);
                            throw error;
                        }
                        return json(response, 200, { fileName: outputName(job), downloadUrl: `/api/export/file?id=${encodeURIComponent(id)}` });
                    }
                    if (url === "/api/export/file") {
                        if (!job.output)
                            return json(response, 409, { error: "Export is not ready." });
                        response.statusCode = 200;
                        response.setHeader("content-disposition", `attachment; filename="${outputName(job)}"`);
                        response.setHeader("content-type", job.settings.format === "mp4" ? "video/mp4" : job.settings.format === "webm" ? "video/webm" : "application/zip");
                        createReadStream(job.output).pipe(response).on("finish", () => { if (!job.settings.keepFrames)
                            setTimeout(() => { void rm(job.directory, { recursive: true, force: true }); jobs.delete(id); }, 30000); });
                        return;
                    }
                    return json(response, 404, { error: "Unknown export operation." });
                }
                catch (reason) {
                    return json(response, 500, { error: reason instanceof Error ? reason.message : "Export failed." });
                }
            });
        } };
}
async function finishRender(job) {
    if (job.settings.format === "png") {
        job.output = join(job.directory, "algowzxd-png-sequence.zip");
        await run(job, "powershell.exe", ["-NoProfile", "-Command", "Compress-Archive -Path $args[0] -DestinationPath $args[1] -Force", join(job.frames, "*.png"), job.output]);
        return;
    }
    const extension = job.settings.format === "webm" ? ".webm" : ".mp4";
    job.output = join(job.directory, `algowzxd-export${extension}`);
    const fps = String(job.settings.fps || 60), crf = String({ Draft: 28, Standard: 23, High: 18, Maximum: 15 }[job.settings.quality] ?? 18), ffmpeg = job.settings.ffmpegPath || "ffmpeg";
    const args = ["-y", "-framerate", fps, "-i", join(job.frames, "frame_%06d.png")];
    if (job.audio)
        args.push("-i", job.audio);
    if (job.settings.format === "webm")
        args.push("-c:v", "libvpx-vp9", "-b:v", "0", "-crf", crf, "-pix_fmt", job.settings.background === "transparent" ? "yuva420p" : "yuv420p", ...(job.audio ? ["-c:a", "libopus"] : []));
    else
        args.push("-c:v", "libx264", "-preset", "medium", "-crf", crf, "-pix_fmt", "yuv420p", ...(job.audio ? ["-c:a", "aac", "-ar", "48000"] : []));
    args.push("-r", fps, ...(job.audio ? ["-shortest"] : []), job.output);
    await run(job, ffmpeg, args);
    if (!job.settings.keepFrames)
        await rm(job.frames, { recursive: true, force: true });
}
function run(job, command, args) { return new Promise((resolveRun, reject) => { const child = spawn(command, args, { windowsHide: true }); job.process = child; let error = ""; child.stderr?.on("data", (chunk) => { error = (error + chunk).slice(-8000); }); child.on("error", reject); child.on("exit", (code) => code === 0 ? resolveRun() : reject(new Error(error || `${command} exited with code ${code}.`))); }); }
function outputName(job) { return job.settings.format === "png" ? "algowzxd-png-sequence.zip" : `algowzxd-${job.settings.width}x${job.settings.height}-${job.settings.fps}fps.${job.settings.format}`; }
function readBuffer(request, limit) { return new Promise((resolveBuffer, reject) => { const chunks = []; let size = 0; request.on("data", (chunk) => { size += chunk.length; if (size > limit) {
    reject(new Error("Upload is too large."));
    request.destroy();
}
else
    chunks.push(chunk); }); request.on("end", () => resolveBuffer(Buffer.concat(chunks))); request.on("error", reject); }); }
function geminiBridge(apiKey, model, transcriptionModel) {
    let sessionKey = apiKey;
    let sessionModel = model;
    let sessionTranscriptionModel = transcriptionModel;
    return { name: "algowzxd-gemini-bridge", configureServer(server) {
            server.middlewares.use(async (request, response, next) => {
                const incoming = request;
                const url = incoming.url?.split("?")[0];
                if (url === "/api/ai/status")
                    return json(response, 200, { configured: Boolean(sessionKey), model: sessionKey ? sessionModel : "local rules", performanceModel: sessionModel, transcriptionModel: sessionTranscriptionModel });
                if (url === "/api/ai/configure") {
                    if (incoming.method !== "POST")
                        return json(response, 405, { error: "POST required." });
                    try {
                        const input = await readJson(request, 4096);
                        if (typeof input.apiKey !== "string" || input.apiKey.trim().length < 20)
                            return json(response, 400, { error: "Enter a valid Gemini API key." });
                        sessionKey = input.apiKey.trim();
                        if (typeof input.model === "string" && input.model.trim())
                            sessionModel = input.model.trim();
                        return json(response, 200, { configured: true, model: sessionModel, performanceModel: sessionModel, transcriptionModel: sessionTranscriptionModel });
                    }
                    catch (reason) {
                        return json(response, 400, { error: reason instanceof Error ? reason.message : "Could not configure Gemini." });
                    }
                }
                if (url !== "/api/ai/transcribe" && url !== "/api/ai/analyze-performance")
                    return next();
                if (incoming.method !== "POST")
                    return json(response, 405, { error: "POST required." });
                if (!sessionKey)
                    return json(response, 503, { error: "Gemini is not configured. Enter a key in AI Performance settings." });
                try {
                    const input = await readJson(request, 32 * 1024 * 1024);
                    const output = url.endsWith("transcribe") ? await transcribe(sessionKey, sessionTranscriptionModel, sessionModel, input) : await analyze(sessionKey, sessionModel, input);
                    return json(response, 200, output);
                }
                catch (reason) {
                    return json(response, 502, { error: reason instanceof Error ? reason.message : "Gemini request failed." });
                }
            });
        } };
}
async function transcribe(apiKey, transcriptionModel, fallbackModel, input) {
    if (typeof input.data !== "string" || input.data.length > 30000000)
        throw new Error("Audio payload is missing or too large for direct transcription.");
    try {
        return await nativeTranscription(apiKey, transcriptionModel, input);
    }
    catch (reason) {
        console.warn("Native Gemini transcription failed; using generateContent fallback.", reason instanceof Error ? reason.message : reason);
    }
    const prompt = `Transcribe this dialogue with precise word timestamps. Detect English, Hindi, Telugu, romanized Hindi/Telugu, and code-switching. Preserve the spoken script when possible. Duration is ${Number(input.duration) || 0} seconds. Return JSON only: {"language":"...","segments":[{"id":"sentence-1","text":"...","start":0,"end":1,"words":[{"text":"...","start":0,"end":0.2,"confidence":0.9}]}]}. Timings must be monotonic and remain within the duration.`;
    return gemini(apiKey, fallbackModel, [{ text: prompt }, { inlineData: { mimeType: String(input.mimeType || "audio/mpeg"), data: input.data } }]);
}
async function nativeTranscription(apiKey, model, input) {
    const mimeType = String(input.mimeType || "audio/mpeg");
    const bytes = Uint8Array.from(atob(String(input.data)), (character) => character.charCodeAt(0));
    const start = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", { method: "POST", headers: { "x-goog-api-key": apiKey, "content-type": "application/json", "x-goog-upload-protocol": "resumable", "x-goog-upload-command": "start", "x-goog-upload-header-content-length": String(bytes.byteLength), "x-goog-upload-header-content-type": mimeType }, body: JSON.stringify({ file: { display_name: String(input.name || "dialogue") } }) });
    if (!start.ok)
        throw new Error(await googleError(start, "Could not start audio upload."));
    const uploadUrl = start.headers.get("x-goog-upload-url");
    if (!uploadUrl)
        throw new Error("Gemini did not return an audio upload URL.");
    const uploaded = await fetch(uploadUrl, { method: "POST", headers: { "content-length": String(bytes.byteLength), "x-goog-upload-offset": "0", "x-goog-upload-command": "upload, finalize" }, body: bytes });
    if (!uploaded.ok)
        throw new Error(await googleError(uploaded, "Could not upload audio."));
    const file = (await uploaded.json()).file;
    if (!file?.uri)
        throw new Error("Gemini audio upload returned no file URI.");
    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "x-goog-api-key": apiKey, "content-type": "application/json" }, body: JSON.stringify({ model, input: [{ type: "audio", uri: file.uri, mime_type: mimeType }], generation_config: { transcription_config: { language_codes: [], mode: { type: "verbatim", timestamp_granularities: ["word"] } } } }) });
        if (!response.ok)
            throw new Error(await googleError(response, `${model} transcription failed.`));
        return transcriptInputFromInteraction(await response.json(), Number(input.duration) || 0);
    }
    finally {
        if (file.name)
            void fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}`, { method: "DELETE", headers: { "x-goog-api-key": apiKey } });
    }
}
async function googleError(response, fallback) { try {
    return (await response.json()).error?.message ?? fallback;
}
catch {
    return fallback;
} }
function transcriptInputFromInteraction(raw, duration) {
    const interaction = raw;
    const annotations = (interaction.steps ?? []).flatMap((step) => (step.content ?? []).flatMap((content) => content.annotations ?? [])).filter((item) => item.type === "word_info");
    if (!annotations.length)
        throw new Error("Native transcription returned no word timestamps.");
    const words = annotations.map((word) => ({ text: word.text, start_offset: word.start_offset, end_offset: word.end_offset, confidence: word.confidence }));
    return { language: "auto", provider: "gemini-3.5-transcribe", segments: [{ id: "sentence-1", text: interaction.output_text ?? words.map((word) => word.text).join(" "), start: 0, end: duration, words }] };
}
async function analyze(apiKey, model, input) {
    const allowed = "emotions neutral,happy,amused,excited,sad,angry,frustrated,surprised,shocked,worried,confused,thinking,suspicious,embarrassed,proud,disgusted,tired; intents statement,question,explanation,agreement,disagreement,reaction,joke,sarcasm,disbelief,warning,complaint,storytelling,instruction,thinking,realization,greeting,conclusion; expressions neutral,friendly,soft,happy,happyClosed,laughClosed,sad,verySad,teary,crying,sobCrying,concerned,worried,fear,panic,shock,shocked,extremeShock,curious,confused,thinking,suspicious,cunning,unimpressed,bored,tired,sleepy,serious,focused,determined,coldGlare,angry,angrySqueezed,veryAngry,rage,shadowRage,disgusted,annoyed,embarrassed,awkward,nervous,excited,veryExcited,sparkleExcited,sparkleCute,pleading,proud,smug,deadpan,animeDetermined,animeShock,animeCute,winkLeft,winkRight; distinguish anger deliberately: angry for ordinary anger, angrySqueezed for eyes squeezed shut during a sharp outburst, veryAngry for strong sustained anger, rage for visible extreme anger, shadowRage only for an exceptional furious/comedic beat where eyes disappear under a dark upper-face shadow; use crying for visible tears and sobCrying only for heavy sobbing with waterfall tears; reserve tier-3 expressions (panic,extremeShock,rage,shadowRage,sobCrying,sparkleExcited,sparkleCute,animeDetermined,animeShock,animeCute) for genuinely strong moments and prefer tier-0/1 for ordinary speech; gaze camera,return-camera,thinking-away,thinking-left,thinking-right,reaction-left,reaction-right,slightly-left,slightly-right,up-left,up-right,down-left,down-right,left,right,up,down; head hold,tiny_nod,micro_nod,normal_nod,strong_nod,question_tilt,question_tilt_left,question_tilt_right,confused_tilt,small_turn_left,small_turn_right,thinking_turn,small_shake,disagreement_shake,disbelief_shake,reaction_back,surprise_recoil,reaction_forward,thinking_tilt,emphasis_forward,emphasis_down,settle,settle_to_neutral.";
    const shape = `{overall:{language,mood,energy,speakingStyle},segments:[{id,start,end,text,emotion:{primary,secondary?,intensity},intent,expression:{preset,intensity,transitionIn,transitionOut},gaze:{target,intensity},eyebrowEvents:[{type,time,duration,strength}],headEvents:[{type,time,duration,strength}],bodyEvents:[{type,time,duration,strength}],accents:[{text,importance,type}]}]}`;
    const prompt = `You are the performance director for a professional layered 2D character. Understand English, Hindi, Telugu, romanized speech, code-switching, and neighboring sentence context. Plan sparse, readable poses: fewer but stronger head decisions with 0.6–1.2 second duration and clear holds; never add a head event merely because speech is fast. Let eyes lead the head by about 0.1–0.25 seconds. Use gaze as meaningful acting, favor larger readable side glances with 0.5–1.5 second holds, and return smoothly to camera. Keep 55–70% neutral/base. Blinks do not count as expression variation. Use side glances for thought, suspicion, confusion and disbelief; direct camera gaze for strong statements and punchlines; shocked openness for genuine surprise; soft/lowered eyes for sad or calm speech; angry/serious eyes for frustration. Return naturally toward neutral, avoid repeating the same expression, and never change expressions randomly per word. Create intentional decisions, not continuous random motion. Stillness is valid. Lip sync is generated separately, so do not create mouth or head events for individual syllables. Do not output transforms, pixels, or keyframes. Use only: ${allowed} Return JSON only shaped ${shape}. Use sparse accents and natural transitions. Input: ${JSON.stringify({ transcript: input.transcript, acousticAnalysis: input.acousticAnalysis, profile: input.profile, promptVersion: input.promptVersion })}`;
    return gemini(apiKey, model, [{ text: prompt }], performanceResponseSchema);
}
async function gemini(apiKey, model, parts, responseJsonSchema) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", responseJsonSchema, temperature: 0.2 } }) });
    const result = await response.json();
    if (!response.ok)
        throw new Error(result.error?.message || `Gemini returned ${response.status}.`);
    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!text)
        throw new Error("Gemini returned no structured result.");
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error("Gemini returned invalid JSON.");
    }
}
const scalar = { type: "number", minimum: 0, maximum: 1 };
const timedEvent = (types) => ({ type: "array", items: { type: "object", properties: { type: { type: "string", enum: types }, time: { type: "number" }, duration: { type: "number" }, strength: scalar }, required: ["type", "time", "duration", "strength"] } });
const objectSchema = (properties, required = Object.keys(properties)) => ({ type: "object", properties, required });
const performanceResponseSchema = objectSchema({
    overall: objectSchema({ language: { type: "string" }, mood: { type: "string" }, energy: scalar, speakingStyle: { type: "string" } }),
    segments: { type: "array", items: objectSchema({
            id: { type: "string" }, start: { type: "number" }, end: { type: "number" }, text: { type: "string" },
            emotion: objectSchema({ primary: { type: "string" }, secondary: { type: "string" }, intensity: scalar }, ["primary", "intensity"]),
            intent: { type: "string" },
            expression: objectSchema({ preset: { type: "string" }, intensity: scalar, transitionIn: { type: "number" }, transitionOut: { type: "number" } }),
            gaze: objectSchema({ target: { type: "string" }, intensity: scalar }),
            eyebrowEvents: timedEvent(["raise", "lower", "one-brow", "concern", "surprise", "angry"]),
            headEvents: timedEvent(["hold", "tiny_nod", "micro_nod", "normal_nod", "strong_nod", "question_tilt", "question_tilt_left", "question_tilt_right", "confused_tilt", "small_turn_left", "small_turn_right", "thinking_turn", "small_shake", "disagreement_shake", "disbelief_shake", "reaction_back", "surprise_recoil", "reaction_forward", "thinking_tilt", "emphasis_forward", "emphasis_down", "settle", "settle_to_neutral"]),
            bodyEvents: timedEvent(["hold", "lean-forward", "lean-back", "speech-accent"]),
            accents: { type: "array", items: objectSchema({ text: { type: "string" }, importance: scalar, type: { type: "string" } }) },
        }) },
});
function readJson(request, limit) {
    return new Promise((resolve, reject) => { let body = ""; request.setEncoding("utf8"); request.on("data", (chunk) => { body += chunk; if (body.length > limit) {
        reject(new Error("Request is too large."));
        request.destroy();
    } }); request.on("end", () => { try {
        resolve(JSON.parse(body || "{}"));
    }
    catch {
        reject(new Error("Invalid JSON request."));
    } }); request.on("error", reject); });
}
function json(response, status, value) { response.statusCode = status; response.setHeader("content-type", "application/json; charset=utf-8"); response.end(JSON.stringify(value)); }
