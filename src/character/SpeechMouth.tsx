import { useId } from 'react';
import type { FaceState, ProductionViseme } from '../project/schema';

export function mouthEmotion(expression: string) {
  return { smile: /happy|excited|amused|friendly|proud|smug/i.test(expression) ? .8 : /sad|cry|worried|tired|fear/i.test(expression) ? -.65 : 0,
    tension: /angry|rage|frustrated|panic|scared|fear/i.test(expression) ? .9 : 0, asymmetry: /smug|suspicious|thinking/i.test(expression) ? .3 : 0 };
}
/** Stable topology: phonetic opening and emotional corners are independent. */
export function speechMouthGeometry(face: FaceState, viseme: ProductionViseme) {
  const expression = face.eyeSystem.left.expression === 'inherit' ? face.eyeExpression : face.eyeSystem.left.expression;
  const emotion = mouthEmotion(expression), smile = face.mouthSmile ?? emotion.smile, tension = face.mouthTension ?? emotion.tension;
  const press = viseme === 'MBP' || viseme === 'REST', width = 22 * (1 + (face.mouthWidth ?? 0) * .22 - (face.lipRound ?? 0) * .48);
  const opening = press ? .35 : Math.max(2, (face.jawOpen ?? .4) * 17 * (1 + tension * .12));
  const corner = -smile * 5, asymmetry = emotion.asymmetry * 5;
  return { width, opening, path: `M ${-width} ${corner} C ${-width*.6} ${-opening*.4} ${width*.6} ${-opening*.4} ${width} ${corner+asymmetry} C ${width*.7} ${opening} ${-width*.7} ${opening} ${-width} ${corner} Z` };
}
export function SpeechMouth({ face, viseme }: { face: FaceState; viseme: ProductionViseme }) {
  const id = useId().replace(/:/g, ''), shape = speechMouthGeometry(face, viseme);
  return <g data-face-part="speech-mouth"><defs><clipPath id={`mouth-${id}`}><path d={shape.path} /></clipPath></defs><path d={shape.path} fill="#3c1018" stroke="#241518" strokeWidth="1.8" strokeLinejoin="round" />
    <g clipPath={`url(#mouth-${id})`}>
      <path d={`M -28 -10 H 28 V ${viseme === 'FV' ? shape.opening*.7 : 2} Q 0 5 -28 1 Z`} fill="#fff9ed" />
      {['L','AA','AEE','TDN'].includes(viseme) && <ellipse cx="0" cy={viseme === 'L' ? 3 : shape.opening+1} rx="13" ry={viseme === 'L' ? 7 : 6} fill="#d47d7f" />}
    </g>
  </g>;
}
