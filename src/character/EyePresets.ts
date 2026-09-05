import type { BrowPreset, EyeExpression, EyeStyle, HighlightStyle } from "../project/schema";

export interface EyeDesign {
  style: EyeStyle;
  scaleX: number;
  scaleY: number;
  openness: number;
  squint: number;
  rotation: number;
  pupilScale: number;
  highlight: HighlightStyle;
  brow: Exclude<BrowPreset, "auto">;
  tier: 0 | 1 | 2 | 3;
}

const base: EyeDesign = { style: "simple", scaleX: 1, scaleY: 1, openness: 1, squint: 0, rotation: 0, pupilScale: 1, highlight: "none", brow: "neutral", tier: 0 };
const p = (patch: Partial<EyeDesign>): EyeDesign => ({ ...base, ...patch });

export const eyeDesigns: Record<EyeExpression, EyeDesign> = {
  neutral: p({}), friendly: p({ scaleY: .96, brow: "soft" }), soft: p({ openness: .88, brow: "soft" }), happy: p({ scaleY: .9, brow: "soft" }),
  happyClosed: p({ style: "closed", openness: 0, squint: -.65, brow: "soft" }), laughClosed: p({ style: "closed", openness: 0, squint: -.9, brow: "raised", tier: 2 }), closedSoft: p({ style: "closed", openness: 0, squint: .25, brow: "soft" }), blink: p({ style: "closed", openness: 0 }), winkLeft: p({}), winkRight: p({}),
  sad: p({ openness: .84, rotation: -2, brow: "sad", tier: 2 }), verySad: p({ openness: .72, scaleY: .92, brow: "concerned", tier: 2 }), teary: p({ style: "white", openness: .9, pupilScale: 1.15, highlight: "double", brow: "sad", tier: 2 }), crying: p({ style: "sparkle", scaleX: 1.06, scaleY: 1.1, openness: .92, pupilScale: 1.15, highlight: "double", brow: "concerned", tier: 2 }), sobCrying: p({ style: "closed", openness: 0, brow: "concerned", tier: 3 }),
  concerned: p({ openness: .88, brow: "concerned", tier: 1 }), worried: p({ style: "white", openness: 1.05, pupilScale: .78, brow: "worried", tier: 2 }), fear: p({ style: "white", scaleX: 1.12, scaleY: 1.25, openness: 1.18, pupilScale: .54, brow: "veryRaised", tier: 2 }), panic: p({ style: "white", scaleX: 1.34, scaleY: 1.42, openness: 1.25, pupilScale: .34, brow: "veryRaised", tier: 3 }),
  shock: p({ style: "white", scaleX: 1.18, scaleY: 1.28, openness: 1.2, pupilScale: .48, brow: "veryRaised", tier: 2 }), shocked: p({ style: "white", scaleX: 1.18, scaleY: 1.28, openness: 1.2, pupilScale: .48, brow: "veryRaised", tier: 2 }), extremeShock: p({ style: "white", scaleX: 1.38, scaleY: 1.5, openness: 1.3, pupilScale: .28, brow: "veryRaised", tier: 3 }), animeShock: p({ style: "anime", scaleX: 1.25, scaleY: 1.35, openness: 1.22, pupilScale: .4, brow: "animeAngry", tier: 3 }),
  curious: p({ scaleY: 1.05, brow: "curious", tier: 1 }), confused: p({ openness: .92, rotation: -2, brow: "curious", tier: 1 }), thinking: p({ openness: .82, brow: "raised", tier: 1 }), suspicious: p({ style: "white", openness: .52, scaleX: 1.15, brow: "suspicious", tier: 2 }), cunning: p({ openness: .58, scaleX: 1.12, rotation: -2, brow: "cunning", tier: 1 }), unimpressed: p({ style: "white", openness: .42, scaleX: 1.16, brow: "neutral", tier: 1 }), bored: p({ style: "white", openness: .36, scaleX: 1.18, brow: "soft", tier: 1 }), deadpan: p({ style: "white", openness: .44, scaleX: 1.2, pupilScale: .62, brow: "neutral", tier: 1 }),
  tired: p({ openness: .54, scaleX: 1.08, brow: "soft", tier: 1 }), sleepy: p({ openness: .34, scaleX: 1.1, brow: "soft", tier: 1 }), serious: p({ openness: .72, rotation: -3, brow: "serious", tier: 1 }), focused: p({ openness: .7, rotation: -4, brow: "determined", tier: 1 }), determined: p({ style: "anime", openness: .72, rotation: -7, brow: "determined", tier: 2 }), coldGlare: p({ style: "white", scaleX: 1.16, openness: .4, pupilScale: .72, brow: "serious", tier: 2 }), animeDetermined: p({ style: "anime", openness: .62, scaleX: 1.15, rotation: -9, brow: "animeAngry", tier: 3 }),
  angry: p({ style: "white", scaleX: 1.08, openness: .84, pupilScale: .72, brow: "angry", tier: 2 }), angrySqueezed: p({ style: "closed", openness: 0, brow: "veryAngry", tier: 2 }), veryAngry: p({ style: "white", scaleX: 1.14, openness: .76, pupilScale: .56, brow: "veryAngry", tier: 2 }), rage: p({ style: "anime", scaleX: 1.2, openness: .72, pupilScale: .45, brow: "animeAngry", tier: 3 }), shadowRage: p({ style: "closed", openness: 0, brow: "animeAngry", tier: 3 }), disgusted: p({ style: "white", scaleX: 1.06, openness: .68, pupilScale: .78, brow: "angry", tier: 2 }), annoyed: p({ openness: .55, rotation: -3, brow: "suspicious", tier: 1 }),
  embarrassed: p({ openness: .64, scaleX: .94, brow: "worried", tier: 1 }), awkward: p({ style: "white", openness: .94, pupilScale: .55, brow: "curious", tier: 1 }), nervous: p({ style: "white", openness: 1.05, pupilScale: .66, brow: "worried", tier: 2 }), excited: p({ scaleX: 1.06, scaleY: 1.12, openness: 1.12, brow: "excited", tier: 2 }), veryExcited: p({ style: "white", scaleX: 1.18, scaleY: 1.25, pupilScale: 1.1, highlight: "single", brow: "veryRaised", tier: 2 }),
  sparkleExcited: p({ style: "sparkle", scaleX: 1.25, scaleY: 1.38, pupilScale: 1.25, highlight: "sparkle", brow: "veryRaised", tier: 3 }), sparkleCute: p({ style: "sparkle", scaleX: 1.18, scaleY: 1.3, pupilScale: 1.35, highlight: "sparkle", brow: "innerRaised", tier: 3 }), pleading: p({ style: "sparkle", scaleX: 1.12, scaleY: 1.24, pupilScale: 1.28, highlight: "double", brow: "innerRaised", tier: 2 }), animeCute: p({ style: "sparkle", scaleX: 1.16, scaleY: 1.28, pupilScale: 1.22, highlight: "double", brow: "soft", tier: 3 }),
  proud: p({ openness: .82, rotation: 2, brow: "raised", tier: 1 }), smug: p({ openness: .58, rotation: 3, brow: "cunning", tier: 1 }),
  closed: p({ style: "closed", openness: 0 }), curiousLeft: p({ brow: "curious" }), curiousMiddle: p({ brow: "curious" }), curiousRight: p({ brow: "curious" }), lookLeft: p({}), lookRight: p({}),
};

export const browPresets: Exclude<BrowPreset, "auto">[] = ["neutral", "soft", "raised", "veryRaised", "innerRaised", "outerRaised", "sad", "concerned", "worried", "curious", "suspicious", "cunning", "angry", "veryAngry", "serious", "determined", "excited", "animeAngry"];

export function expressionForSide(expression: EyeExpression, side: "left" | "right") {
  if (expression === "winkLeft" && side === "left" || expression === "winkRight" && side === "right") return "happyClosed" as EyeExpression;
  if (expression === "winkLeft" || expression === "winkRight") return "friendly" as EyeExpression;
  return expression;
}
