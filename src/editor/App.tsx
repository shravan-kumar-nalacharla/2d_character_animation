import { useCallback, useEffect, useRef, useState } from "react";
import { allPlannerOptions, planAnimation, type PlannerOptions } from "../animation/PerformancePlanner";
import { analyzeAudioBuffer, hashAudio } from "../audio/AudioAnalysisEngine";
import { TranscriptNormalizationError } from "../audio/TranscriptNormalizer";
import { CommandHistory } from "../core/commands/CommandHistory";
import { GeminiPerformanceProvider, GeminiTranscriptionProvider, RuleBasedPerformanceProvider, transcriptFromText } from "../director/PerformanceProviders";
import { changeBoneCommand } from "../project/commands";
import { createDefaultProject, defaultFace, defaultFaceCalibration, defaultPerformanceProfile, replaceBone } from "../project/project";
import { assertProject, type AnimationTrack, type Bone, type FaceState, type ProjectDocument, type TimedTranscript } from "../project/schema";
import { AIPerformancePanel } from "./AIPerformancePanel";
import { HierarchyPanel } from "./HierarchyPanel";
import { InspectorPanel } from "./InspectorPanel";
import { Timeline } from "./Timeline";
import { PlaybackViewport } from "./PlaybackViewport";
import type { PlaybackMetrics } from "../animation/MasterPlaybackClock";
import { ExportPanel } from "./ExportPanel";
import { EyeDesignLab } from "./EyeDesignLab";
import { exportOffline, type ExportSettings } from "../export/OfflineAnimationRenderer";
import { startRemotionExport, storedRenderId, watchRemotionExport, type RenderJobProgress } from "../export/RemotionExportClient";

type Provider = "gemini" | "rule-based";

