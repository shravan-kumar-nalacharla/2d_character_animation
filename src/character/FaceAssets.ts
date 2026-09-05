import type { EyeExpression, MouthShape, ProductionViseme } from "../project/schema";

export const productionVisemes: ProductionViseme[] = ["REST", "MBP", "FV", "L", "TDN", "KG", "CHJSH", "SZ", "R", "AA", "AEE", "EEI", "UH", "OH", "OOW"];
export const eyeExpressions: EyeExpression[] = ["neutral", "friendly", "soft", "happy", "happyClosed", "laughClosed", "closedSoft", "blink", "closed", "sad", "verySad", "concerned", "worried", "curious", "confused", "thinking", "suspicious", "cunning", "unimpressed", "bored", "deadpan", "serious", "focused", "determined", "coldGlare", "angry", "angrySqueezed", "veryAngry", "rage", "shadowRage", "disgusted", "annoyed", "shock", "shocked", "extremeShock", "panic", "fear", "nervous", "awkward", "tired", "sleepy", "excited", "veryExcited", "sparkleExcited", "sparkleCute", "pleading", "embarrassed", "proud", "smug", "animeDetermined", "animeShock", "animeCute", "teary", "crying", "sobCrying", "winkLeft", "winkRight"];

export const legacyViseme: Record<string, ProductionViseme> = {
  closed: "REST", m: "MBP", f: "FV", l: "L", teeth: "TDN", wide: "AEE",
  aa: "AA", ee: "EEI", uh: "UH", oh: "OH", smile: "AEE", frown: "REST",
};

export function productionViseme(shape: MouthShape): ProductionViseme { return legacyViseme[shape] ?? shape as ProductionViseme; }

export const mouthPackBase = "/production_character/illustrator2024/face/mouths/v3";
