/* ═══════════════ forecast.js — runFC() forecast engine ═══════════════ */

import { D, state, NOW, MX } from './state.js';

export function runFC(){
  const pts=[];
  const _liq=D.liq.filter(a=>!a.disabled),_ill=D.ill.filter(a=>!a.disabled),_rev=D.rev.filter(r=>!r.disabled),_cst=D.cst.filter(c=>!c.disabled),_iev=D.iev.filter(e=>!e.disabled),_eev=D.eev.filter(e=>!e.disabled);
  const lb={};_liq.forEach(a=>{lb[a.id]=a.value||0});
  let cR=0;const lr={};_liq.forEach(a=>{lr[a.id]=0});
  const rc={};_rev.forEach(r=>rc[r.id]=0);D.iev.filter(e=>!e.disabled).forEach(e=>rc[e.id]=0);
  const cc={};_cst.forEach(c=>cc[c.id]=0);D.eev.filter(e=>!e.disabled).forEach(e=>cc[e.id]=0);
  const et={},xt={},sa=new Set(),ba={},db={},lo={};
  const cid=_liq.length?_liq[0].id:null;

  function withdraw(amount){
    let rem=amount;
    for(const a of _liq){
      if(rem<=0)break;
      const take=Math.min(rem,lb[a.id]);
      if(take>0){lb[a.id]-=take;rem-=take}
    }
    if(rem>0&&cid){lb[cid]-=rem}
    return amount;
  }

  for(let m=0;m<=MX;m++){
    const d=new Date(NOW.getFullYear(),NOW.getMonth()+m,1);
    if(m>0){
      for(const a of _liq){const mr=(a.returnRate||0)/100/12;const r=lb[a.id]*mr;lb[a.id]+=r;lr[a.id]=(lr[a.id]||0)+r;cR+=r}
      const md=new Date(NOW.getFullYear(),NOW.getMonth()+m-1,15);
      for(const r of _rev){
        if(r.linkedAssetId&&(sa.has(r.linkedAssetId)||sa.has('bought_'+r.linkedAssetId)))continue;
        const f=r.from?new Date(r.from):new Date(0),t=r.to?new Date(r.to):new Date(9999,0);
        if(md>=f&&md<=t){const mr=(r.appRate||0)/100/12;const am=(r.amount||0)*Math.pow(1+mr,m-1);if(cid)lb[cid]+=am;rc[r.id]=(rc[r.id]||0)+am}}
      for(const c of _cst){
        if(c.linkedAssetId&&(sa.has(c.linkedAssetId)||sa.has('bought_'+c.linkedAssetId)))continue;
        const f=c.from?new Date(c.from):new Date(0),t=c.to?new Date(c.to):new Date(9999,0);
        if(md>=f&&md<=t){const mr=(c.appRate||0)/100/12;const am=(c.amount||0)*Math.pow(1+mr,m-1);withdraw(am);cc[c.id]=(cc[c.id]||0)+am}}
    }
    for(const ev of _iev){if(ev.date){const ed=new Date(ev.date);
      if(ev.type==='loanOut'){
        if(ed.getFullYear()===d.getFullYear()&&ed.getMonth()===d.getMonth()&&lo[ev.id]===undefined){
          lo[ev.id]=ev.amount||0;
        }
        if(lo[ev.id]!==undefined&&lo[ev.id]>0&&m>0&&d>=ed){
          const mir=(ev.loanRate||0)/100/12;
          lo[ev.id]+=lo[ev.id]*mir;
          const pmt=Math.min(ev.monthlyPmt||0,lo[ev.id]);
          if(pmt>0&&cid){lb[cid]+=pmt;lo[ev.id]-=pmt;rc[ev.id]=(rc[ev.id]||0)+pmt}
          if(lo[ev.id]<0.01)lo[ev.id]=0;
          et[ev.id]={value:rc[ev.id]||0,name:ev.name};
        }
      }else if(ed.getFullYear()===d.getFullYear()&&ed.getMonth()===d.getMonth()&&!et[ev.id]){
        if(ev.type==='sell'&&ev.sellAssetId){
          const as=D.ill.find(a=>a.id===ev.sellAssetId);
          if(as&&!sa.has(as.id)){const mr=(as.appRate||0)/100/12;const ap=(as.value||0)*Math.pow(1+mr,m);if(cid)lb[cid]+=ap;et[ev.id]={value:ap,name:as.name};sa.add(as.id)}
          const bi=ev.sellAssetId.replace('bought_','');const b=ba[bi];
          if(b&&!sa.has('bought_'+bi)){const mo=m-b.buyMonth;const mr=(b.appRate||0)/100/12;const ap=b.value*Math.pow(1+mr,Math.max(0,mo));if(cid)lb[cid]+=ap;et[ev.id]={value:ap,name:b.name};sa.add('bought_'+bi)}
        }else{if(cid)lb[cid]+=(ev.amount||0);et[ev.id]={value:ev.amount||0,name:ev.name}}
      }
    }}
    for(const ev of _eev){if(ev.date){const ed=new Date(ev.date);
      if(ev.type==='debt'){
        if(ed.getFullYear()===d.getFullYear()&&ed.getMonth()===d.getMonth()&&db[ev.id]===undefined){
          db[ev.id]=ev.amount||0;
        }
        if(db[ev.id]!==undefined&&db[ev.id]>0&&m>0&&d>=ed){
          const mir=(ev.appRate||0)/100/12;
          db[ev.id]+=db[ev.id]*mir;
          const pmt=Math.min(ev.monthlyPmt||0,db[ev.id]);
          if(pmt>0){withdraw(pmt);db[ev.id]-=pmt;cc[ev.id]=(cc[ev.id]||0)+pmt}
          if(db[ev.id]<0.01)db[ev.id]=0;
          xt[ev.id]=true;
        }
      }else if(ed.getFullYear()===d.getFullYear()&&ed.getMonth()===d.getMonth()&&!xt[ev.id]){
        withdraw(ev.amount||0);if(ev.type==='buy')ba[ev.id]={name:ev.name,value:ev.amount||0,appRate:ev.appRate||0,buyMonth:m};xt[ev.id]=true}
    }}
    let lT=0;const lv={};for(const a of _liq){lv[a.id]=lb[a.id];lT+=lb[a.id]}
    let iT=0;const av={};
    for(const a of _ill){if(!sa.has(a.id)){const mr=(a.appRate||0)/100/12;const v=(a.value||0)*Math.pow(1+mr,m);iT+=v;av[a.id]=v}else av[a.id]=0}
    const bv={};for(const[k,b]of Object.entries(ba)){if(!sa.has('bought_'+k)){const mo=m-b.buyMonth;const mr=(b.appRate||0)/100/12;const v=b.value*Math.pow(1+mr,Math.max(0,mo));iT+=v;bv[k]=v}else bv[k]=0}
    let debtT=0;for(const[,v]of Object.entries(db))debtT+=v;
    let loanOutT=0;for(const[,v]of Object.entries(lo))loanOutT+=v;
    pts.push({month:m,value:lT+iT-debtT+loanOutT,cash:lT,assetTotal:iT,debtTotal:debtT,debtValues:{...db},loanOutTotal:loanOutT,loanOutValues:{...lo},liqValues:{...lv},liqReturns:{...lr},assetValues:av,boughtValues:{...bv},boughtAssets:{...ba},date:d,cumReturns:cR,revCum:{...rc},costCum:{...cc},evtTriggered:{...et},expTriggered:{...xt},soldAssets:new Set(sa)});
  }
  state.FC=pts;
}
