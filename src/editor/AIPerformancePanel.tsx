import { useState } from "react";
import type { CharacterPerformanceProfile, PerformancePlan, ProjectDocument } from "../project/schema";
import type { PlannerOptions } from "../animation/PerformancePlanner";

interface Props {
  open: boolean;
  project: ProjectDocument;
  transcriptText: string;
  provider: "gemini" | "rule-based";
  aiStatus: { configured: boolean; model: string; performanceModel?: string; transcriptionModel?: string } | null;
  options: PlannerOptions;
  running: boolean;
  progress: string;
  error: string;
  errorDetails: string;
  onClose(): void;
  onTranscript(text: string): void;
  onProvider(provider: "gemini" | "rule-based"): void;
  onOptions(options: PlannerOptions): void;
  onProfile(profile: CharacterPerformanceProfile): void;
  onRun(provider?: "gemini" | "rule-based"): void;
  onRegenerate(channel: keyof PlannerOptions): void;
  onConfigure(apiKey: string): Promise<void>;
}

const optionLabels: Array<[keyof PlannerOptions, string]> = [["lipSync", "Lip Sync"], ["expressions", "AI Expressions"], ["eyes", "AI Eyes / Gaze"], ["eyebrows", "AI Eyebrows"], ["head", "AI Head Motion"], ["blink", "Automatic Blink"], ["body", "Speech Body Motion"]];

