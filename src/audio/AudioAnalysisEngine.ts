import type { AudioAnalysis } from "../project/schema";

export async function hashAudio(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function analyzeAudioBuffer(buffer: AudioBuffer): AudioAnalysis {
  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let index = 0; index < samples.length; index++) mono[index] += samples[index] / buffer.numberOfChannels;
  }
  return analyzeSamples(mono, buffer.sampleRate);
}

export function analyzeSamples(samples: Float32Array, sampleRate: number): AudioAnalysis {
  const duration = samples.length / sampleRate;
  const peak = samples.reduce((largest, sample) => Math.max(largest, Math.abs(sample)), 0);
  const waveformBins = Math.min(640, Math.max(64, Math.ceil(duration * 24)));
  const waveform = Array.from({ length: waveformBins }, (_, bin) => {
    const start = Math.floor((bin / waveformBins) * samples.length);
    const end = Math.max(start + 1, Math.floor(((bin + 1) / waveformBins) * samples.length));
    let binPeak = 0;
    for (let index = start; index < end; index++) binPeak = Math.max(binPeak, Math.abs(samples[index] ?? 0));
    return peak ? Number((binPeak / peak).toFixed(4)) : 0;
  });

  const windowSize = Math.max(256, Math.round(sampleRate / 50));
  const envelope: Array<{ time: number; rms: number }> = [];
  for (let start = 0; start < samples.length; start += windowSize) {
    const end = Math.min(samples.length, start + windowSize);
    let energy = 0;
    for (let index = start; index < end; index++) energy += samples[index] * samples[index];
    envelope.push({ time: start / sampleRate, rms: Math.sqrt(energy / Math.max(1, end - start)) });
  }
  const averageRms = envelope.reduce((sum, item) => sum + item.rms, 0) / Math.max(1, envelope.length);
  const threshold = Math.max(0.012, averageRms * 0.72);
  const active = envelope.map((item) => item.rms >= threshold);
  const speechRegions: Array<{ start: number; end: number }> = [];
  let regionStart = -1;
  for (let index = 0; index <= active.length; index++) {
    if (active[index] && regionStart < 0) regionStart = index;
    if ((!active[index] || index === active.length) && regionStart >= 0) {
      const start = envelope[regionStart].time;
      const end = Math.min(duration, (envelope[Math.max(regionStart, index - 1)]?.time ?? duration) + windowSize / sampleRate);
      const previous = speechRegions.at(-1);
      if (previous && start - previous.end < 0.18) previous.end = end;
      else if (end - start >= 0.08) speechRegions.push({ start, end });
      regionStart = -1;
    }
  }
  const pauses: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const region of speechRegions) {
    if (region.start - cursor >= 0.2) pauses.push({ start: cursor, end: region.start });
    cursor = region.end;
  }
  if (duration - cursor >= 0.2) pauses.push({ start: cursor, end: duration });

  const emphasisPeaks = envelope.flatMap((item, index) => {
    const before = envelope[index - 1]?.rms ?? 0;
    const after = envelope[index + 1]?.rms ?? 0;
    if (item.rms <= before || item.rms < after || item.rms < Math.max(threshold * 1.5, averageRms * 1.35)) return [];
    return [{ time: item.time, strength: Math.min(1, peak ? item.rms / peak * 2.2 : 0) }];
  }).filter((item, index, all) => index === 0 || item.time - all[index - 1].time > 0.16);

  return {
    version: 1,
    duration,
    sampleRate,
    peak,
    averageRms,
    waveform,
    envelope: envelope.map((item) => ({ time: Number(item.time.toFixed(4)), rms: Number(item.rms.toFixed(5)) })),
    speechRegions: speechRegions.map(roundRange),
    pauses: pauses.map(roundRange),
    emphasisPeaks: emphasisPeaks.map((item) => ({ time: Number(item.time.toFixed(4)), strength: Number(item.strength.toFixed(4)) })),
  };
}

const roundRange = (range: { start: number; end: number }) => ({ start: Number(range.start.toFixed(4)), end: Number(range.end.toFixed(4)) });
