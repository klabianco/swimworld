// Exercise gameplay math without WebGL or a saved player account.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const start=html.indexOf('const SURF ='), end=html.indexOf('function updOcean(dt)',start);
const button={firstChild:{},lastChild:{},addEventListener(){}};
const shoreWorld={ISL:400,HOUSE:{x:1200,y:1800,r:360},neighbors:[{house:{x:2400,y:1800}}],CAT:{A:26,B:10},catLocal:(x,y)=>[(x+4000)/40,(y+4000)/40],EAGLE:{x:9000,y:9000,r:3}};
const ctx=vm.createContext({...shoreWorld,Math,time:0,U:1/40,mode:'ocean',paused:false,ocean:null,$:()=>button,coach(){},wantHeading:()=>null,angDiff:(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),clamp:(x,a,b)=>Math.max(a,Math.min(b,x))});
vm.runInContext(html.slice(start,end)+'\nthis.api={shoreFactor,SURF,swellAt,surfStep,canSurf,toggleSurf};',ctx);
const {shoreFactor,SURF,swellAt,surfStep,canSurf,toggleSurf}=ctx.api;
const o={x:40000,y:0,vx:0,vy:0,ang:Math.atan2(SURF.dz,SURF.dx),depth:0};ctx.ocean=o;
assert(canSurf(o));toggleSurf();assert(o.surfing);
let riding=0;
for(let i=0;i<1800;i++){ctx.time=i/60;surfStep(o,1/60);if(o.surfCaught)riding++;assert(Number.isFinite(o.x)&&Number.isFinite(o.y));}
assert(riding>600,`Expected at least ten seconds carried by waves; got ${riding/60}`);
assert(o.surfDistance>40);toggleSurf();assert(!o.surfing);
for(const extra of [{onLand:true},{vehicle:'kayak'},{ride:{}},{grapple:{}},{jumpY:2},{depth:1}])assert(!canSurf({...o,...extra}));
for(let i=0;i<30;i++){const x=1000+i*1.27,z=i*.93,t=i*.18,e=.001;
 const a=swellAt(x,z,t), derivative=(swellAt(x+SURF.dx*e,z+SURF.dz*e,t).height-swellAt(x-SURF.dx*e,z-SURF.dz*e,t).height)/(2*e);
 assert(Math.abs(a.slope-derivative)<1e-7);
 assert(Math.abs(a.height-swellAt(x+SURF.dx*SURF.speed,z+SURF.dz*SURF.speed,t+1).height)<1e-8);
}
console.log(`Surf checks passed: ${(riding/60).toFixed(1)} seconds riding, ${o.surfDistance.toFixed(1)} meters; eligibility, exit, slope and swell speed verified.`);

for(const [cx,cz,r] of [[0,0,12],[30,45,10.5],[60,45,10.5],[-100,-100,10],[225,225,3]]){
 for(let j=0;j<36;j++){ const a=j*Math.PI/18,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
  assert.equal(shoreFactor(x,z),0,'No waves on island bounds');
  for(let t=0;t<12;t+=.25) assert(Math.abs(swellAt(x,z,t).height)<1e-12);
 }
}
assert.equal(shoreFactor(-126,-100),0,'Protect long end of Catalina');
assert.equal(shoreFactor(1000,0),1,'Keep full offshore swell');
let previous=0; for(let x=14;x<=26;x+=.1){const factor=shoreFactor(-x,0);assert(factor>=previous);previous=factor;}
console.log('Shore checks passed: pool, home, neighbor, Catalina, Eagle Rock and gradual offshore recovery.');