export function App() {
  const [project, setProject] = useState<ProjectDocument>(() => loadAutosave() ?? createDefaultProject());
  const [selectedId, setSelectedId] = useState("torso");
  const [mode, setMode] = useState<"rig" | "animate">("rig");
  const [showBones, setShowBones] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [editPivots, setEditPivots] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewQuality, setPreviewQuality] = useState<"Auto" | "Full" | "Performance">("Auto");
  const [showPerformance, setShowPerformance] = useState(false);
  const [playbackMetrics, setPlaybackMetrics] = useState<PlaybackMetrics>({ previewFps: 60, frameMs: 16.67, worstFrameMs: 0, droppedFrames: 0, audioDriftMs: 0 });
  const [exportOpen, setExportOpen] = useState(false), [exporting, setExporting] = useState(false), [exportProgress, setExportProgress] = useState(""), [exportCurrent, setExportCurrent] = useState(0), [exportTotal, setExportTotal] = useState(0), [ffmpegReady, setFfmpegReady] = useState(false);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(() => { try { return { ...defaultExportSettings, ...JSON.parse(localStorage.getItem("algowzxd.export-settings") ?? "null") }; } catch { return defaultExportSettings; } });
  const exportAbort = useRef<AbortController | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [status, setStatus] = useState("Project ready");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [eyeLabOpen, setEyeLabOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("rule-based");
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string; performanceModel?: string; transcriptionModel?: string } | null>(null);
  const [transcriptText, setTranscriptText] = useState(() => transcriptTextOf(project.transcript));
  const [plannerOptions, setPlannerOptions] = useState<PlannerOptions>(allPlannerOptions);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [aiError, setAiError] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const history = useRef(new CommandHistory<ProjectDocument>());
  const loadInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const selectedBone = project.rig.bones.find((bone) => bone.id === selectedId) ?? project.rig.bones[0];
  const faceAssets = project.character.faceAssets ?? { activeMouthPack: "v3", activeEyePack: "raster-v1", mouthOverrides: {}, eyeOverrides: {}, browOverrides: {} };
  const viewportProject = exportOpen && exportSettings.renderer === "legacy" && exportSettings.background !== "project" ? { ...project, stage: { ...project.stage, background: exportSettings.color, backgroundMode: exportSettings.background === "transparent" ? "transparent" as const : "solid" as const } } : project;

  useEffect(() => {
    fetch("/api/ai/status").then((response) => response.ok ? response.json() : null).then((value) => {
      if (value) { setAiStatus(value); if (value.configured) setProvider("gemini"); }
    }).catch(() => setAiStatus({ configured: false, model: "local rules" }));
  }, []);
  useEffect(() => { fetch("/api/render/status").then((response) => response.json()).then((value: { ready?: boolean }) => setFfmpegReady(Boolean(value.ready))).catch(() => setFfmpegReady(false)); }, []);
  useEffect(() => {
    const id = storedRenderId(); if (!id) return;
    const abort = new AbortController(); exportAbort.current = abort; setExporting(true); setExportProgress("Reconnecting to background render…");
    watchRemotionExport(id, abort.signal, updateRenderProgress).then((file) => { setStatus(`Export ready · ${file}`); setExportProgress("Done."); }).catch((reason) => { if ((reason as Error).name !== "AbortError") setExportProgress(reason instanceof Error ? reason.message : "Export failed"); }).finally(() => { setExporting(false); exportAbort.current = null; });
  }, []);
  useEffect(() => { localStorage.setItem("algowzxd.export-settings", JSON.stringify(exportSettings)); }, [exportSettings]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const commitBone = useCallback((id: string, patch: Partial<Bone>, label?: string) => {
    setProject((current) => {
      const before = current.rig.bones.find((bone) => bone.id === id);
      return before ? history.current.execute(changeBoneCommand(id, before, { ...before, ...patch }, label), current) : current;
    });
    setHistoryRevision((value) => value + 1);
  }, []);
  const previewBone = useCallback((id: string, bone: Bone) => setProject((current) => replaceBone(current, id, bone)), []);
  const commitDrag = useCallback((before: Bone, after: Bone) => {
    if (before.x === after.x && before.y === after.y && before.pivotX === after.pivotX && before.pivotY === after.pivotY && before.rotation === after.rotation) return;
    history.current.recordApplied(changeBoneCommand(before.id, before, after, `Move ${before.name}`)); setHistoryRevision((value) => value + 1);
  }, []);
  const undo = useCallback(() => { setProject((current) => history.current.undo(current)); setHistoryRevision((value) => value + 1); setStatus("Undo"); }, []);
  const redo = useCallback(() => { setProject((current) => history.current.redo(current)); setHistoryRevision((value) => value + 1); setStatus("Redo"); }, []);

  useEffect(() => { const timer = window.setTimeout(() => localStorage.setItem("algowzxd.autosave", JSON.stringify(project)), 300); return () => clearTimeout(timer); }, [project]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      else if (event.code === "Space" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) { event.preventDefault(); setPlaying((value) => !value); }
    };
    addEventListener("keydown", onKey); return () => removeEventListener("keydown", onKey);
  }, [redo, undo]);
  const seek = (time: number) => setCurrentTime(Math.max(0, Math.min(project.stage.duration, time)));
  const importAudio = async (file: File) => {
    setPlaying(false); setStatus("Analyzing audio…"); setAiError("");
    try {
      const data = await file.arrayBuffer(); const context = new AudioContext(); const decoded = await context.decodeAudioData(data.slice(0)); const analysis = analyzeAudioBuffer(decoded); await context.close();
      const audio = { name: file.name, mimeType: file.type || "audio/mpeg", size: file.size, duration: decoded.duration, hash: await hashAudio(data) };
      setAudioFile(file); setAudioUrl(URL.createObjectURL(file));
      setProject((current) => ({ ...current, audio, audioAnalysis: analysis, transcript: null, performance: null, stage: { ...current.stage, duration: Math.max(0.1, decoded.duration) }, animation: { tracks: current.animation.tracks.filter((track) => !track.generated) } }));
      setTranscriptText(""); setCurrentTime(0); setStatus(`Audio ready · ${decoded.duration.toFixed(2)}s`); setAiOpen(true);
    } catch (reason) { setStatus(reason instanceof Error ? reason.message : "Could not decode audio"); }
  };

  const generate = async (forcedProvider?: Provider, only?: keyof PlannerOptions) => {
    if (!project.audio || !project.audioAnalysis) { setAiError("Import an audio file first."); setAiOpen(true); return; }
    const selectedProvider = forcedProvider ?? provider; setGenerating(true); setAiError(""); setErrorDetails(""); setProgress("Preparing timed transcript…");
    try {
      let transcript: TimedTranscript;
      if (transcriptText.trim()) transcript = transcriptFromText(transcriptText, project.audio.duration);
      else if (project.transcript) transcript = project.transcript;
      else if (selectedProvider === "gemini" && audioFile) transcript = await new GeminiTranscriptionProvider().transcribe(audioFile, project.audio.duration);
      else throw new Error(audioFile ? "Enter a transcript for local analysis, or configure Gemini transcription." : "Relink the audio file or paste a transcript.");
      if (transcript.diagnostics?.length) setProgress("Some transcript timing data needed correction. Animation can continue.");
      if (plannerOptions.lipSync && !only) {
        const lipOnly = await planAnimation(project.audio, transcript, project.audioAnalysis, emptyPerformance(transcript, selectedProvider), project.performanceProfile, project.seed, { ...disabledOptions(), lipSync: true });
        setProject((current) => ({ ...current, transcript, animation: { tracks: mergeGeneratedTracks(current.animation.tracks, lipOnly, "lipSync") } }));
      }
      setProgress(selectedProvider === "gemini" ? "Understanding dialogue with Gemini…" : "Understanding dialogue with local rules…");
      const cacheKey = performanceCacheKey(project.audio.hash, selectedProvider, transcript, project.performanceProfile);
      const cached = only ? project.performance : readPerformanceCache(cacheKey);
      const analyzer = selectedProvider === "gemini" ? new GeminiPerformanceProvider() : new RuleBasedPerformanceProvider();
      const performance = cached?.provider === selectedProvider ? cached : await analyzer.analyzePerformance(project.audio, transcript, project.audioAnalysis, project.performanceProfile);
      if (!cached) localStorage.setItem(cacheKey, JSON.stringify(performance));
      setProgress("Planning expressions, gaze, head motion and lip sync…");
      const options = only ? { ...disabledOptions(), [only]: true } : plannerOptions;
      const generated = await planAnimation(project.audio, transcript, project.audioAnalysis, performance, project.performanceProfile, project.seed, options);
      setProject((current) => ({ ...current, transcript, performance, animation: { tracks: mergeGeneratedTracks(current.animation.tracks, generated, only) } }));
      setTranscriptText(transcriptTextOf(transcript)); setMode("animate"); setProgress("Performance generated · editable keyframes are on the timeline"); setStatus(`Auto animation ready · ${performance.segments.length} segments`);
    } catch (reason) { const message = reason instanceof Error ? reason.message : "Performance generation failed."; setAiError(message); setErrorDetails(reason instanceof TranscriptNormalizationError ? JSON.stringify(reason.diagnostics, null, 2) : reason instanceof Error ? reason.stack ?? reason.message : String(reason)); setProgress(message); setStatus("Auto animation needs attention"); }
    finally { setGenerating(false); }
  };

  const saveProject = () => { const json = JSON.stringify(project, null, 2); localStorage.setItem("algowzxd.autosave", json); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); link.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`; link.click(); URL.revokeObjectURL(link.href); setStatus("Project saved"); };
  const loadProject = async (file: File) => {
    try { const parsed = JSON.parse(await file.text()) as ProjectDocument; assertProject(parsed); const upgraded = upgradeProject(parsed); history.current.clear(); setProject(upgraded); setSelectedId(upgraded.rig.bones[0]?.id ?? "root"); setCurrentTime(0); setPlaying(false); setAudioFile(null); setAudioUrl(""); setTranscriptText(transcriptTextOf(upgraded.transcript)); setHistoryRevision((value) => value + 1); setStatus(upgraded.audio ? `Loaded ${file.name} · relink ${upgraded.audio.name}` : `Loaded ${file.name}`); }
    catch (reason) { setStatus(reason instanceof Error ? reason.message : "Could not load project"); }
  };
  const resetProject = () => { history.current.clear(); setProject(createDefaultProject()); setSelectedId("torso"); setCurrentTime(0); setPlaying(false); setAudioFile(null); setAudioUrl(""); setTranscriptText(""); setHistoryRevision((value) => value + 1); setStatus("Default rig restored"); };
  const updateFace = (patch: Partial<FaceState>) => setProject((current) => ({ ...current, character: { ...current.character, face: { ...current.character.face, ...patch } } }));
  const keyframeGlasses = () => setProject((current) => {
    const target = "face.accessories.sunglasses.visible";
    const existing = current.animation.tracks.find((track) => track.target === target);
    const frameTime = Number(currentTime.toFixed(4));
    const nextKey = { id: crypto.randomUUID(), time: frameTime, value: current.character.face.accessories.sunglasses.visible, interpolation: "hold" as const, source: "manual" as const };
    const nextTrack: AnimationTrack = existing
      ? { ...existing, keyframes: [...existing.keyframes.filter((item) => Math.abs(item.time - frameTime) > .001), nextKey].sort((a, b) => a.time - b.time) }
      : { id: crypto.randomUUID(), name: "Sunglasses · On / Off", layer: "manual", target, valueType: "boolean", muted: false, locked: false, generated: false, keyframes: [nextKey] };
    return { ...current, animation: { tracks: [...current.animation.tracks.filter((track) => track.id !== existing?.id), nextTrack] } };
  });
  const updateCalibration = (patch: Partial<ProjectDocument["character"]["calibration"]>) => setProject((current) => {
    const calibration = { ...current.character.calibration, ...patch };
    return {
      ...current,
      character: { ...current.character, calibration },
      performanceProfile: {
        ...current.performanceProfile,
        head: { ...current.performanceProfile.head, motionStrength: calibration.headRotationStrength, maxNormalRotation: calibration.maxNormalRotation, maxReactionRotation: calibration.maxReactionRotation },
        eyes: { ...current.performanceProfile.eyes, visualScale: calibration.eyeVisualScale },
        mouth: { ...current.performanceProfile.mouth, visualScale: calibration.mouthVisualScale },
      },
    };
  });
  const configureGemini = async (apiKey: string) => {
    const response = await fetch("/api/ai/configure", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey }) });
    const result = await response.json() as { configured?: boolean; model?: string; performanceModel?: string; transcriptionModel?: string; error?: string };
    if (!response.ok || !result.configured) { const message = result.error ?? "Could not configure Gemini."; setAiError(message); throw new Error(message); }
    setAiStatus({ configured: true, model: result.model ?? "gemini", performanceModel: result.performanceModel, transcriptionModel: result.transcriptionModel }); setProvider("gemini"); setAiError(""); setStatus("Gemini connected for this server session");
  };
  const runExport = async () => {
    const returnTime = currentTime;
    if (exportSettings.renderer === "legacy") setPlaying(false);
    setExporting(true); setExportCurrent(0); setExportTotal(Math.ceil(project.stage.duration * exportSettings.fps)); exportAbort.current = new AbortController();
    try { const file = exportSettings.renderer === "remotion"
      ? await startRemotionExport({ project, settings: exportSettings, audioFile, signal: exportAbort.current.signal, onProgress: updateRenderProgress })
      : await exportOffline({ settings: exportSettings, duration: project.stage.duration, projectBackground: project.stage.background, audioFile, setTime: setCurrentTime, signal: exportAbort.current.signal, onProgress: (message, current, total) => { setExportProgress(message); setExportCurrent(current); setExportTotal(total); } });
      setStatus(`Export ready · ${file}`); setExportProgress("Done."); }
    catch (reason) { if ((reason as Error).name !== "AbortError") { setStatus(reason instanceof Error ? reason.message : "Export failed"); setExportProgress(reason instanceof Error ? reason.message : "Export failed"); } }
    finally { if (exportSettings.renderer === "legacy") setCurrentTime(returnTime); setExporting(false); exportAbort.current = null; }
  };

  const updateRenderProgress = useCallback((job: RenderJobProgress) => {
    const eta = job.etaSeconds == null ? "" : ` · ETA ${formatSeconds(job.etaSeconds)}`;
    const speed = job.speed > 0 ? ` · ${job.speed.toFixed(1)} fps` : "";
    setExportProgress(`${job.message}${speed}${eta}`); setExportCurrent(job.renderedFrames); setExportTotal(job.totalFrames);
  }, []);

  return <div className="app-shell" data-history-revision={historyRevision}>
    <header className="topbar"><div className="brand"><span className="brand-mark">A</span><strong>ALGOWZXD</strong><small>ANIMATOR</small></div><div className="mode-switch"><button className={mode === "rig" ? "active" : ""} onClick={() => setMode("rig")}>Rig</button><button className={mode === "animate" ? "active" : ""} onClick={() => setMode("animate")}>Animate</button></div>
      <div className="top-actions"><button className="icon-button" disabled={!history.current.canUndo} onClick={undo}>↶</button><button className="icon-button" disabled={!history.current.canRedo} onClick={redo}>↷</button><span className="divider" /><button className={`tool-toggle ${showBones ? "active" : ""}`} onClick={() => setShowBones(!showBones)}>Bones</button><button className={`tool-toggle ${showControls ? "active" : ""}`} onClick={() => setShowControls(!showControls)}>Controls</button><button className={`tool-toggle ${editPivots ? "active" : ""}`} onClick={() => setEditPivots(!editPivots)}>Edit Pivots</button><select aria-label="Preview Quality" value={previewQuality} onChange={(event) => setPreviewQuality(event.target.value as typeof previewQuality)}><option>Auto</option><option>Full</option><option>Performance</option></select><button className={showPerformance ? "tool-toggle active" : "tool-toggle"} onClick={() => setShowPerformance(!showPerformance)}>Show Performance</button><span className="divider" /><button onClick={() => audioInput.current?.click()}>Import Audio</button><button onClick={() => loadInput.current?.click()}>Open</button><button onClick={saveProject}>Save</button><button onClick={resetProject}>Reset</button><button onClick={() => { location.href = "/character/duik-import"; }}>Import Duik Rig</button><button onClick={() => setExportOpen(true)}>EXPORT</button><button className="auto-animate" disabled={!project.audio || generating} onClick={() => { setAiOpen(true); if (project.audio) void generate(); }}>AUTO ANIMATE</button>
        <input ref={audioInput} hidden type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importAudio(file); event.target.value = ""; }} /><input ref={loadInput} hidden type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadProject(file); event.target.value = ""; }} /></div></header>
    <div className="workspace"><HierarchyPanel bones={project.rig.bones} selectedId={selectedId} onSelect={setSelectedId} /><PlaybackViewport project={viewportProject} selectedId={selectedId} showBones={previewQuality === "Performance" || previewQuality === "Auto" && playbackMetrics.previewFps < 50 ? false : showBones} showControls={previewQuality === "Performance" || previewQuality === "Auto" && playbackMetrics.previewFps < 50 ? false : showControls} onSelect={setSelectedId} onPreviewBone={previewBone} onCommitDrag={commitDrag} time={currentTime} playing={playing} audioUrl={audioUrl} editPivots={editPivots} onTime={setCurrentTime} onStop={() => setPlaying(false)} onMetrics={setPlaybackMetrics} /><InspectorPanel bone={selectedBone} bones={project.rig.bones} face={project.character.face} calibration={project.character.calibration} faceAssets={faceAssets} onFaceAssets={(faceAssets) => setProject((current) => ({ ...current, character: { ...current.character, faceAssets } }))} onFaceChange={updateFace} onCalibrationChange={updateCalibration} onNeckPivot={(patch) => commitBone("neck", patch, "Move neck pivot")} onChange={(patch) => commitBone(selectedBone.id, patch)} onOpenEyeLab={() => setEyeLabOpen(true)} /></div>
    <Timeline project={project} currentTime={currentTime} playing={playing} onTime={seek} onTogglePlay={() => setPlaying(!playing)} onTracks={(tracks) => setProject((current) => ({ ...current, animation: { tracks } }))} />{showPerformance && <div className="performance-profiler"><b>PROJECT {project.stage.fps} FPS · PREVIEW {playbackMetrics.previewFps.toFixed(1)} FPS</b><span>Frame <strong>{playbackMetrics.frameMs.toFixed(1)} ms</strong></span><span>Animation <strong>{(playbackMetrics.animationMs ?? 0).toFixed(2)} ms</strong></span><span>Rig solve <strong>{(playbackMetrics.rigMs ?? 0).toFixed(2)} ms</strong></span><span>SVG render <strong>{(playbackMetrics.svgRenderMs ?? 0).toFixed(2)} ms</strong></span><span>Worst <strong>{playbackMetrics.worstFrameMs.toFixed(1)} ms</strong></span><span>Dropped <strong>{playbackMetrics.droppedFrames}</strong></span><span>Audio drift <strong>{playbackMetrics.audioDriftMs.toFixed(1)} ms</strong></span></div>}<footer className="statusbar"><span>{status}</span><button className="performance-status" onClick={() => setAiOpen(true)}>{project.audio ? `♫ ${project.audio.name}` : "No audio"}</button><span>Project {project.stage.fps} FPS · Preview {playbackMetrics.previewFps.toFixed(0)} FPS</span></footer>
    <ExportPanel open={exportOpen} settings={exportSettings} running={exporting} progress={exportProgress} current={exportCurrent} total={exportTotal} ffmpegReady={ffmpegReady} onSettings={setExportSettings} onExport={() => void runExport()} onCancel={() => exportAbort.current?.abort()} onClose={() => setExportOpen(false)} />
    <AIPerformancePanel open={aiOpen} project={project} transcriptText={transcriptText} provider={provider} aiStatus={aiStatus} options={plannerOptions} running={generating} progress={progress} error={aiError} errorDetails={errorDetails} onClose={() => setAiOpen(false)} onTranscript={setTranscriptText} onProvider={setProvider} onOptions={setPlannerOptions} onProfile={(performanceProfile) => setProject((current) => ({ ...current, performanceProfile }))} onRun={(forced) => void generate(forced)} onRegenerate={(channel) => void generate(undefined, channel)} onConfigure={configureGemini} />
    <EyeDesignLab open={eyeLabOpen} face={project.character.face} calibration={project.character.calibration} assets={faceAssets} onFace={updateFace} onAssets={(faceAssets) => setProject((current) => ({ ...current, character: { ...current.character, faceAssets } }))} onKeyframeGlasses={keyframeGlasses} onClose={() => setEyeLabOpen(false)} />
  </div>;
}

const defaultExportSettings: ExportSettings = { renderer: "remotion", concurrency: "auto", format: "mp4", width: 1920, height: 1080, fps: 60, quality: "High", background: "project", color: "#E8EDF2", fit: "Fit", includeAudio: true, keepFrames: false };
function formatSeconds(seconds: number) { const rounded = Math.max(0, Math.round(seconds)); return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`; }

