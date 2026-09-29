/* 8 seconds represent an illustrative 5–10 minute rinse, never a flow estimate. */
(function(root){
 function create(){return {rain:false,closed:false,column:0,tank:0,rinse:0,front:0,tail:0,early:false,taps:[false,false,false]}}
 function rain(s,on){if(s.rain===on)return;if(on){s.rinse=0;s.early=s.closed}else if(s.front>0){s.tail=.8}s.rain=on}
 function valve(s,closed){s.closed=closed;if(closed&&s.rain&&s.rinse<8)s.early=true;if(!closed){s.front=0;s.tail=0}}
 function tap(s,index){if(index<0||index>2)return;s.taps[index]=!s.taps[index]}
 function tick(s,dt){
  if(s.rain&&!s.closed)s.rinse=Math.min(8,s.rinse+dt);
  let inflow=0;
  if(!s.closed){s.column=Math.max(0,s.column-dt*.22);s.front=0;s.tail=0}
  else if(!s.rain)s.tail=Math.max(0,s.tail-dt);
  else{
   const remaining=Math.max(0,dt-(1-s.column)/.095);s.column=Math.min(1,s.column+dt*.095);
   if(s.column>=1){const travel=(1-s.front)*1.8;s.front=Math.min(1,s.front+remaining/1.8);inflow=Math.max(0,remaining-travel)*.04}
  }
  const outflow=s.taps.filter(Boolean).length*dt*.025;
  s.tank=Math.max(0,Math.min(1,s.tank+inflow-outflow));
 }
 const api={create,rain,valve,tap,tick};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RainModel=api;
})(typeof window==='undefined'?this:window);
