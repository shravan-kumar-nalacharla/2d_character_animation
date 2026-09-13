// Start pnpm dev first. Exercises the real shared viewport through Remotion.
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:4173';
const loader = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const { createDefaultProject } = await loader.ssrLoadModule('/src/project/project.ts');
const { bodyPerformanceTracks } = await loader.ssrLoadModule('/src/animation/BodyPerformance.ts');
await mkdir('.temp/body-validation', { recursive: true });
try {
  for (const mode of ['stick','hoodie']) {
    const project = createDefaultProject(); project.character.mode=mode; project.stage.duration=process.env.BODY_QA?24:4;
    const segment = { id:'demo',start:0,end:4,text:'Three things',emotion:{primary:'happy',intensity:.8},intent:'explanation',expression:{preset:'happy',intensity:.8,transitionIn:.2,transitionOut:.3},gaze:{target:'camera',intensity:.4},headEvents:[],bodyEvents:[],eyebrowEvents:[],accents:[],direction:{gesture:mode==='stick'?'walk':'folded-arms'} };
    project.character.view=process.env.BODY_QA?'front':mode==='stick'?'right':'front';
    const segments=process.env.BODY_QA?['thinking','wave','folded-arms','explain-both','point-left','walk'].map((gesture,index)=>({...segment,id:`qa-${index}`,start:index*4,end:index*4+4,direction:{gesture,headDirection:index===0?-18:index===1?18:0,characterView:gesture==='walk'?'right':undefined}})):[segment];
    project.animation.tracks=bodyPerformanceTracks({version:1,provider:'rule-based',promptVersion:'v1',overall:{language:'en',mood:'happy',energy:.8,speakingStyle:'normal'},segments},{...project.performanceProfile,gestureFrequency:process.env.BODY_QA?1:project.performanceProfile.gestureFrequency});
    await writeFile(`.temp/body-validation/${mode}.json`,JSON.stringify(project,null,2));
    const settings={renderer:'remotion',format:'mp4',width:960,height:540,fps:30,quality:'High',background:'project',color:'#E8EDF2',fit:'Fit',includeAudio:false,keepFrames:true,concurrency:2};
    let response=process.env.BODY_RESUME_ID && mode==='stick' ? await fetch(`${base}/api/render/${process.env.BODY_RESUME_ID}`) : await fetch(`${base}/api/render`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project,settings})});
    if(!response.ok) throw new Error(await response.text());
    let job=await response.json(); console.log(`${mode}: ${job.id}`);
    const deadline=Date.now()+600000; let previous='';
    while(!['completed','failed','cancelled'].includes(job.status)) {
      if(Date.now()>deadline) throw new Error('Body render timed out');
      await new Promise(resolve=>setTimeout(resolve,1500));
      try { job=await fetch(`${base}/api/render/${job.id}`).then(r=>r.json()); } catch { continue; }
      if(job.status!==previous) { console.log(`${mode}: ${job.status}`); previous=job.status; }
    }
    if(job.status!=='completed') throw new Error(job.error || job.status);
    const media=await fetch(`${base}${job.downloadUrl}`).then(r=>r.arrayBuffer());
    if(media.byteLength<10000) throw new Error('Rendered media is unexpectedly small');
    await writeFile(`.temp/body-validation/${mode}.mp4`,new Uint8Array(media));
    console.log(`${mode}: ${job.totalFrames} frames, ${media.byteLength} bytes`);
  }
} finally { await loader.close(); }
