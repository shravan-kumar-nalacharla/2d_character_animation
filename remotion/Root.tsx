import { Composition } from "remotion";
import { CharacterComposition } from "./CharacterComposition";
import type { RemotionRenderProps } from "./types";

const defaultProps: RemotionRenderProps = {
  project: {} as RemotionRenderProps["project"],
  settings: { renderer: "remotion", concurrency: "auto", format: "mp4", width: 1920, height: 1080, fps: 60, quality: "High", background: "project", color: "#E8EDF2", fit: "Fit", includeAudio: true, keepFrames: false },
};

export function RemotionRoot() {
  return <Composition id="AlgowzxdCharacter" component={CharacterComposition} width={1920} height={1080} fps={60} durationInFrames={60} defaultProps={defaultProps} calculateMetadata={({ props }) => ({
    width: props.settings.width,
    height: props.settings.height,
    fps: props.settings.fps,
    durationInFrames: Math.max(1, Math.ceil(props.project.stage.duration * props.settings.fps)),
    props,
  })} />;
}
