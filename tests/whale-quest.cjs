// Run actual quest and Kraken logic with a small UI/world harness.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const section = (a,b) => { const start=html.indexOf(a), end=html.indexOf(b,start); assert(start>=0 && end>start); return html.slice(start,end); };
function game(){
 const elements = new Map(), events=[], messages=[];
 const c = vm.createContext({Math, setTimeout:fn=>fn(), METERS:40, TAU:Math.PI*2, time:10, mode:'ocean', paused:false,
  save:{board:[{kind:'pearls',need:10,start:0},{kind:'bottle',x:10000,y:0},{kind:'treasure',x:20000,y:0}]},
  ocean:{x:0,y:0,depth:0,ang:0}, leagueGuide:true, homeGuide:true, ptr:{}, KRAKEN:{x:-900,y:3500}, JUNK:{x:9000,y:9000,floor:20},
  $:id=>{ if(!elements.has(id)) elements.set(id,{hidden:true,textContent:'',innerHTML:'',classList:{add(){},remove(){}},addEventListener(event,fn){this[event]=fn;}}); return elements.get(id); },
  groundAt:()=>-10, depthAt:()=>20, onLeagueCourse:()=>false, LANDMARKS:[{name:'Island',x:30000,y:0}],
  persist(){events.push('persist');},flushCloud(){}, addCoins(n){events.push(['coins',n]);},addXP(){},sfx(){},
  banner(...m){messages.push(m);},say(...m){messages.push(m);},sideWord:()=> 'ahead',htmlText:t=>t,
  resetPick(){},showPick(){},graceAfterPause(){},initAudio(){},
  leagueDone:id=>(c.save.bosses||[]).includes(id),leagueWin:id=>{c.save.bosses=[...(c.save.bosses||[]),id];},
 });
 vm.runInContext(section('function mergeSaves(', '/* Moving a swimmer'),c);
 vm.runInContext(section('const QUEST_KIND =','// the quest things you can see:'),c);
 vm.runInContext(section('const JUNK_ITEMS =','function leagueStep('),c);
 const run=s=>vm.runInContext(s,c);
 return {c,run,elements,events,messages};
}
function finish(g,kind){
 const {c,run}=g; c.paused=false;
 let q=c.save.board.find(q=>q.kind===kind); assert(q,kind+' exists');
 if(kind==='calf'){
  c.ocean.x=q.x;c.ocean.y=q.y;run('questStep(ocean, 0)');assert.equal(q.state,'lead');
  q.x=q.mx;q.y=q.my;c.ocean.x=q.mx;c.ocean.y=q.my;run('questStep(ocean, 0)');
 } else {
  for(const sh of q.shells){c.ocean.x=sh.x;c.ocean.y=sh.y;run('questStep(ocean, 0)');}
 }
 assert(c.save.whaleQuest[kind]);
}
for(const order of [['calf','shells'],['shells','calf']]){
 const g=game(),{c,run,elements,events}=g;
 run('whaleTalk(ocean, {})'); assert.equal(c.paused,true); assert.equal(elements.get('questPanel').hidden,false);
 assert.equal(c.save.board.length,3); assert.equal(c.save.board.filter(q=>['calf','shells'].includes(q.kind)).length,2);
 assert.match(elements.get('qpWhale').innerHTML,/Find my baby/);assert.match(elements.get('qpWhale').innerHTML,/Sun Stone/);
 assert.match(elements.get('qpList').innerHTML,/data-quest="0"|data-quest="1"|data-quest="2"/);
 const board=JSON.stringify(c.save.board);run('closeQuests(); whaleTalk(ocean, {})');assert.equal(JSON.stringify(c.save.board),board,'Talking twice preserves progress');
 finish(g,order[0]);assert(!c.save.whaleQuest.reward,'One task cannot grant the prize');
 // Save and reload between objectives.
 c.save=JSON.parse(JSON.stringify(c.save));finish(g,order[1]);
 assert(c.save.whaleQuest.reward);assert.equal(c.ocean.held,'sunstone');
 assert.equal(events.filter(e=>Array.isArray(e)&&e[0]==='coins').reduce((s,e)=>s+e[1],0),450);
 c.ocean.held=null;run('awardWhalePrize(ocean)');assert.equal(c.ocean.held,null,'Prize only awarded once');
 run('openQuests()'); elements.get('qpWhale').click({target:{closest:()=>true}});assert.equal(c.ocean.held,'sunstone');assert.equal(c.paused,false);
 c.ocean.x=0;c.ocean.y=0;run('useOnKraken()');assert.equal(run('kr.hits'),0,'Cannot attack remotely');
 c.ocean.x=c.KRAKEN.x+10*40;c.ocean.y=c.KRAKEN.y;
 for(let i=0;i<3;i++){c.time+=3;run('useOnKraken()');}
 assert(c.save.bosses.includes('kraken'));assert.equal(c.ocean.held,null);assert.equal(run('kr.hits'),3);
 console.log('Passed:',order.join(' then '),'→ saved prize → equip → defeat Kraken');
}
{
 const {c,run,elements}=game();run('whaleTalk(ocean,{})');c.paused=false;
 const calf=c.save.board.find(q=>q.kind==='calf');calf.state='lead';calf.x=1234;
 const sh=c.save.board.find(q=>q.kind==='shells');sh.got=1;sh.shells[0].got=true;
 run('whaleTalk(ocean,{})');assert.equal(calf.x,1234);assert.equal(sh.got,1);
 c.leagueGuide=true;run('renderQuests()');assert(!elements.get('qpList').innerHTML.includes('The gold arrow is showing this one.'));
 elements.get('qpList').click({target:{closest:()=>({dataset:{quest:c.save.board.indexOf(calf)}})}});
 assert.equal(c.leagueGuide,false);assert.equal(c.homeGuide,false);assert.equal(c.paused,false);
 const merged=run('mergeSaves({xp:10,whaleQuest:{started:true,calf:true}},{xp:0,whaleQuest:{shells:true,reward:true}})');
 assert(merged.whaleQuest.calf && merged.whaleQuest.shells && merged.whaleQuest.reward);
 console.log('Passed: partial progress, active quest navigation, and cross-device reward merge');
}
