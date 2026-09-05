import type { ProjectDocument } from "../src/project/schema";
import type { ExportSettings } from "../src/export/OfflineAnimationRenderer";

export interface RemotionRenderProps {
  project: ProjectDocument;
  settings: ExportSettings;
  audioUrl?: string;
}
