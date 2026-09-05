import type { LanguageCode, ProductionViseme } from "../project/schema";

export class VisemeMapper {
  static fromUnit(unit: string, _language: LanguageCode): ProductionViseme {
    if (/[mbp]|[पबम]|[పబమ]/.test(unit)) return "MBP";
    if (/[fv]|[फवफ़]|[ఫవ]/.test(unit)) return "FV";
    if (/l|[लळ]|[లళ]/.test(unit)) return "L";
    if (/r|[रऱ]|[రఱ]/.test(unit)) return "R";
    if (/ch|j|sh|zh|[चछजझशष]|[చఛజఝశష]/.test(unit)) return "CHJSH";
    if (/[sz]|[सज़]|[స]/.test(unit)) return "SZ";
    if (/[tdn]|th|dh|[तथदधनटठडढण]|[తథదధనటఠడఢణ]/.test(unit)) return "TDN";
    if (/[kgh]|kh|gh|[कखगघह]|[కఖగఘహ]/.test(unit)) return "KG";
    if (/ee|[iy]|[इईिी]|[ఇఈిీ]/.test(unit)) return "EEI";
    if (/oo|w|[ऊू]|[ఊూ]/.test(unit)) return "OOW";
    if (/[u]|[उुऋृ]|[ఉుృ]/.test(unit)) return "UH";
    if (/o|[ओऔोौ]|[ఒఓఔొోౌ]/.test(unit)) return "OH";
    if (/e|ae|ai|[एऐेै]|[ఎఏఐెేై]/.test(unit)) return "AEE";
    if (/aa?|[अआा]|[అఆా]/.test(unit)) return "AA";
    if (/[\u0900-\u097f\u0c00-\u0c7f]/.test(unit)) return "AA";
    return "REST";
  }
}