export function AIPerformancePanel(props: Props) {
  const [apiKey, setApiKey] = useState("");
  const [configuring, setConfiguring] = useState(false);
  if (!props.open) return null;
  const { project, aiStatus, running } = props;
  const lipTrack = project.animation.tracks.find((track) => track.target === "face.mouth" && track.generated);
  const lipDiagnostics = lipTrack?.metadata?.visemeOptimization as { rawCount?: number; optimizedCount?: number; droppedCount?: number; duplicateMerges?: number; hysteresisMerges?: number } | undefined;
  const rawSequence = lipTrack?.metadata?.rawSequence as Array<{ viseme: string }> | undefined;
  const optimizedSequence = lipTrack?.metadata?.optimizedSequence as Array<{ viseme: string }> | undefined;
  return <div className="ai-panel-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
    <aside className="ai-panel" aria-label="AI Performance">
      <header className="ai-panel-header"><div><small>AUDIO → EDITABLE PERFORMANCE</small><h2>AI PERFORMANCE</h2></div><button onClick={props.onClose}>×</button></header>
      <div className="ai-panel-scroll">
        <section className="ai-audio-card">
          <b>{project.audio?.name ?? "No audio imported"}</b>
          <span>{project.audio ? `${project.audio.duration.toFixed(2)}s · ${(project.audio.size / 1024 / 1024).toFixed(1)} MB` : "Import WAV or MP3 from the toolbar"}</span>
        </section>

        <section className="ai-section">
          <header>PROVIDER</header>
          <div className="provider-choice">
            <button className={props.provider === "gemini" ? "active" : ""} disabled={!aiStatus?.configured} onClick={() => props.onProvider("gemini")}>Gemini</button>
            <button className={props.provider === "rule-based" ? "active" : ""} onClick={() => props.onProvider("rule-based")}>Local rules</button>
          </div>
          <p className={aiStatus?.configured ? "configured" : "not-configured"}>{aiStatus?.configured ? "Connected" : "Gemini not configured"}</p>
          {aiStatus?.configured && <div className="model-status"><span>Transcription <b>{aiStatus.transcriptionModel ?? "Gemini transcription"} ✓</b></span><span>Performance <b>{aiStatus.performanceModel ?? aiStatus.model} ✓</b></span></div>}
          {!aiStatus?.configured && <div className="api-key-entry"><input type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste Gemini API key" aria-label="Gemini API key" /><button disabled={configuring || apiKey.trim().length < 20} onClick={async () => { setConfiguring(true); try { await props.onConfigure(apiKey); setApiKey(""); } finally { setConfiguring(false); } }}>{configuring ? "Connecting…" : "Connect"}</button><small>Session only · not saved in browser or project</small></div>}
        </section>

        <section className="ai-section">
          <header>TRANSCRIPT</header>
          <textarea value={props.transcriptText} onChange={(event) => props.onTranscript(event.target.value)} placeholder="Optional with Gemini. Required for local rules. English, Hindi, Telugu, and romanized code-switching are accepted." />
          {!!project.transcript?.diagnostics?.length && <details className="transcript-diagnostics"><summary>Some transcript timing data needed correction · View details</summary><pre>{JSON.stringify(project.transcript.diagnostics, null, 2)}</pre></details>}
          {project.character.calibration.showLanguageMap && project.transcript && <details className="language-debug" open><summary>WORD LANGUAGE MAP</summary><div>{project.transcript.segments.flatMap((segment) => segment.words).map((word, index) => <span key={`${word.start}-${index}`} className={`language-${word.language ?? "en"}`}>{word.text}<small>{(word.language ?? "en").toUpperCase()} · {word.script ?? "latin"}</small></span>)}</div></details>}
        </section>

        <section className="ai-section">
          <header>PERFORMANCE STYLE</header>
          <select value={project.performanceProfile.preset} onChange={(event) => props.onProfile(profilePreset(event.target.value as CharacterPerformanceProfile["preset"]))}>
            {(["Calm", "Natural", "YouTube", "Energetic", "Comedy"] as const).map((preset) => <option key={preset}>{preset}</option>)}
          </select>
          <ProfileSlider label="Expression" field="expressionStrength" profile={project.performanceProfile} onChange={props.onProfile} />
          <ProfileSlider label="Mouth" field="mouthStrength" profile={project.performanceProfile} onChange={props.onProfile} />
          <ProfileSlider label="Eyes" field="eyeActivity" profile={project.performanceProfile} onChange={props.onProfile} />
          <ProfileSlider label="Eyebrows" field="eyebrowActivity" profile={project.performanceProfile} onChange={props.onProfile} />
          <ProfileSlider label="Head" field="headMotion" profile={project.performanceProfile} onChange={props.onProfile} />
          <ProfileSlider label="Body" field="bodyMotion" profile={project.performanceProfile} onChange={props.onProfile} />
          <ProfileSlider label="Performance density" field="performanceDensity" profile={project.performanceProfile} onChange={props.onProfile} />
          <label className="ai-slider"><span>Viseme density</span><input type="range" min="0" max="100" step="1" value={project.performanceProfile.lipSync.density} onChange={(event) => props.onProfile({ ...project.performanceProfile, preset: "Custom", lipSync: { ...project.performanceProfile.lipSync, density: Number(event.target.value) } })} /><b>{project.performanceProfile.lipSync.density}</b></label>
          <label className="ai-slider"><span>Viseme style</span><select value={project.performanceProfile.lipSync.preset} onChange={(event) => props.onProfile({ ...project.performanceProfile, preset: "Custom", lipSync: { ...project.performanceProfile.lipSync, preset: event.target.value as CharacterPerformanceProfile["lipSync"]["preset"] } })}>{(["Precise", "Natural", "Cartoon", "Mumble"] as const).map((preset) => <option key={preset}>{preset}</option>)}</select><b /></label>
        </section>

        <section className="ai-section option-grid">
          <header>GENERATE</header>
          {optionLabels.map(([name, label]) => <label key={name}><input type="checkbox" checked={props.options[name]} onChange={(event) => props.onOptions({ ...props.options, [name]: event.target.checked })} />{label}</label>)}
        </section>

        {props.progress && <div className={`ai-progress ${props.error ? "error" : ""}`}><i />{props.error || props.progress}</div>}
        {lipDiagnostics && <details className="transcript-diagnostics"><summary>LIP SYNC OPTIMIZER · {lipDiagnostics.rawCount ?? 0} → {lipDiagnostics.optimizedCount ?? 0} poses</summary><p>Dropped {lipDiagnostics.droppedCount ?? 0} · duplicate merges {lipDiagnostics.duplicateMerges ?? 0} · A-B-A merges {lipDiagnostics.hysteresisMerges ?? 0}</p><small>RAW</small><pre>{rawSequence?.map((item) => item.viseme).join(" · ")}</pre><small>OPTIMIZED</small><pre>{optimizedSequence?.map((item) => item.viseme).join(" · ")}</pre></details>}
        {props.error && props.errorDetails && <details className="error-details"><summary>View details</summary><pre>{props.errorDetails}</pre></details>}
        <button className="run-ai" disabled={running || !project.audio} onClick={() => props.onRun()}>{running ? "GENERATING PERFORMANCE…" : "AUTO ANIMATE WITH AI"}</button>
        {props.error && <div className="fallback-actions"><button onClick={() => props.onRun("gemini")}>Retry Gemini</button><button onClick={() => props.onRun("rule-based")}>Use rule-based analysis</button><button onClick={() => props.onRegenerate("lipSync")}>Lip Sync Only</button></div>}

        {project.performance && <PerformanceViewer plan={project.performance} onRegenerate={props.onRegenerate} />}
      </div>
    </aside>
  </div>;
}

function ProfileSlider({ label, field, profile, onChange }: { label: string; field: keyof CharacterPerformanceProfile; profile: CharacterPerformanceProfile; onChange(profile: CharacterPerformanceProfile): void }) {
  const value = profile[field];
  if (typeof value !== "number") return null;
  return <label className="ai-slider"><span>{label}</span><input type="range" min="0" max="1" step="0.05" value={value} onChange={(event) => onChange({ ...profile, [field]: Number(event.target.value), preset: "Custom" })} /><b>{Math.round(value * 100)}</b></label>;
}

function PerformanceViewer({ plan, onRegenerate }: { plan: PerformancePlan; onRegenerate(channel: keyof PlannerOptions): void }) {
  return <section className="ai-section performance-viewer">
    <header>AI PERFORMANCE PLAN <span>{plan.provider}</span></header>
    <div className="regen-row">{(["lipSync", "expressions", "eyes", "eyebrows", "head", "blink", "body"] as Array<keyof PlannerOptions>).map((channel) => <button key={channel} onClick={() => onRegenerate(channel)}>{channel}</button>)}</div>
    {plan.segments.map((segment) => <article key={segment.id}>
      <time>{segment.start.toFixed(2)}–{segment.end.toFixed(2)}</time>
      <div><b>{segment.emotion.primary}</b> {Math.round(segment.emotion.intensity * 100)}% · {segment.intent}</div>
      <p>{segment.text}</p>
      <small>{segment.gaze.target} gaze{segment.headEvents[0] ? ` · ${segment.headEvents[0].type}` : " · still head"}{segment.accents.length ? ` · accent: ${segment.accents.map((accent) => accent.text).join(", ")}` : ""}</small>
    </article>)}
  </section>;
}

function profilePreset(preset: CharacterPerformanceProfile["preset"]): CharacterPerformanceProfile {
  const base = { preset, defaultEnergy: 0.6, expressionStrength: 0.65, mouthStrength: 0.8, eyeActivity: 0.42, eyebrowActivity: 0.58, headMotion: 0.5, bodyMotion: 0.38, emotionStrength: 0.68, animationSmoothness: 0.72, comedicExaggeration: 0.4, performanceDensity: 0.55, head: { motionStrength: 1.75, neckPivotRequired: true, maxNormalRotation: 12, maxReactionRotation: 18, minimumPoseDuration: 0.58, eventCooldown: 0.52 }, eyes: { visualScale: 1.12, horizontalGazeStrength: 1.25, verticalGazeStrength: 1.15, minimumGazeDuration: 0.5, transitionDuration: 0.2, returnDuration: 0.32 }, mouth: { visualScale: 0.74 }, lipSync: { density: 50, preset: "Natural" as const, minimumVisemeDuration: 0.11, coarticulation: 0.72 } };
  if (preset === "Calm") return { ...base, defaultEnergy: 0.38, expressionStrength: 0.45, headMotion: 0.3, bodyMotion: 0.25 };
  if (preset === "Natural") return { ...base, defaultEnergy: 0.52 };
  if (preset === "Energetic") return { ...base, defaultEnergy: 0.82, expressionStrength: 0.86, headMotion: 0.78, bodyMotion: 0.66, eyebrowActivity: 0.8 };
  if (preset === "Comedy") return { ...base, defaultEnergy: 0.76, expressionStrength: 0.9, headMotion: 0.72, comedicExaggeration: 0.88 };
  return { ...base, preset: "YouTube", defaultEnergy: 0.67, expressionStrength: 0.72, headMotion: 0.58, bodyMotion: 0.42, comedicExaggeration: 0.55 };
}
