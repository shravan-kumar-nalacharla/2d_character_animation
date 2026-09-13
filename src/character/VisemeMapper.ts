import type { LanguageCode, ProductionViseme } from "../project/schema";

export class VisemeMapper {
  static fromUnit(unit: string, _language: LanguageCode): ProductionViseme {
    const vowels: Record<string, ProductionViseme> = { aa: 'AA', ee: 'EEI', oo: 'OOW', oh: 'OH', uh: 'UH', ai: 'AEE', au: 'OH', ae: 'AEE' };
    if (vowels[unit]) return vowels[unit];
    if (unit === 'ph') return _language === 'en' ? 'FV' : 'MBP';
    if (unit === 'ng') return 'KG';
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

// Offline fallback only; provider-supplied phonemes take precedence in the planner.
// ponytail: pronunciation exceptions cover common direction words, not a full dictionary.
const pronunciations: Record<string, string[]> = {
  you: ['y','oo'], your: ['y','oh','r'], the: ['th','uh'], three: ['th','r','ee'],
  one: ['w','uh','n'], two: ['t','oo'], things: ['th','i','ng','z'],
  know: ['n','oh'], "don't": ['d','oh','n','t'], said: ['s','e','d'],
  have: ['h','a','v'], phone: ['f','oh','n'], hello: ['h','e','l','oh'],
  people: ['p','ee','p','uh','l'], are: ['aa','r'], love: ['l','uh','v'],
  me: ['m','ee'], we: ['w','ee'], be: ['b','ee'], he: ['h','ee'], she: ['sh','ee'],
  these: ['th','ee','z'], give: ['g','i','v'], live: ['l','i','v'], please: ['p','l','ee','z'],
};
export function pronunciationUnits(text: string, language: LanguageCode) {
  let word = text.toLowerCase().replace(/[’]/g, "'");
  if (language === 'en' && pronunciations[word]) return pronunciations[word];
  if (language === 'en') {
    word = word.replace(/^kn/, 'n').replace(/^wr/, 'r').replace(/tion/g, 'shun').replace(/c(?=[eiy])/g,'s').replace(/c/g,'k').replace(/qu/g,'kw').replace(/x/g,'ks');
    if (word.length > 3 && /[bcdfgjklmnpqrstvxz]e$/.test(word)) word = word.replace(/a(?=[^aeiou]e$)/,'ai').replace(/o(?=[^aeiou]e$)/,'oo').slice(0,-1);
  }
  // Virama suppresses the inherent vowel; combining vowel signs supply their own vowel.
  const units = word.match(/ch|sh|th|ph|bh|dh|kh|gh|ng|aa|ee|oo|ai|au|[a-z]|[\u0900-\u097f]|[\u0c00-\u0c7f]/g) ?? [];
  const output: string[] = [];
  units.forEach((unit,index) => {
    if (/[़्్]/.test(unit)) return;
    output.push(unit);
    if (/[क-हక-హ]/.test(unit) && units[index+1] && !/[ािीुूृेैोौ्ిీుూృెేైొోౌా్]/.test(units[index+1])) output.push('a');
  });
  return output;
}
