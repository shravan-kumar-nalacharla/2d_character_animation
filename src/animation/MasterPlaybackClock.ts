export interface PlaybackMetrics { previewFps: number; frameMs: number; worstFrameMs: number; droppedFrames: number; audioDriftMs: number; animationMs?: number; rigMs?: number; svgRenderMs?: number }

export class MasterPlaybackClock {
  private originTime = 0;
  private originStamp = 0;
  private lastStamp = 0;
  private lastAudioCheck = 0;
  private frames: number[] = [];
  private worstFrameMs = 0;
  private droppedFrames = 0;
  private audioDriftMs = 0;

  start(time: number, stamp = performance.now()) { this.originTime = time; this.originStamp = stamp; this.lastStamp = stamp; this.lastAudioCheck = stamp; this.frames = []; this.worstFrameMs = 0; this.droppedFrames = 0; }

  sample(stamp: number, duration: number, audio?: HTMLAudioElement | null) {
    const delta = stamp - this.lastStamp;
    if (this.lastStamp && delta > 25) this.droppedFrames += Math.max(1, Math.round(delta / (1000 / 60)) - 1);
    if (delta > 0) { this.frames.push(delta); if (this.frames.length > 120) this.frames.shift(); this.worstFrameMs = Math.max(this.worstFrameMs, delta); }
    this.lastStamp = stamp;
    let time = this.originTime + (stamp - this.originStamp) / 1000;
    if (audio && !audio.paused && stamp - this.lastAudioCheck >= 200) {
      const error = audio.currentTime - time;
      this.audioDriftMs = error * 1000;
      this.originTime += Math.abs(error) > .12 ? error : error * .18;
      this.lastAudioCheck = stamp;
      time = this.originTime + (stamp - this.originStamp) / 1000;
    }
    return Math.max(0, Math.min(duration, time));
  }

  metrics(projectFps: number): PlaybackMetrics {
    const average = this.frames.length ? this.frames.reduce((sum, value) => sum + value, 0) / this.frames.length : 1000 / projectFps;
    return { previewFps: Math.min(240, 1000 / average), frameMs: average, worstFrameMs: this.worstFrameMs, droppedFrames: this.droppedFrames, audioDriftMs: this.audioDriftMs };
  }
}
