import type { EyeExpression } from "../project/schema";

export const modularExpressionSlugs = [
  "confident-grin", "serious-tired", "shocked-alert", "angry-gritted-teeth", "calm-knowing-smile",
  "rage-scream", "intense-shadow-stare", "power-rage", "soft-surprise", "soft-toothy-grin",
  "soft-cheerful-open-smile", "extreme-eye-shock", "stern-focused", "narrowed-suspicious", "neutral-attentive",
  "happy-closed-eye-smile", "sad-teary", "crying-breakdown", "worried-anxious", "scared-terrified",
  "confused", "disgusted", "embarrassed-blush", "excited-delight", "sleepy-drowsy", "bored-unimpressed",
  "mischievous-smirk", "determined-heroic", "laughing-hard", "pain-wince",
] as const;
export type ModularExpressionSlug = typeof modularExpressionSlugs[number];
export type ModularFacePart = "left-eye" | "right-eye" | "left-eyebrow" | "right-eyebrow" | "mouth" | "face-shading";

const root = "/production_character/v2/face/expressions";
const expressionNumber = new Map(modularExpressionSlugs.map((slug, index) => [slug, String(index + 1).padStart(2, "0")]));

export function modularExpressionUrl(slug: ModularExpressionSlug, part: ModularFacePart) {
  return `${root}/${part}/${expressionNumber.get(slug)}-${slug}_${part}.png`;
}

const expressionMap: Partial<Record<EyeExpression, ModularExpressionSlug>> = {
  neutral: "neutral-attentive", friendly: "soft-toothy-grin", soft: "calm-knowing-smile", happy: "soft-cheerful-open-smile",
  happyClosed: "happy-closed-eye-smile", laughClosed: "laughing-hard", closedSoft: "happy-closed-eye-smile", closed: "happy-closed-eye-smile",
  blink: "happy-closed-eye-smile", winkLeft: "mischievous-smirk", winkRight: "mischievous-smirk", sad: "sad-teary",
  verySad: "sad-teary", teary: "sad-teary", crying: "crying-breakdown", sobCrying: "crying-breakdown",
  concerned: "worried-anxious", worried: "worried-anxious", nervous: "worried-anxious", fear: "scared-terrified",
  panic: "scared-terrified", shock: "shocked-alert", shocked: "shocked-alert", extremeShock: "extreme-eye-shock",
  animeShock: "extreme-eye-shock", curious: "confused", curiousLeft: "confused", curiousMiddle: "confused", curiousRight: "confused",
  confused: "confused", thinking: "calm-knowing-smile", suspicious: "narrowed-suspicious", cunning: "mischievous-smirk",
  smug: "mischievous-smirk", unimpressed: "bored-unimpressed", bored: "bored-unimpressed", deadpan: "bored-unimpressed",
  tired: "serious-tired", sleepy: "sleepy-drowsy", serious: "stern-focused", focused: "stern-focused",
  coldGlare: "intense-shadow-stare", shadowRage: "intense-shadow-stare", determined: "determined-heroic",
  animeDetermined: "determined-heroic", proud: "confident-grin", angry: "angry-gritted-teeth", angrySqueezed: "power-rage",
  veryAngry: "power-rage", rage: "rage-scream", disgusted: "disgusted", annoyed: "disgusted",
  embarrassed: "embarrassed-blush", awkward: "embarrassed-blush", excited: "excited-delight", veryExcited: "excited-delight",
  sparkleExcited: "excited-delight", sparkleCute: "excited-delight", animeCute: "soft-toothy-grin", pleading: "sad-teary",
  lookLeft: "neutral-attentive", lookRight: "neutral-attentive",
};

export function modularExpressionFor(expression: EyeExpression): ModularExpressionSlug {
  return expressionMap[expression] ?? "neutral-attentive";
}
