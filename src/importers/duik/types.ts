export type NumericValue = number | number[];

export interface AERawProperty {
  name: string;
  matchName: string;
  path: string;
  value?: unknown;
  evaluatedValue?: unknown;
  expression?: string;
  expressionEnabled?: boolean;
  keyframes?: Array<{ time: number; value: unknown }>;
  children?: AERawProperty[];
}

export interface AERawTransform {
  anchorPoint: number[];
  position: number[];
  scale: number[];
  rotation: number;
  opacity?: number;
}

export interface AERawLayer {
  id: number | string;
  index: number;
  name: string;
  comment?: string;
  kind?: string;
  classification?: string[];
  parentLayerId?: number | string | null;
  source?: { id?: number | string; name?: string; type?: string } | null;
  transform: { raw: AERawTransform; evaluated: AERawTransform };
  effects?: AERawProperty[];
  expressions?: AERawProperty[];
  properties?: AERawProperty[];
  inPoint?: number;
  outPoint?: number;
}

export interface AERawComp {
  id: number | string;
  name: string;
  width: number;
  height: number;
  pixelAspect?: number;
  fps: number;
  duration: number;
  displayStart?: number;
  layers: AERawLayer[];
}

export interface DuikRawExport {
  schema: "algowzxd.duik-ae-export";
  schemaVersion: 1;
  exporterVersion: string;
  exportedAt: string;
  project: { name: string; path?: string; rootCompId?: number | string | null };
  comps: AERawComp[];
  warnings?: string[];
}

export type Compatibility = "native" | "approximated" | "unsupported";

export interface NativeTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  pivotX: number;
  pivotY: number;
}

export interface NativeRigNode extends NativeTransform {
  id: string;
  name: string;
  parentId: string | null;
  sourceLayerId: string;
  role: "bone" | "controller" | "artwork";
}

export interface NativeConstraint {
  id: string;
  name: string;
  type: "twoBoneIK" | "fk" | "slider" | "expressionReference" | "unknown";
  sourceLayerId: string;
  targetIds: string[];
  compatibility: Compatibility;
  evidence: string;
}

export interface ImportedDuikRig {
  schema: "algowzxd.native-rig";
  schemaVersion: 1;
  characterId: "algowzxd_2024_duik";
  displayName: string;
  source: { kind: "after-effects-duik"; projectName: string; exporterVersion: string; rootCompId: string };
  stage: { width: number; height: number; fps: number; duration: number };
  bones: NativeRigNode[];
  controllers: NativeRigNode[];
  artwork: NativeRigNode[];
  constraints: NativeConstraint[];
  originalRestPose: Record<string, NativeTransform>;
  referenceAnimations: Array<{ layerId: string; propertyPath: string; keys: number }>;
  compatibility: Record<Compatibility, number>;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  nodeId?: string;
}

export interface ValidationResult {
  valid: boolean;
  summary: { errors: number; warnings: number; info: number };
  issues: ValidationIssue[];
}
