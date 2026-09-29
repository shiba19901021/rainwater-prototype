const $=id=>document.getElementById(id);
$('explore-drawing').innerHTML=engineeringDiagram('explore',true);
$('flow-drawing').innerHTML=engineeringDiagram('flow',false);
const exploration=$('explore-drawing').querySelector('svg');
let selected=null;
function highlight(key){
 exploration.classList.toggle('has-highlight',Boolean(key));
 exploration.querySelectorAll('.device').forEach(g=>g.classList.toggle('lit',g.dataset.part===key));
 const box=exploration.querySelector('.callout');box.toggleAttribute('hidden',!key);if(!key)return;
 const part=EQUIPMENT[key], [x,y]=part.anchor;
 // Leaders terminate in reserved blank space at the right of the system.
 const bend=Math.max(590,x+22);
 box.querySelector('.leader').setAttribute('d',`M${x} ${y}Q${bend} ${y} ${bend} 420L650 420M${x+7} ${y-5}L${x} ${y}L${x+7} ${y+5}`);
 box.querySelector('.callout-name').textContent=part.name;box.querySelector('.callout-brief').textContent=part.brief;
}
function selectPart(key){selected=key;const p=EQUIPMENT[key];$('part-title').textContent=p.name;$('part-what').textContent=p.what;$('part-why').textContent=p.why;exploration.querySelectorAll('.device').forEach(g=>g.setAttribute('aria-pressed',String(g.dataset.part===key)));highlight(key)}
exploration.querySelectorAll('.device').forEach(g=>{
 g.addEventListener('pointerenter',()=>highlight(g.dataset.part));g.addEventListener('pointerleave',()=>highlight(selected));
 g.addEventListener('focus',()=>highlight(g.dataset.part));g.addEventListener('blur',()=>highlight(selected));
 g.addEventListener('click',()=>selectPart(g.dataset.part));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPart(g.dataset.part)}if(e.key==='Escape'){selected=null;highlight(null)}});
});
const story=[
 {label:'通行空間',title:'下雨了，還是要走這裡。',body:'右下方是樓梯，前方是通往教室的走道。學生在雨天也需要使用這段通行空間。',question:'先找到：學生會從哪裡走過去？',path:'M1524 997L1330 987L1193 1090L834 933L572 1004L1017 1143L1524 1143Z',caption:'樓梯與走道，是這段遮雨設施原本服務的地方。'},
 {label:'遮雨屋頂',title:'屋頂延伸，讓通行有遮蔽。',body:'原有屋頂與延伸的遮雨屋頂在這裡交接。屋頂讓下方樓梯和走道得到遮蔽，但雨水仍然需要有去處。',question:'沿著屋簷看：水會往哪裡滴？',path:'M5 130L711 283L832 304L1359 3L1529 4L1529 103L1080 347L686 314L3 229',caption:'左側屋簷與右上方延伸的遮雨屋頂，在中央交接。'},
 {label:'短天溝',title:'短短一段，接住局部屋簷的水。',body:'如果沒有處理，這一段屋簷的雨水會滴到下方通行空間。原本就設置的黑色短天溝，把局部屋面的雨水集中起來。',question:'它原本的任務，是處理通行區上方的滴水。',path:'M680 280L1159 369L1154 407L679 336Z',caption:'黑色短天溝早已存在，不是為雨水回收才新增。'},
 {label:'原排水路徑',title:'原本，集中之後就向右排走。',body:'天溝承接的水經下方灰色管路向右，接入原有排水系統。這是施工前的排水方向，與後來向左接入沉澱系統不同。',question:'水已經集中好了，這是一個可以利用的條件。',path:'M1076 401L1092 426L1267 453L1280 477L1333 527L1524 548',water:true,caption:'藍色水滴示意原有的排水方向：由天溝向右接入排水管。'},
 {label:'想一想',title:'如果現在想留下這些雨水呢？',body:'學校想收集雨水時，我們先到現場觀察，發現這裡原本就集中了一部分屋頂雨水，旁邊也有地方可以放設備。',question:'先看看已經有什麼，再決定要增加什麼。',path:'M680 280L1159 369L1154 407L679 336Z',caption:'先觀察既有設施，再思考收集雨水的方法。'},
 {label:'後來的設計',title:'修好漏水，再讓它多一個功能。',body:'我們修好漏水的接頭，沿用原本的短天溝，再接上沉澱管和 200 L 水桶。不必重做整套集水設備，就能留下雨水，用來澆灌與清洗。',question:'永續設計，有時候是看懂原本的系統。',complete:true,caption:'完成後：既有集水位置，加上沉澱、操作閥與儲水系統。'}
];
let storyIndex=0;
story.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.label;b.onclick=()=>showStory(i);$('story-steps').append(b)});
function showStory(i){storyIndex=Math.max(0,Math.min(story.length-1,i));const s=story[storyIndex];$('story-kicker').textContent='現場觀察 ／ '+s.label;$('story-title').textContent=s.title;$('story-body').textContent=s.body;$('story-question').textContent=s.question;$('story-caption').textContent=s.caption;$('story-count').textContent=`${storyIndex+1} / ${story.length}`;$('story-prev').disabled=storyIndex===0;$('story-next').disabled=storyIndex===story.length-1;$('story-next').textContent=storyIndex===4?'看看後來的設計 →':'下一步 →';
 const image=$('story-image');image.src=s.complete?'photos/system.jpeg':'photos/courtyard-before.png';image.alt=s.complete?'完成後的嘉北國小雨水收集設備':'施工前全景：'+s.caption;image.parentElement.classList.toggle('annotating',!s.complete);$('story-highlight').setAttribute('d',s.path||'');$('story-water').style.visibility=s.water?'visible':'hidden';
 Array.from($('story-steps').children).forEach((b,j)=>{if(j===storyIndex)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
}
$('story-prev').onclick=()=>showStory(storyIndex-1);$('story-next').onclick=()=>showStory(storyIndex+1);showStory(0);
let state=RainModel.create();
const flowSvg=$('flow-drawing').querySelector('svg');
const flows=Object.fromEntries(Array.from(flowSvg.querySelectorAll('[data-flow]')).map(n=>[n.dataset.flow,n]));
const waters=Object.fromEntries(Array.from(flowSvg.querySelectorAll('[data-water]')).map(n=>[n.dataset.water,n]));
// A visual teaching layer only: it never changes RainModel or pipe geometry.
const debrisLayer=document.createElementNS('http://www.w3.org/2000/svg','g');
debrisLayer.setAttribute('pointer-events','none');
debrisLayer.setAttribute('aria-hidden','true');
flowSvg.querySelector('.water-layer').append(debrisLayer);
const debrisNodes=Array.from({length:28},(_,i)=>{
 const n=document.createElementNS('http://www.w3.org/2000/svg','path');
 const r=i%3===0?5:4;
 n.dataset.grain=`M-${r} 0a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 -${r*2} 0`;
 n.setAttribute('stroke','#fff');n.setAttribute('stroke-width','1');
 debrisLayer.append(n);return n;
});
const debrisLengths=Object.fromEntries(['inlet','falling','drain','collect'].map(k=>[k,flows[k].getTotalLength()]));
let debrisClock=0, debrisInTank=false, debrisSpawn=0, debrisSerial=0;
let particles=[];
const debrisBranch=debrisLengths.inlet-39;
function updateDebris(dt){
 const s=state, dirty=s.rain&&s.rinse<8;
 debrisClock+=dt;
 if(s.rain){
  debrisSpawn+=dt;
  const interval=dirty?.35:4;
  if(debrisSpawn>=interval){
   debrisSpawn=0;
   if(particles.length<24){
    const leaf=debrisSerial%4===0&&particles.filter(p=>p.leaf).length<3;
    particles.push({id:debrisSerial++,leaf,stage:'inlet',pos:0,dirty});
   }
  }
 }else debrisSpawn=0;
 for(const p of particles){
  if(p.stage==='inlet'){
   if(!s.rain){p.dead=true;continue;}
   const next=p.pos+dt*160;
   // Some incoming impurities follow an established collection flow, regardless
   // of shape. Otherwise all continue down; none wait for the water to rise.
   if(p.id%3===0&&p.dirty&&s.closed&&s.column>=1&&s.rinse<8&&p.pos<=debrisBranch&&next>=debrisBranch){p.stage='collect';p.pos=0;}
   else if(next>=debrisLengths.inlet){p.stage='column';p.pos=377;}
   else p.pos=next;
  }else if(p.stage==='column'){
   const wet=s.rain||s.column>0;
   if(!s.closed&&wet){
    p.pos+=dt*145;
    if(p.pos>=628){p.stage='drain';p.pos=0;}
   }else if(s.closed){
    const surface=675-s.column*401;
    const speed=p.pos<surface&&s.rain?120:24;
    p.pos=Math.min(620,p.pos+dt*speed);
    // A handful of settled symbols represents the deposit, not every grain.
    if(p.pos>=620&&particles.filter(q=>q!==p&&!q.dead&&q.stage==='column'&&q.pos>=620).length>=6)p.dead=true;
   }else p.dead=true;
  }else if(p.stage==='drain'){
   if(!s.closed){
    p.pos+=dt*160;
    if(p.pos>=debrisLengths.drain)p.dead=true;
   }
  }else if(p.stage==='collect'){
   if(!s.closed){
    // Reverse along the same branch before draining; never teleport or stick.
    p.pos=Math.max(0,p.pos-dt*240);
    if(p.pos===0){p.stage='column';p.pos=338;}
   }else if(s.rain||s.tail>0){
    p.pos=Math.min(debrisLengths.collect*s.front,p.pos+dt*140);
    if(p.pos>=debrisLengths.collect&&s.front>=1){
     if(p.dirty&&s.rinse<8)debrisInTank=true;
     p.stage='tank';p.pos=0;
    }
   }else {p.stage='column';p.pos=338;}
  }else if(p.stage==='tank'){
   p.pos=Math.min(1,p.pos+dt*.2);
   if(s.tank<=0)p.dead=true;
  }
 }
 particles=particles.filter(p=>!p.dead);
}
function renderDebris(){
 const s=state;
 debrisNodes.forEach(n=>n.style.display='none');
 let used=0;
 const dot=(x,y,leaf=false)=>{const n=debrisNodes[used++];if(!n)return;n.style.display='';n.setAttribute('d',leaf?'M-12 0Q-2-15 12 0Q2 15-12 0Z M-10 0L9 0':n.dataset.grain);n.setAttribute('fill',leaf?'#ad7834':'#795238');n.setAttribute('transform',`translate(${x} ${y})${leaf?' rotate(35)':''}`);};
 const along=(key,f,leaf=false)=>{const p=flows[key].getPointAtLength(debrisLengths[key]*f);dot(p.x,p.y,leaf);};
 for(const p of particles){
  if(p.stage==='inlet'||p.stage==='drain'||p.stage==='collect')along(p.stage,p.pos/debrisLengths[p.stage],p.leaf);
  else if(p.stage==='column')dot(540+(p.pos>590?(p.id%3-1)*8:0),p.pos,p.leaf);
  else if(p.stage==='tank'&&s.tank>.05){
   const surface=687-s.tank*162;
   dot(355+(p.id%3)*28,Math.min(679,surface+8+p.pos*Math.max(0,671-surface)),p.leaf);
  }
 }
}
$('lab').querySelector('.readout > .small').textContent='動畫中的顆粒、水流與沉澱速度皆為教學示意，不代表實際量測數據。沉澱管提供容納與沉澱空間，不是濾水器，也不會去除所有雜質。目前收集的雨水未經飲用水處理，請用於澆灌與清潔。';
const faucetNodes=Array.from(flowSvg.querySelectorAll('.faucet[data-tap]'));
faucetNodes.forEach((node,i)=>{
 const toggle=()=>{RainModel.tap(state,i);render()};
 node.addEventListener('click',toggle);
 node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
});
const put=(id,text)=>{if($(id).textContent!==text)$(id).textContent=text};
function render(){
 const s=state, collecting=s.rain&&s.closed&&s.column>=1, prompted=s.rain&&!s.closed&&s.rinse>=8;
 put('rainToggle',s.rain?'停止下雨':'開始下雨');$('rainToggle').setAttribute('aria-pressed',String(s.rain));
 $('valveToggle').setAttribute('aria-pressed',String(s.closed));$('valveToggle').setAttribute('aria-label',s.closed?'排水閥目前關閉，點擊打開':'排水閥目前開啟，點擊關閉');$('valveToggle').classList.toggle('prompt',prompted);put('valve-label','排水閥：'+(s.closed?'關':'開'));
 put('rainState','雨：'+(s.rain?'下':'停'));put('valveState','排水閥：'+(s.closed?'關':'開'));
 let title,body;
 if(prompted){title='現在想收水，你會怎麼做？';body='屋頂沖洗得差不多了，看看右下方的紅色排水閥。'}
 else if(!s.closed){title=s.rain?'先讓前段雨水排走':s.column>0?'沉澱管的水正在排出':'平常，排水閥保持開啟';body=s.rain?'雨水由短天溝出發，先向右繞，再折返向左，最後往下經紅色閥門排出。':'沒有新的雨水。打開排水閥可排放沉澱管的積水；桶內已收的水保留。'}
 else if(!s.rain){title=s.tail>0?'雨停了，餘流正在停止':'雨停了，已收的水留下';body='雨停了，屋頂不再送來新的雨水。管內可能還有少量剩餘水流動；不需要繼續收水時，記得打開紅色排水閥。'}
 else if(s.column<1){title='關閥後，沉澱管先蓄水';body='右側管內的水位逐漸上升。還沒達到抬高的管路之前，雨水不會開始流入水桶。'}
 else if(s.front<1){title='越過高位，正在走向桶頂';body='水位達到高點，水開始越過左側支管，再向下流到桶頂。'}
 else{title=s.tank>=1?'桶滿了，多餘雨水排走':'雨水進桶，水位慢慢上升';body=s.tank>=1?'多餘雨水從左側溢流管向下，排回原有加蓋排水溝。':'水先蓄到高位，才流進 200 L 桶，留下供清洗與澆灌的雨水。'}
 const openCount=s.taps.filter(Boolean).length;
 if(openCount>0&&s.tank>0&&!s.rain){title='正在使用桶裡的水';body=`沒有新雨水進桶，取用桶內的水時，示意水位會逐漸下降。`}
 else if(openCount>0&&s.tank>0&&collecting&&s.front>=1){title='一邊收水，一邊取用';body=`進來的水比用掉的多，水位就上升；用掉的比較多，水位就下降。`}
 if(debrisInTank){title='關得太早了！';body='初期雨水還沒沖洗完成，雜質可能跟著進入水桶。請重新開始，先排放前 5–10 分鐘的雨水。';}
 put('stateTitle',title);put('stateText',body);
 put('tapStatus',openCount===0?'三個水龍頭都關著；有水時可直接點圖上的龍頭取用。':s.tank<=0?'水桶裡沒有水了。':`目前開啟 ${openCount} 個水龍頭，桶內的水正在供應取用。`);
 faucetNodes.forEach((node,i)=>{
  node.classList.toggle('open',s.taps[i]);
  node.classList.toggle('dry',s.taps[i]&&s.tank<=0);
  node.setAttribute('aria-pressed',String(s.taps[i]));
  node.setAttribute('aria-label',`${i+1} 號水龍頭目前${s.taps[i]?'開啟，點擊關閉':'關閉，點擊開啟'}`);
  flows[`tap-${i}`].classList.toggle('visible',s.taps[i]&&s.tank>0);
 });
 put('flushText',debrisInTank?'這場雨曾提早關閥，可能把較髒的初期雨水也收進去。':s.rinse>=8?'沖洗示範完成。實際操作時，要先開閥排掉前 5–10 分鐘的雨水。':s.rain?(s.closed?'先打開閥門，讓前段雨水排掉。':'正在示範初期沖洗。動畫已加速，現場需先排掉前 5–10 分鐘的雨水。'):'按「開始下雨」，觀察前段雨水先從底部排出。');
 $('flushMeter').value=s.rinse;for(const key of ['column','tank']){$(key+'Meter').value=s[key];put(key+'Percent',Math.floor(s[key]*100)+'%')}
 const cy=675-s.column*401;waters.column.setAttribute('y',cy);waters.column.setAttribute('height',675-cy);waters['branch-clip'].setAttribute('y',cy);waters['branch-clip'].setAttribute('height',675-cy);
 const ty=687-s.tank*162;waters.tank.setAttribute('y',ty);waters.tank.setAttribute('height',687-ty);
 const enabled={inlet:s.rain,falling:s.rain,drain:!s.closed&&(s.rain||s.column>0),collect:collecting&&s.front>=1||s.tail>0,spill:collecting&&s.front>=1&&s.tank>=1};
 for(const [id,on] of Object.entries(enabled))flows[id].classList.toggle('visible',on);
 flows.rain.style.visibility=s.rain?'visible':'hidden';flows.front.style.strokeDashoffset=String(1-s.front);flows.front.style.visibility=collecting?'visible':'hidden';
 renderDebris();
}
$('rainToggle').onclick=()=>{RainModel.rain(state,!state.rain);render()};$('valveToggle').onclick=()=>{RainModel.valve(state,!state.closed);render()};$('reset').onclick=()=>{state=RainModel.create();debrisClock=0;debrisInTank=false;debrisSpawn=0;debrisSerial=0;particles=[];render()};
let previous=performance.now();function frame(now){const dt=Math.min(.15,(now-previous)/1000);RainModel.tick(state,dt);previous=now;updateDebris(dt);render();requestAnimationFrame(frame)}render();requestAnimationFrame(frame);
