import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
await p.addInitScript(() => { try { localStorage.setItem('gb.onboarding', JSON.stringify({ done: true })); } catch (_) {} });
await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(1500);
await p.evaluate(() => go('terminal')); await p.waitForTimeout(600); await p.screenshot({ path: '../shots37/term38.png' });
await p.evaluate(() => { go('tutor'); }); await p.waitForTimeout(900);
await p.evaluate(async () => { TUTOR38.subjects=[{id:'s',goal:'Why binary search is O(log n)',plan:{nodes:[{id:'n1',title:'Halving',deps:[],status:'known',why:''},{id:'n2',title:'Logarithms',deps:['n1'],status:'shaky',why:''},{id:'n3',title:'Recurrences',deps:['n2'],status:'unknown',why:''}],probes:[]},props:[{text:'Each comparison halves the range.',premises:['the list is sorted']}],measured:true,illustrate:true}];TUTOR38.cur='s';tutorRender38(); });
await p.waitForTimeout(400); await p.screenshot({ path: '../shots37/tutor38.png' }); await b.close();
