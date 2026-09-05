import { useMemo, useRef, useState } from "react";
import { importDuikRig, assertDuikExport } from "../../importers/duik/DuikRigImporter";
import { validateDuikRig } from "../../importers/duik/DuikRigValidator";
import type { DuikRawExport, ImportedDuikRig, ValidationResult } from "../../importers/duik/types";

const tabs = ["Overview", "Layers", "Artwork", "Bones", "Controllers", "IK/FK", "Constraints", "Duik Effects", "Expressions", "Animation", "Validation", "Raw Export"] as const;
type Tab = typeof tabs[number];

const source = {
  path: "…/algowzxd new 2024/full body rigging duik",
  project: "algowzxd full body duik.aep",
  fallback: "Auto-Save 49.aep",
  sha: "F8669CE5…CAC6",
};

export function DuikImportPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [raw, setRaw] = useState<DuikRawExport | null>(null);
  const [rig, setRig] = useState<ImportedDuikRig | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [roleOverrides, setRoleOverrides] = useState<Record<string, "bone" | "controller" | "artwork">>({});
  const [status, setStatus] = useState("Awaiting read-only AE export");
  const input = useRef<HTMLInputElement>(null);
  const rootComp = useMemo(() => raw?.comps.find((comp) => String(comp.id) === String(raw.project.rootCompId)) ?? raw?.comps[0], [raw]);
  const allNodes = rig ? [...rig.controllers, ...rig.bones, ...rig.artwork] : [];

  async function load(file: File) {
    try {
      const value: unknown = JSON.parse(await file.text());
      assertDuikExport(value);
      const imported = importDuikRig(value);
      const checked = validateDuikRig(imported);
      setRaw(value); setRig(imported); setValidation(checked);
      setRoleOverrides({});
      setStatus(`Loaded ${file.name} · ${checked.valid ? "valid" : "needs attention"}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not read the export");
    }
  }

  function downloadRig() {
    if (!rig || !validation?.valid) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(rig, null, 2)], { type: "application/json" }));
    link.download = "algowzxd-2024-duik.native-rig.json";
    link.click(); URL.revokeObjectURL(link.href);
    localStorage.setItem("algowzxd.character.algowzxd_2024_duik", JSON.stringify(rig));
    setStatus("Native character profile created");
  }

  function changeRole(layerId: string, role: "bone" | "controller" | "artwork") {
    if (!raw) return;
    const next = { ...roleOverrides, [layerId]: role };
    const imported = importDuikRig(raw, next);
    setRoleOverrides(next); setRig(imported); setValidation(validateDuikRig(imported));
  }

  return (
    <div className="duik-page">
      <header className="duik-header">
        <a className="back-link" href="/">← Editor</a>
        <div className="brand"><span className="brand-mark">A</span><strong>ALGOWZXD</strong><small>DUIK MIGRATION</small></div>
        <div className="duik-actions">
          <button onClick={() => input.current?.click()}>Load Export JSON</button>
          <button onClick={() => { if (rig) setValidation(validateDuikRig(rig)); setTab("Validation"); }} disabled={!rig}>Validate Rig</button>
          <button className="primary-action" disabled={!validation?.valid} onClick={downloadRig}>Create Native Character</button>
          <input hidden ref={input} type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void load(file); event.target.value = ""; }} />
        </div>
      </header>

      <section className="source-strip">
        <span className="source-badge">AEP</span>
        <div><strong>{source.project}</strong><small>{source.path}</small></div>
        <div className="source-fact"><small>SHA-256</small><code>{source.sha}</code></div>
        <div className="source-fact"><small>FALLBACK</small><span>{source.fallback}</span></div>
        <span className={`import-state ${raw ? "ready" : "waiting"}`}><i />{raw ? "Export loaded" : "AE export required"}</span>
      </section>

      <nav className="duik-tabs">{tabs.map((name) => <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>{name}</button>)}</nav>

      <main className="duik-workspace">
        <aside className="duik-panel layer-browser">
          <div className="panel-heading"><span>SOURCE STRUCTURE</span><b>{rootComp?.layers.length ?? "—"}</b></div>
          {rootComp ? rootComp.layers.map((layer) => (
            <div className="source-layer" key={String(layer.id)}><i className={(layer.classification ?? []).includes("controller") ? "controller" : "art"} /><span>{layer.name}</span>{tab === "Artwork" || tab === "Layers" ? <select aria-label={`Map ${layer.name}`} value={roleOverrides[String(layer.id)] ?? ((layer.classification ?? []).includes("controller") ? "controller" : (layer.classification ?? []).some((tag) => tag === "bone" || tag === "puppet-pin") ? "bone" : "artwork")} onChange={(event) => changeRole(String(layer.id), event.target.value as "bone" | "controller" | "artwork")}><option value="artwork">Art</option><option value="bone">Bone</option><option value="controller">Ctrl</option></select> : <small>{layer.index}</small>}</div>
          )) : <Empty title="No evaluated layer data" body="Run the included exporter in After Effects, then load raw-duik-export.json here." />}
        </aside>

        <section className="duik-center">
          <div className="canvas-toolbar"><span>{tab}</span><small>{rootComp ? `${rootComp.width} × ${rootComp.height} · ${rootComp.fps} fps` : "SOURCE AUDIT MODE"}</small></div>
          {tab === "Raw Export" ? <pre className="raw-export">{raw ? JSON.stringify(raw, null, 2) : "No raw export loaded."}</pre> :
           tab === "Validation" ? <ValidationView validation={validation} /> :
           tab === "Overview" ? <Overview raw={raw} rig={rig} /> :
           <RigCanvas nodes={allNodes.filter((node) => tab === "Layers" || tab === "Artwork" ? true : tab === "Bones" ? node.role === "bone" : tab === "Controllers" ? node.role === "controller" : true)} loaded={Boolean(raw)} />}
        </section>

        <aside className="duik-panel import-inspector">
          <div className="panel-heading"><span>IMPORT STATUS</span></div>
          <Metric label="Compositions" value={raw?.comps.length ?? "—"} />
          <Metric label="Source layers" value={rootComp?.layers.length ?? "—"} />
          <Metric label="Native bones" value={rig?.bones.length ?? "—"} />
          <Metric label="Controllers" value={rig?.controllers.length ?? "—"} />
          <Metric label="Constraints" value={rig?.constraints.length ?? "—"} />
          <div className="compatibility">
            <h3>Compatibility</h3>
            <CompatibilityRow label="Native" value={rig?.compatibility.native} tone="green" />
            <CompatibilityRow label="Approximated" value={rig?.compatibility.approximated} tone="amber" />
            <CompatibilityRow label="Unsupported" value={rig?.compatibility.unsupported} tone="red" />
          </div>
          <div className="workflow-note"><strong>Read-only workflow</strong><p>The original AEP stays untouched. Conversion output becomes a separate <code>algowzxd_2024_duik</code> profile.</p></div>
        </aside>
      </main>
      <footer className="statusbar"><span>{status}</span><span>Duik runtime dependency: none · schema v1</span></footer>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) { return <div className="empty-state"><div className="empty-glyph">⇧</div><strong>{title}</strong><p>{body}</p></div>; }
function Metric({ label, value }: { label: string; value: number | string }) { return <div className="metric"><span>{label}</span><b>{value}</b></div>; }
function CompatibilityRow({ label, value, tone }: { label: string; value?: number; tone: string }) { return <div className="compat-row"><i className={tone} /><span>{label}</span><b>{value ?? "—"}</b></div>; }

function Overview({ raw, rig }: { raw: DuikRawExport | null; rig: ImportedDuikRig | null }) {
  return <div className="overview-grid">
    <article><small>01 · EXTRACT</small><h2>After Effects snapshot</h2><p>The bundled JSX records evaluated and authored rig data without changing the source project.</p><b className={raw ? "done" : "pending"}>{raw ? "Complete" : "Waiting for AE"}</b></article>
    <article><small>02 · CONVERT</small><h2>Native rig graph</h2><p>Parenting, controllers, slider links, IK evidence, and artwork bindings are converted into explicit native data.</p><b className={rig ? "done" : "pending"}>{rig ? "Complete" : "Not started"}</b></article>
    <article><small>03 · VERIFY</small><h2>Validation gate</h2><p>Cycles, missing targets, invalid transforms, and unsupported expressions are reported before creation.</p><b className="pending">Required</b></article>
    <article className="evidence-card"><small>STATIC AEP EVIDENCE</small><h2>2024 character rig detected</h2><ul><li>Duik controller metadata</li><li>2D slider pseudo-effects</li><li>Mouth, eyes, eyebrows, hands and legs</li><li>Puppet-pin and expression references</li></ul></article>
  </div>;
}

function RigCanvas({ nodes, loaded }: { nodes: ImportedDuikRig["bones"]; loaded: boolean }) {
  if (!loaded) return <Empty title="Precise rig preview pending" body="The binary audit confirms the rig exists, but exact pivots and layer relationships will only be shown after the AE export is loaded." />;
  const visible = nodes.slice(0, 80);
  return <svg className="migration-canvas" viewBox="0 0 1000 700" aria-label="Imported rig graph">
    <defs><pattern id="migration-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#2a3038" strokeWidth="1" /></pattern></defs>
    <rect width="1000" height="700" fill="url(#migration-grid)" />
    {visible.map((node, index) => {
      const x = Number.isFinite(node.x) ? Math.max(25, Math.min(975, node.x)) : 120 + (index % 8) * 95;
      const y = Number.isFinite(node.y) ? Math.max(25, Math.min(675, node.y)) : 80 + Math.floor(index / 8) * 70;
      return <g key={node.id} transform={`translate(${x} ${y})`}><circle r={node.role === "controller" ? 11 : 6} className={`graph-${node.role}`} /><text y="-14">{node.name}</text></g>;
    })}
  </svg>;
}

function ValidationView({ validation }: { validation: ValidationResult | null }) {
  if (!validation) return <Empty title="Validation has not run" body="Load an export and select Validate Rig." />;
  return <div className="validation-view"><header><strong>{validation.valid ? "Rig passed structural validation" : "Rig requires attention"}</strong><span>{validation.summary.errors} errors · {validation.summary.warnings} warnings</span></header>{validation.issues.length ? validation.issues.map((issue, index) => <div className={`validation-issue ${issue.severity}`} key={`${issue.code}-${index}`}><b>{issue.code}</b><span>{issue.message}</span></div>) : <div className="validation-success">No structural problems found.</div>}</div>;
}
