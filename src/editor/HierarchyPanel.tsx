import type { Bone } from "../project/schema";

interface Props {
  bones: Bone[];
  selectedId: string;
  onSelect(id: string): void;
}

export function HierarchyPanel({ bones, selectedId, onSelect }: Props) {
  const children = new Map<string | null, Bone[]>();
  bones.forEach((bone) => children.set(bone.parentId, [...(children.get(bone.parentId) ?? []), bone]));

  const render = (parentId: string | null, depth = 0): React.ReactNode =>
    (children.get(parentId) ?? []).map((bone) => (
      <div key={bone.id}>
        <button
          className={`tree-row ${selectedId === bone.id ? "selected" : ""}`}
          style={{ paddingLeft: 10 + depth * 16 }}
          onClick={() => onSelect(bone.id)}
          title={bone.artworkPrefixes.length ? bone.artworkPrefixes.join(", ") : "No artwork binding"}
        >
          <span className="tree-chevron">{children.has(bone.id) ? "⌄" : "·"}</span>
          <span className={`tree-icon ${bone.artworkPrefixes.length ? "bound" : "missing"}`} />
          <span>{bone.name}</span>
          {bone.locked && <span className="tree-lock">◆</span>}
        </button>
        {render(bone.id, depth + 1)}
      </div>
    ));

  return (
    <aside className="left-panel panel">
      <div className="panel-tabs">
        <button className="active">Hierarchy</button>
        <button>Assets</button>
      </div>
      <div className="panel-section-label">ALGOWZXD RIG</div>
      <div className="tree">{render(null)}</div>
      <div className="asset-note">
        <span className="status-dot" />
        Segmented SVG · 1920×1080
      </div>
    </aside>
  );
}