function disabledOptions(): PlannerOptions { return { lipSync: false, expressions: false, eyes: false, eyebrows: false, head: false, blink: false, body: false }; }
function emptyPerformance(transcript: TimedTranscript, provider: Provider): ProjectDocument["performance"] & {} { return { version: 1, provider, promptVersion: "v1", overall: { language: transcript.language, mood: "neutral", energy: 0.5, speakingStyle: "natural" }, segments: [] }; }
function transcriptTextOf(transcript: TimedTranscript | null) { return transcript?.segments.map((segment) => segment.text).join("\n") ?? ""; }
function mergeGeneratedTracks(existing: AnimationTrack[], generated: AnimationTrack[], only?: keyof PlannerOptions) {
  if (!only) return [...existing.filter((track) => !track.generated), ...generated];
  const layers: Record<keyof PlannerOptions, AnimationTrack["layer"][]> = { lipSync: ["lipSync"], expressions: ["aiExpression"], eyes: ["aiGaze"], eyebrows: ["aiEyebrows"], head: ["aiHead"], blink: ["blink"], body: ["speechMotion"] };
  return [...existing.filter((track) => !layers[only].includes(track.layer)), ...generated];
}
function loadAutosave(): ProjectDocument | null { try { const raw = localStorage.getItem("algowzxd.autosave"); if (!raw) return null; const project = JSON.parse(raw) as ProjectDocument; assertProject(project); return upgradeProject(project); } catch { return null; } }
function upgradeProject(project: ProjectDocument): ProjectDocument {
  const current = createDefaultProject(); const defaults = defaultFace(); const profile = project.performanceProfile ?? defaultPerformanceProfile(); const profileDefaults = defaultPerformanceProfile(); const currentArt = project.character.artworkUrl === current.character.artworkUrl && project.character.assetRevision === current.character.assetRevision;
  const oldFace = project.character.face; const calibration = { ...defaultFaceCalibration(), ...project.character.calibration };
  if (calibration.mouthVisualScale > 1) calibration.mouthVisualScale = 0.74;
  if (calibration.gazeRangeX <= 2) calibration.gazeRangeX = 6;
  if (calibration.gazeRangeY <= 2) calibration.gazeRangeY = 3;
  project = { ...project, stage: { ...project.stage, fps: project.stage.fps === 30 ? 60 : project.stage.fps || 60, backgroundMode: project.stage.backgroundMode ?? "solid" } };
  const face = { ...defaults, ...oldFace, gazeX: Math.abs(oldFace.gazeX) > 1 ? oldFace.gazeX / 7 : oldFace.gazeX, gazeY: Math.abs(oldFace.gazeY) > 1 ? oldFace.gazeY / 5 : oldFace.gazeY, cryControls: { ...defaults.cryControls, ...oldFace.cryControls }, parts: { ...defaults.parts, ...oldFace?.parts }, mouthParts: { ...defaults.mouthParts, ...oldFace?.mouthParts }, eyeSystem: { left: { ...defaults.eyeSystem.left, ...oldFace.eyeSystem?.left }, right: { ...defaults.eyeSystem.right, ...oldFace.eyeSystem?.right } }, browSystem: { left: { ...defaults.browSystem.left, ...oldFace.browSystem?.left }, right: { ...defaults.browSystem.right, ...oldFace.browSystem?.right } }, accessories: { sunglasses: { ...defaults.accessories.sunglasses, ...oldFace.accessories?.sunglasses } } };
  const faceAssets = { ...current.character.faceAssets, ...project.character.faceAssets, mouthOverrides: project.character.faceAssets?.mouthOverrides ?? {}, eyeOverrides: project.character.faceAssets?.eyeOverrides ?? {}, browOverrides: project.character.faceAssets?.browOverrides ?? {} };
  return { ...project, audio: project.audio ?? null, audioAnalysis: project.audioAnalysis ?? null, transcript: project.transcript ?? null, performance: project.performance ?? null, performanceProfile: { ...profileDefaults, ...profile, head: { ...profileDefaults.head, ...profile.head }, eyes: { ...profileDefaults.eyes, ...profile.eyes }, mouth: { ...profileDefaults.mouth, visualScale: calibration.mouthVisualScale }, lipSync: { ...profileDefaults.lipSync, ...profile.lipSync } }, character: currentArt ? { ...project.character, calibration, faceAssets, face } : current.character, rig: currentArt ? project.rig : current.rig, animation: { tracks: (project.animation?.tracks ?? current.animation.tracks).map(normalizeTrack) } };
}
function normalizeTrack(track: Partial<AnimationTrack>): AnimationTrack {
  const layer = track.layer ?? "manual";
  return { id: track.id ?? crypto.randomUUID(), name: track.name ?? "Animation", layer, target: track.target ?? "", valueType: track.valueType ?? "number", muted: track.muted ?? false, locked: track.locked ?? false, generated: track.generated ?? (layer !== "base" && layer !== "manual"), keyframes: track.keyframes ?? [], metadata: track.metadata };
}
function performanceCacheKey(audioHash: string, provider: Provider, transcript: TimedTranscript, profile: ProjectDocument["performanceProfile"]) {
  const input = `${audioHash}|${provider}|v1|${JSON.stringify(transcript)}|${JSON.stringify(profile)}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  return `algowzxd.performance.${(hash >>> 0).toString(16)}`;
}
function readPerformanceCache(key: string) { try { return JSON.parse(localStorage.getItem(key) ?? "null") as ProjectDocument["performance"]; } catch { return null; } }
