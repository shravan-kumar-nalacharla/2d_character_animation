import { useEffect, useMemo, useState } from "react";
import { loadCharacterAssetManifestV2, validateCharacterAssetManifestV2 } from "../character/AssetManifestV2";
import type { AttachmentAsset, CharacterAssetManifestV2 } from "../character/AssetManifestV2";

type Tab = "expressions" | "hands-left" | "hands-right" | "shoes" | "legs-joints";
const packRoot = "/production_character/v2/";

export function AssetQaPage() {
  const [manifest, setManifest] = useState<CharacterAssetManifestV2 | null>(null), [error, setError] = useState(""), [tab, setTab] = useState<Tab>("expressions"), [showGuides, setShowGuides] = useState(true);
  useEffect(() => { void loadCharacterAssetManifestV2().then(setManifest).catch((reason) => setError(String(reason))); }, []);
  const assets = useMemo(() => manifest ? new Map([...manifest.assets, ...manifest.hands, ...manifest.shoes].map((asset) => [asset.id, asset])) : new Map<string, AttachmentAsset>(), [manifest]);
  if (error) return <main className="asset-qa-page"><header><h1>Asset QA failed</h1><a href="/">BACK</a></header><p className="asset-qa-error">{error}</p></main>;
  if (!manifest) return <main className="asset-qa-page"><p className="asset-qa-loading">Loading Asset Contract V2…</p></main>;
  const issues = validateCharacterAssetManifestV2(manifest), visible = tab === "hands-left" ? manifest.hands.filter((asset) => asset.handedness === "left") : tab === "hands-right" ? manifest.hands.filter((asset) => asset.handedness === "right") : tab === "shoes" ? manifest.shoes : tab === "legs-joints" ? manifest.assets.filter((asset) => asset.slot.startsWith("leg.") || asset.slot.startsWith("joint.")) : [];
  return <main className="asset-qa-page">
    <header><div><small>ALGOWZXD · ASSET CONTRACT V2</small><h1>Production asset QA</h1><p>{manifest.expressions.length} expressions · {manifest.hands.length} hand poses · {manifest.shoes.length} shoes · {issues.filter((issue) => issue.level === "error").length} contract errors</p></div><div><label><input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)}/> anchors &amp; bounds</label><a href="/">BACK TO EDITOR</a></div></header>
    <nav>{(["expressions","hands-left","hands-right","shoes","legs-joints"] as Tab[]).map((value) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value.replaceAll("-", " ")}</button>)}</nav>
    {issues.length > 0 && <details className="asset-qa-issues"><summary>{issues.length} manifest warning{issues.length === 1 ? "" : "s"}</summary>{issues.map((issue, index) => <p key={index} className={issue.level}><b>{issue.path}</b> {issue.message}</p>)}</details>}
    {tab === "expressions" ? <section className="asset-qa-grid expressions">{manifest.expressions.map((expression) => {
      const layers = [expression.shading, expression.leftEyebrow, expression.rightEyebrow, expression.leftEye, expression.rightEye, expression.silentMouth].map((id) => assets.get(id)).filter(Boolean) as AttachmentAsset[];
      return <article key={expression.id}><div className="asset-checker expression-stack">{layers.map((asset) => <img key={asset.id} src={packRoot + asset.path} alt=""/>) }{showGuides && <><i className="qa-anchor"/><i className="qa-safe-frame"/></>}</div><footer><b>{expression.label}</b><code>{expression.id}</code><span>6 independent layers</span></footer></article>;
    })}</section> : <section className="asset-qa-grid">{visible.map((asset) => <AssetCard key={asset.id} asset={asset} showGuides={showGuides}/>)}</section>}
  </main>;
}

function AssetCard({ asset, showGuides }: { asset: AttachmentAsset; showGuides: boolean }) {
  const anchor = { left: `${asset.anchor.x / asset.width * 100}%`, top: `${asset.anchor.y / asset.height * 100}%` }, bounds = { left: `${asset.bounds.x / asset.width * 100}%`, top: `${asset.bounds.y / asset.height * 100}%`, width: `${asset.bounds.width / asset.width * 100}%`, height: `${asset.bounds.height / asset.height * 100}%` };
  return <article><div className="asset-checker"><img src={packRoot + asset.path} alt={asset.id}/>{showGuides && <><i className="qa-anchor" style={anchor}/><i className="qa-bounds" style={bounds}/></>}</div><footer><b>{asset.tags[1] ?? asset.id}</b><code>{asset.id}</code><span>{asset.width}×{asset.height} · anchor {asset.anchor.x},{asset.anchor.y}</span></footer></article>;
}
