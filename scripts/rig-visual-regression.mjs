// Run after BODY_QA=1 node scripts/body-render-smoke.mjs.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const update=process.argv.includes('--update');
await mkdir('tests/visual/body',{recursive:true});
for(const mode of ['hoodie','stick']) {
  const actual=`.temp/body-validation/${mode}-regression.png`, expected=`tests/visual/body/${mode}.png`;
  execFileSync('ffmpeg',['-v','error','-y','-i',`.temp/body-validation/${mode}.mp4`,'-vf',"select='eq(mod(n,120),0)+eq(mod(n,120),18)+eq(mod(n,120),42)',scale=320:180,tile=6x3",'-frames:v','1',actual]);
  if(update) await copyFile(actual,expected);
  const hash=data=>createHash('sha256').update(data).digest('hex');
  if(hash(await readFile(actual))!==hash(await readFile(expected))) throw new Error(`${mode} visual regression: inspect ${actual} against ${expected}`);
  console.log(`${mode}: 18 sampled frames match reviewed baseline`);
}
