const $=id=>document.getElementById(id);
const photos=[['photos/site-before.jpeg','① 看環境｜屋頂、黑色短天溝與原本排水管。'],['photos/gutter-before.jpeg','② 找天溝｜黑色短天溝底部，接出灰色排水管。'],['photos/broken-joint.jpeg','③ 看接頭｜橫管與原有直管連接處可見斷裂缺口。']];
document.querySelectorAll('[data-photo]').forEach(button=>button.onclick=()=>{const p=photos[+button.dataset.photo];$('storyPhoto').src=p[0];$('storyPhoto').alt=p[1];$('storyCaption').textContent=p[1];document.querySelectorAll('[data-photo]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)))});
const parts=[
{x:89,y:16,title:'既有天溝 → 新管路',text:'右上方的短天溝集中局部屋簷的雨水。完成照中，灰色管沿上方往左，再轉向下接入沉澱管。'},
{x:48,y:51,title:'右側直立的沉澱管',text:'中段加粗為 3.5 吋，主要是增加暫存與沉澱容量。雨水先向下；底部閥門關閉後，水位才逐漸上升。'},
{x:43,y:33,title:'先抬高，再向下進桶',text:'支管從沉澱管側邊向左接出，先上升到高點，再往下接入桶頂。你後來加高這一段，避免沿管壁流下的水直接進桶。'},
{x:53,y:83,title:'底部的紅色排水閥',text:'沉澱管下方縮為 2 吋，再彎向右。紅色閥門位於這段水平排水管上；它控制沉澱管排水，不是水桶的出水開關。',detail:true},
{x:38,y:72,title:'左側的黑色 200 L 水桶',text:'實體是有大桶蓋、帶肋紋的黑色扁方桶，架在基座上。進水從桶頂接入；存水由左下管線供三個水龍頭取用。'},
{x:24,y:65,title:'左上側接出的溢流管',text:'桶滿後，多餘雨水由左側上方接出的管子往下排，回到原有加蓋排水溝。這與右側紅色閥門的排水路徑分開。'},
{x:30.5,y:59.5,title:'通氣短管與防蟲網',text:'桶頂左側有一段向上的短管。依你的說明，它用於通氣並加裝防蟲網；網面細節在全景照片中不易看清。'},
{x:41.8,y:51.5,title:'可拆卸的由令',text:'進桶直管上可見一圈較粗的可拆接頭。依你的說明，進水端與左下出水端各有一個由令，放空桶後可拆下清洗；左下接頭細節需近照核對。'}];
let partIndex=0;parts.forEach((p,i)=>{const b=document.createElement('button');b.className='pin';b.style.left=p.x+'%';b.style.top=p.y+'%';b.textContent=i+1;b.setAttribute('aria-label',`${i+1} ${p.title}`);b.onclick=()=>selectPart(i);$('pins').append(b)});
function selectPart(i){partIndex=(i+parts.length)%parts.length;const p=parts[partIndex];$('partNumber').textContent='觀察 '+String(partIndex+1).padStart(2,'0');$('partTitle').textContent=p.title;$('partText').textContent=p.text;$('partCount').textContent=`${partIndex+1} / ${parts.length}`;$('partDetail').hidden=!p.detail;document.querySelectorAll('.pin').forEach((b,j)=>{b.classList.toggle('selected',j===partIndex);b.setAttribute('aria-pressed',String(j===partIndex))})}
$('partPrev').onclick=()=>selectPart(partIndex-1);$('partNext').onclick=()=>selectPart(partIndex+1);selectPart(0);
// Continuous water levels, deliberately illustrative rather than calibrated hydraulics.
const state={rain:false,closed:false,column:0,tank:0,transit:0,flushed:false,early:false};
function setRain(value){if(value===state.rain)return;state.rain=value;if(value){state.flushed=false;state.early=false}render()}
function setValve(value){state.closed=value;if(value&&state.rain&&!state.flushed)state.early=true;render()}
function reset(){Object.assign(state,{rain:false,closed:false,column:0,tank:0,transit:0,flushed:false,early:false});render()}
function advance(dt){if(!state.closed){state.column=Math.max(0,state.column-dt*.2);state.transit=0}else if(state.rain){const available=Math.max(0,dt-(1-state.column)/.105);state.column=Math.min(1,state.column+dt*.105);if(state.column>=1){state.transit=Math.min(1.65,state.transit+available);if(state.transit>1.5)state.tank=Math.min(1,state.tank+Math.min(available,state.transit-1.5)*.035)}}else{state.transit=Math.max(0,state.transit-dt*3)}}
function render(){const collecting=state.closed&&state.rain&&state.column>=1,draining=!state.closed&&(state.rain||state.column>0);
$('rainToggle').textContent=state.rain?'停止下雨':'開始下雨';$('rainToggle').setAttribute('aria-pressed',String(state.rain));$('valveToggle').textContent=state.closed?'打開排水閥':'關閉排水閥';$('valveToggle').setAttribute('aria-pressed',String(state.closed));$('rainState').textContent='雨：'+(state.rain?'下':'停');$('valveState').textContent='排水閥：'+(state.closed?'關':'開');let title,text;
if(!state.closed){title=state.rain?'雨水先排走':state.column>0?'管內的殘水正在排出':'平常的待機狀態';text=state.rain?'水從右上天溝沿管向下，經紅色排水閥排出。桶內已收的水仍然保留。':state.column>0?'沒有新的雨水。沉澱管水位降低，從右下排水端排出；儲水桶水位不變。':'沒有新進水。排水閥保持開啟，為下一次降雨的初期棄流做準備。'}
else if(!state.rain){title=state.transit>0?'雨停了，餘流正在停止':'沒有雨，水不會繼續增加';text='排水閥仍關著，已蓄的水保留。想回復平常狀態，可以重新打開排水閥。'}
else if(state.column<1){title='先讓沉澱管蓄水';text='底部不再排水。觀察右側管內水位向上升；還沒到高位出口，左側水桶暫時不增加。'}
else if(state.transit<=1.5){title='水剛越過高位管';text='雨水轉向左側，越過抬高的管路，再沿直管往下抵達桶頂。'}
else{title=state.tank>=1?'桶滿了，多餘的水排走':'雨水進入 200 L 桶';text=state.tank>=1?'雨還在下、閥門仍關著。多餘雨水由桶左側溢流管往下排回原有排水溝。':'右側沉澱管到達高位，後續雨水持續流入桶頂，水桶水位才開始上升。'}
if($('stateTitle').textContent!==title)$('stateTitle').textContent=title;$('stateText').textContent=text;
for(const key of ['column','tank']){$(key+'Meter').value=state[key];$(key+'Percent').textContent=Math.floor(state[key]*100)+'%'}
const y=952-state.column*571;$('columnWater').setAttribute('y',y);$('columnWater').setAttribute('height',952-y);const ty=965-state.tank*233;$('tankWater').setAttribute('y',ty);$('tankWater').setAttribute('height',965-ty);
for(const [id,on] of [['incoming',state.rain],['falling',state.rain],['outgoing',draining],['collecting',collecting||state.transit>0],['overflow',collecting&&state.tank>=1&&state.transit>1.5]])$(id).classList.toggle('flowing',on);
$('rainMarks').style.visibility=state.rain?'visible':'hidden';$('valveHandle').setAttribute('transform',state.closed?'rotate(90)':'rotate(0)');$('flushJump').disabled=!state.rain||state.closed||state.flushed;
$('flushText').textContent=state.early?'這場雨曾在沖洗確認前關閥：前段較髒的水可能一起收進桶。':state.flushed?'已示範開閥沖洗 5–10 分鐘，可以關閥觀察收水。':state.rain?'先保持開閥。按下方按鈕代表現場已沖洗 5–10 分鐘；動畫秒數不等於現場分鐘。':'實際使用時，剛下雨先保持開閥 5–10 分鐘。';
document.querySelectorAll('[data-state]').forEach(row=>row.classList.toggle('current',row.dataset.state===`${+state.rain}${+state.closed}`));}
$('rainToggle').onclick=()=>setRain(!state.rain);$('valveToggle').onclick=()=>setValve(!state.closed);$('reset').onclick=reset;$('flushJump').onclick=()=>{if(state.rain&&!state.closed){state.flushed=true;render()}};$('flowView').onchange=()=>{$('flowLayer').style.display=$('flowView').checked?'':'none'};
let last=performance.now();function frame(now){advance(Math.min((now-last)/1000,.15));last=now;render();requestAnimationFrame(frame)}render();requestAnimationFrame(frame);
