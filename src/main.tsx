import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./editor/App";
import { DuikImportPage } from "./editor/duik/DuikImportPage";
import { EyeContactSheet } from "./editor/EyeContactSheet";
import { CryQaPage } from "./editor/CryQaPage";
import { AssetQaPage } from "./editor/AssetQaPage";
import "./editor/styles.css";

const Screen = window.location.pathname === "/character/duik-import" ? DuikImportPage : window.location.pathname === "/face/eye-contact-sheet" ? EyeContactSheet : window.location.pathname === "/face/cry-qa" ? CryQaPage : window.location.pathname === "/assets/v2-qa" ? AssetQaPage : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Screen />
  </StrictMode>,
);
