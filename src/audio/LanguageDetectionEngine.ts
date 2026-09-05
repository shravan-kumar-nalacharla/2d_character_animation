import type { LanguageCode, TimedTranscript, TranscriptWord } from "../project/schema";

const hindi = new Set("aaj accha acha bahut bhai bilkul hai ho hum kar kya kaise kyun mujhe nahi pata raha rahi tune tum ye yeh diya wale hain main mera meri mat kab kaha chalo".split(" "));
const telugu = new Set("adi anna ayinda ayyinda avtunda chala cheppu ee enti enduku ga idi ippudu kada ledu naku nenu nijamga ra undi veldam work avthundi telidu thelidu em ala mana meeru nuvvu".split(" "));
const english = new Set("a about actually are bro crazy doing feature guys hello how i insane is it main no okay really something the this today video wait what why work you your".split(" "));

export class LanguageDetectionEngine {
  detect(transcript: TimedTranscript): TimedTranscript {
    const segments = transcript.segments.map((segment) => {
      const direct = segment.words.map((word) => classify(word.text));
      const dominant = dominantLanguage(direct.map((item) => item.language));
      const words = segment.words.map((word, index) => ({ ...word, language: direct[index].confidence > 0 ? direct[index].language : dominant, script: direct[index].script }));
      return { ...segment, words, language: dominantLanguage(words.map((word) => word.language)) };
    });
    const languages = new Set(segments.flatMap((segment) => segment.words.map((word) => word.language)));
    return { ...transcript, language: languages.size > 1 ? [...languages].sort().join("+") : [...languages][0] ?? transcript.language, segments };
  }
}

export function detectWordLanguage(text: string): Pick<TranscriptWord, "language" | "script"> & { confidence: number } {
  return classify(text);
}

function classify(text: string): { language: LanguageCode; script: TranscriptWord["script"]; confidence: number } {
  if (/[\u0C00-\u0C7F]/u.test(text)) return { language: "te", script: "native", confidence: 1 };
  if (/[\u0900-\u097F]/u.test(text)) return { language: "hi", script: "native", confidence: 1 };
  const token = text.toLocaleLowerCase().replace(/[^a-z]/g, "");
  if (telugu.has(token)) return { language: "te", script: "romanized", confidence: 0.9 };
  if (hindi.has(token)) return { language: "hi", script: "romanized", confidence: 0.9 };
  if (english.has(token) || token.length > 3) return { language: "en", script: "latin", confidence: english.has(token) ? 0.85 : 0.2 };
  return { language: "en", script: "latin", confidence: 0 };
}

function dominantLanguage(languages: LanguageCode[]): LanguageCode {
  const counts = languages.reduce((result, language) => result.set(language, (result.get(language) ?? 0) + 1), new Map<LanguageCode, number>());
  return (["te", "hi", "en"] as LanguageCode[]).reduce((best, language) => (counts.get(language) ?? 0) > (counts.get(best) ?? 0) ? language : best, "en");
}
