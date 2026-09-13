import { RigBodyQa } from './editor/RigBodyQa';
import { BodyQaPage } from './editor/BodyQaPage';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./editor/App";
import { DuikImportPage } from "./editor/duik/DuikImportPage";
import { EyeContactSheet } from "./editor/EyeContactSheet";
import { CryQaPage } from "./editor/CryQaPage";
import { AssetQaPage } from "./editor/AssetQaPage";
import "./editor/styles.css";

const EditorQa = () => <App rehearsal />;
const Screen = window.location.pathname === "/rig/body-qa" ? RigBodyQa : window.location.pathname === "/body/editor-qa" ? EditorQa : ["/body/rehearsal", "/rig/body-qa"].includes(window.location.pathname) ? BodyQaPage : window.location.pathname === "/character/duik-import" ? DuikImportPage : window.location.pathname === "/face/eye-contact-sheet" ? EyeContactSheet : window.location.pathname === "/face/cry-qa" ? CryQaPage : window.location.pathname === "/assets/v2-qa" ? AssetQaPage : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Screen />
  </StrictMode>,
);
