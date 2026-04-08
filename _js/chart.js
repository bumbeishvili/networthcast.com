/* ═══════════════ chart.js — drawChart(), showChartHover() ═══════════════ */

import { D, state, fm, fmF, fmT, t } from "./state.js";

export let _chartState=null; // chart state for hover
export function showChartHover(mi){
  const ov=document.getElementById('chart-hover-ov');
  if(!ov||!_chartState)return;
  const {xO,yO,vTotal,vLiq,vIll,hasLiq,hasIll,p,W,H,precise,len}=_chartState;
  if(mi<0||mi>=len){ov.innerHTML='';return}
  const cx=xO(mi),pct=(cx/W)*100;
  const total=vTotal[mi],liq=vLiq[mi],ill=vIll[mi];
  const date=fmT(mi);
  // Tooltip: show on the right if cursor is in first 55% of chart, else left
  const tipRight=pct<55;
  const tipPos=tipRight?`left:calc(${pct}% + 10px)`:`right:calc(${100-pct}% + 10px)`;
  // Dots for each active series
  const dots=[];
  dots.push({x:pct,y:(yO(total)/H)*100,color:'#2563eb'});
  if(hasLiq)dots.push({x:pct,y:(yO(liq)/H)*100,color:'#059669'});
  if(hasIll)dots.push({x:pct,y:(yO(ill)/H)*100,color:'#0d9488'});
  ov.innerHTML=`
    <div style="position:absolute;left:${pct}%;top:${(p.t/H*100).toFixed(1)}%;height:${((H-p.t-p.b)/H*100).toFixed(1)}%;width:1px;background:rgba(28,25,23,0.2);transform:translateX(-50%);pointer-events:none"></div>
    ${dots.map(d=>`<div style="position:absolute;left:${d.x.toFixed(1)}%;top:${d.y.toFixed(1)}%;width:8px;height:8px;background:${d.color};border:2px solid #fff;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.2)"></div>`).join('')}
    <div style="position:absolute;${tipPos};top:${(p.t/H*100).toFixed(1)}%;background:var(--card);border:1px solid var(--brd);border-radius:10px;padding:8px 11px;font-size:11px;font-family:var(--mo);white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,.12);pointer-events:none;z-index:10">
      <div style="font-weight:700;margin-bottom:5px;color:var(--txt);font-size:10px">${date}</div>
      <div style="color:#2563eb;margin-bottom:2px">⬤ ${t('total')} &nbsp;<b>${fm(total,precise)}</b></div>
      ${hasLiq?`<div style="color:#059669;margin-bottom:2px">⬤ ${t('liquid')} &nbsp;<b>${fm(liq,precise)}</b></div>`:''}
      ${hasIll?`<div style="color:#0d9488">⬤ ${t('illiquid')} &nbsp;<b>${fm(ill,precise)}</b></div>`:''}
    </div>`;
}
export function drawChart(){
  const cv=document.getElementById('cv'),bx=document.getElementById('chart-box');
  if(!cv||!bx||!state.FC.length)return;
  const mCost=D.cst.reduce((s,c)=>s+(c.amount||0),0);
  const W=bx.clientWidth,H=280;
  cv.width=W*2;cv.height=H*2;cv.style.width=W+'px';cv.style.height=H+'px';
  const ctx=cv.getContext('2d');ctx.scale(2,2);ctx.clearRect(0,0,W,H);
  const ei=Math.max(6,Math.min(D.sl||6,state.FC.length-1));
  const vis=state.FC.slice(0,ei+1),len=vis.length;
  const mob=W<500;
  const p={t:22,r:mob?60:85,b:38,l:mob?36:52},cw=W-p.l-p.r,ch=H-p.t-p.b;
  const vTotal=vis.map(d=>d.value);
  const vLiq=vis.map(d=>d.cash);
  const vIll=vis.map(d=>d.assetTotal);
  // FIRE variants: Lean (60% expenses), Regular, Fat (150%), Coast (present value at 7% over 20yr)
  const fN=mCost>0?(mCost*12)/.04:null;
  const leanN=fN?fN*0.6:null;
  const fatN=fN?fN*1.5:null;
  const baristaN=fN?fN*0.5:null;
  const chubbyN=fN?fN*1.2:null;
  // Coast FIRE: how much you need now so 7% growth reaches fN in 20 years
  const coastN=fN?fN/Math.pow(1.07,20):null;
  // Find crossing indices for each (liquid assets)
  function findCross(target){if(!target||target<=0)return -1;for(let i=0;i<len;i++)if(vis[i].cash>=target)return i;return -1}
  const fireTypes=[
    {id:'coast',label:'Coast',num:coastN,color:'#0891b2',bg:'rgba(8,145,178,',idx:findCross(coastN)},
    {id:'barista',label:'Barista',num:baristaN,color:'#8b5cf6',bg:'rgba(139,92,246,',idx:findCross(baristaN)},
    {id:'lean',label:'Lean',num:leanN,color:'#16a34a',bg:'rgba(22,163,74,',idx:findCross(leanN)},
    {id:'fire',label:'FIRE',num:fN,color:'#f59e0b',bg:'rgba(245,158,11,',idx:findCross(fN)},
    {id:'chubby',label:'Chubby',num:chubbyN,color:'#ea580c',bg:'rgba(234,88,12,',idx:findCross(chubbyN)},
    {id:'fat',label:'Fat',num:fatN,color:'#dc2626',bg:'rgba(220,38,38,',idx:findCross(fatN)}
  ];
  const allVals=[...vTotal,...vLiq,...vIll];
  let mn=Math.min(...allVals,0),mx=Math.max(...allVals,1);
  // Ensure chart y-range includes visible FIRE lines
  // FIRE lines appear naturally — no y-axis inflation
  const rng=mx-mn||1;
  const xO=i=>p.l+(i/Math.max(len-1,1))*cw;
  const yO=v=>p.t+ch-((v-mn)/rng)*ch;
  const MO='IBM Plex Mono,monospace';
  // Y grid
  ctx.strokeStyle='#eae7e2';ctx.lineWidth=.5;
  const precise=ei<=24;
  const _fs=mob?7:9;
  for(let i=0;i<=4;i++){const v=mn+(rng/4)*i,y=yO(v);ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(W-p.r,y);ctx.stroke();ctx.fillStyle='#8c857d';ctx.font=`${_fs}px ${MO}`;ctx.textAlign='right';ctx.fillText(fm(v,precise),p.l-4,y+3)}
  // X labels
  ctx.fillStyle='#8c857d';ctx.font=`${_fs}px ${MO}`;ctx.textAlign='center';
  if(ei<=24){const ms=ei<=8?1:ei<=14?2:3;for(let mi=0;mi<=ei;mi+=ms){if(mi>=len)break;ctx.fillText(fmT(mi),xO(mi),H-p.b+14)}}
  else{const ys=ei<=48?1:ei<=120?2:5;for(let yr=0;yr<=ei/12+.01;yr+=ys){const mi=Math.round(yr*12);if(mi>=len)break;ctx.fillText(fmT(mi),xO(mi),H-p.b+14)}}
  // Zero line
  if(mn<0){ctx.save();ctx.strokeStyle='#dc262640';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(p.l,yO(0));ctx.lineTo(W-p.r,yO(0));ctx.stroke();ctx.restore()}
  // FIRE dashed line (only for main FIRE)
  if(fN>0&&fN>=mn&&fN<=mx*1.1){const fy=yO(fN);ctx.save();ctx.strokeStyle='#f59e0b';ctx.lineWidth=1.2;ctx.setLineDash([6,4]);ctx.beginPath();ctx.moveTo(p.l,fy);ctx.lineTo(W-p.r,fy);ctx.stroke();ctx.restore();ctx.fillStyle='#f59e0b';ctx.font=`bold ${mob?6:8}px ${MO}`;ctx.textAlign='left';ctx.fillText('FIRE '+fm(fN),p.l+4,fy-4)}

  // Helper: draw area + line + end dot for a series
  function drawSeries(vals,color,fillAlpha,lineW){
    // Area fill
    ctx.beginPath();ctx.moveTo(xO(0),yO(0));
    for(let i=0;i<len;i++)ctx.lineTo(xO(i),yO(vals[i]));
    ctx.lineTo(xO(len-1),yO(0));ctx.closePath();
    const gr=ctx.createLinearGradient(0,p.t,0,p.t+ch);
    gr.addColorStop(0,color.replace(')',`,${fillAlpha})`).replace('rgb','rgba'));
    gr.addColorStop(1,color.replace(')',',0.01)').replace('rgb','rgba'));
    ctx.fillStyle=gr;ctx.fill();
    // Line
    ctx.beginPath();
    for(let i=0;i<len;i++){const x=xO(i),y=yO(vals[i]);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}
    ctx.strokeStyle=color;ctx.lineWidth=lineW;ctx.lineJoin='round';ctx.stroke();
    // End dot
    const ex=xO(len-1),ey=yO(vals[len-1]);
    ctx.beginPath();ctx.arc(ex,ey,lineW+2,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
  }

  // Draw series back-to-front: illiquid, liquid, total
  const hasIll=vIll.some(v=>v>0);
  const hasLiq=vLiq.some(v=>v>0);
  if(hasIll)drawSeries(vIll,'rgb(13,148,136)',0.06,1.5);
  if(hasLiq)drawSeries(vLiq,'rgb(5,150,105)',0.06,1.5);
  drawSeries(vTotal,'rgb(37,99,235)',0.10,2);

  // Time period — prominent, near end of x-axis
  const endLineX=xO(len-1);
  const timeLabel=fmT(ei);
  ctx.textAlign='right';
  ctx.font=`700 ${mob?9:12}px ${MO}`;ctx.fillStyle='#1c1917';
  ctx.fillText(timeLabel,endLineX,H-2);

  // Right-side labels (name + value below) for all series
  const endX=xO(len-1)+(mob?6:10);
  ctx.textAlign='left';
  const labels=[];
  labels.push({name:t('total'),val:fm(vTotal[len-1],precise),color:'#2563eb',y:yO(vTotal[len-1]),big:true});
  if(hasLiq)labels.push({name:t('liquid'),val:fm(vLiq[len-1],precise),color:'#059669',y:yO(vLiq[len-1])});
  if(hasIll)labels.push({name:t('illiquid'),val:fm(vIll[len-1],precise),color:'#0d9488',y:yO(vIll[len-1])});
  labels.sort((a,b)=>a.y-b.y);
  const minGap=20;
  for(let i=1;i<labels.length;i++){
    if(labels[i].y-labels[i-1].y<minGap)labels[i].y=labels[i-1].y+minGap;
  }
  for(const lb of labels){
    if(lb.big){
      ctx.font=`800 ${mob?10:13}px ${MO}`;ctx.fillStyle=lb.color;
      ctx.fillText(lb.val,endX,lb.y);
      ctx.font=`500 ${mob?7:9}px ${MO}`;ctx.fillStyle=lb.color+'99';
      ctx.fillText(lb.name,endX,lb.y+(mob?9:11));
    }else{
      ctx.font=`bold ${mob?7:9}px ${MO}`;ctx.fillStyle=lb.color;
      ctx.fillText(lb.name,endX,lb.y);
      ctx.font=`600 ${mob?7:8}px ${MO}`;ctx.fillStyle=lb.color+'99';
      ctx.fillText(lb.val,endX,lb.y+(mob?8:10));
    }
  }

  // FIRE crossing points — markers with time labels for all 4 types
  const fireMarkers=[];
  for(const ft of fireTypes){
    if(ft.idx<0||ft.idx>=len||!ft.num||ft.num<=0)continue;
    const fx=xO(ft.idx),fy=yO(ft.num);
    const yrs=Math.floor(ft.idx/12),mos=ft.idx%12;
    const ts=yrs>0?(mos>0?`${yrs}${t('yrS')}${mos}${t('moS')}`:`${yrs}${t('yrS')}`):`${mos}${t('moS')}`;
    // Glow + dot
    ctx.beginPath();ctx.arc(fx,fy,8,0,Math.PI*2);ctx.fillStyle=ft.bg+'0.10)';ctx.fill();
    ctx.beginPath();ctx.arc(fx,fy,4,0,Math.PI*2);ctx.fillStyle=ft.bg+'0.25)';ctx.fill();
    ctx.beginPath();ctx.arc(fx,fy,3,0,Math.PI*2);ctx.fillStyle=ft.color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
    // Collect marker for label (avoid overlap)
    fireMarkers.push({label:`${ft.label} ${fm(ft.num)} ${ts}`,color:ft.color,x:fx,y:fy,id:ft.id});
  }
  // Draw labels above/below markers, nudge to avoid overlap
  fireMarkers.sort((a,b)=>a.x-b.x);
  for(let i=0;i<fireMarkers.length;i++){
    const m=fireMarkers[i];
    ctx.font=`bold ${mob?6:8}px ${MO}`;
    const tw=ctx.measureText(m.label).width;
    let lx=m.x-tw/2,ly=m.y-10;
    // Keep within bounds
    if(lx<p.l)lx=p.l;if(lx+tw>W-p.r)lx=W-p.r-tw;
    if(ly<p.t+4)ly=m.y+14;
    // Check overlap with previous labels and nudge vertically
    for(let j=0;j<i;j++){
      const prev=fireMarkers[j];
      if(prev._lx!==undefined&&Math.abs(lx-prev._lx)<tw&&Math.abs(ly-prev._ly)<10){
        ly=prev._ly+11;
      }
    }
    m._lx=lx;m._ly=ly;
    // Small pill background
    ctx.fillStyle='rgba(255,255,255,0.85)';
    const pad=3;
    ctx.beginPath();
    ctx.roundRect(lx-pad,ly-9,tw+pad*2,12,3);
    ctx.fill();
    ctx.fillStyle=m.color;
    ctx.textAlign='left';
    ctx.fillText(m.label,lx,ly);
  }

  // Store chart state for hover
  _chartState={xO,yO,vTotal,vLiq,vIll,hasLiq,hasIll,p,W,H,precise,len};

  // Set up hover overlay once
  if(!cv._hoverReady){
    cv._hoverReady=true;
    bx.style.position='relative';
    const ov=document.createElement('div');
    ov.id='chart-hover-ov';
    ov.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';
    bx.appendChild(ov);
    cv.addEventListener('mousemove',e=>{
      if(!_chartState)return;
      const r=cv.getBoundingClientRect();
      const x=e.clientX-r.left;
      const {p:cp,W:cW,len:cLen}=_chartState;
      const cw2=cW-cp.l-cp.r;
      const mi=Math.round(Math.max(0,Math.min(cLen-1,((x-cp.l)/cw2)*(cLen-1))));
      showChartHover(mi);
    });
    cv.addEventListener('mouseleave',()=>{const ov=document.getElementById('chart-hover-ov');if(ov)ov.innerHTML=''});
  }
}

