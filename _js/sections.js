/* ═══════════════ sections.js — renderSections(), bindSections(), renderBreakdown(), updateSectionForecasts(), renderRelocate(), add* functions ═══════════════ */

import { D, state, ARRS, fm, fmF, fmT, t, esc, uid, persist, customConfirm, NOW, MX, DF, DT, CURRENCIES } from "./state.js";
import { COL, FAMS, REGIONS, colTot } from "./i18n.js";

// Callback injection for circular deps
let _fullUpdate, _runFC, _updateView, _drawChart;
export function setSectionDeps(deps) {
  _fullUpdate = deps.fullUpdate;
  _runFC = deps.runFC;
  _updateView = deps.updateView;
  _drawChart = deps.drawChart;
}

// ═══════════════ LIVE FORECAST UPDATE (cheap — updates text only, no innerHTML rebuild)
export function updateSectionForecasts(){
  if(!state.FC.length||D.sl<=0)return;
  const mi=Math.min(D.sl,state.FC.length-1),cur=state.FC[mi];
  const p1=mi>=1?state.FC[mi-1]:null,p12=mi>=12?state.FC[mi-12]:null;
  const _moL=t('mo'),_yrL='/'+t('yrS');
  // Update each .fc-val span by data attributes
  document.querySelectorAll('.fc-val[data-fc-arr]').forEach(el=>{
    const arr=el.dataset.fcArr,id=el.dataset.fcId;
    let total=0,prev1=0,prev12=0,prefix='',fromDate='';
    if(arr==='liq'){total=cur.liqValues[id]||0;prev1=p1?p1.liqValues[id]||0:0;prev12=p12?p12.liqValues[id]||0:0}
    else if(arr==='ill'){total=cur.assetValues[id]||0;prev1=p1?p1.assetValues[id]||0:0;prev12=p12?p12.assetValues[id]||0:0}
    else if(arr==='rev'){total=cur.revCum[id]||0;prev1=p1?p1.revCum[id]||0:0;prev12=p12?p12.revCum[id]||0:0;prefix='+';const row=D.rev.find(r=>r.id===id);fromDate=row?.from||''}
    else if(arr==='cst'){total=cur.costCum[id]||0;prev1=p1?p1.costCum[id]||0:0;prev12=p12?p12.costCum[id]||0:0;prefix='-';const row=D.cst.find(c=>c.id===id);fromDate=row?.from||''}
    // If 0 and row hasn't started yet, show "starts [month]"
    if(total===0&&fromDate){
      const sliderDate=new Date(NOW.getFullYear(),NOW.getMonth()+mi,1);
      const startDate=new Date(fromDate);
      if(startDate>sliderDate){
        const label=startDate.toLocaleString('default',{month:'short',year:'numeric'});
        el.innerHTML=`starts ${label}`;el.style.color='var(--mut)';el.style.fontSize='10px';el.style.fontStyle='italic';
        return;
      }
    }
    el.style.color='';el.style.fontSize='';el.style.fontStyle='';
    const mo=p1?total-prev1:total,yr=p12?total-prev12:total;
    let h='';
    if(mi>=1)h+=`<span class="fc-vm">${prefix}${fm(mo)}${_moL}</span>`;
    if(mi>=12)h+=`<span class="fc-vm">${prefix}${fm(yr)}${_yrL}</span>`;
    h+=`→ ${prefix}${fm(total)}`;
    el.innerHTML=h;
  });
  // Update section header totals
  const e=id=>document.getElementById(id);
  if(e('fc-hd-liq'))e('fc-hd-liq').textContent=fm(cur.cash);
  if(e('fc-hd-ill'))e('fc-hd-ill').textContent=fm(cur.assetTotal);
  const fcRevTot=D.rev.reduce((s,r)=>s+(cur.revCum[r.id]||0),0);
  const fcCostTot=D.cst.reduce((s,c)=>s+(cur.costCum[c.id]||0),0);
  if(e('fc-hd-rev'))e('fc-hd-rev').textContent='+'+fm(fcRevTot);
  if(e('fc-hd-cst'))e('fc-hd-cst').textContent='-'+fm(fcCostTot);
  const fcRevMo=p1?fcRevTot-D.rev.reduce((s,r)=>s+(p1.revCum[r.id]||0),0):0;
  const fcRevYr=p12?fcRevTot-D.rev.reduce((s,r)=>s+(p12.revCum[r.id]||0),0):0;
  const fcCostMo=p1?fcCostTot-D.cst.reduce((s,c)=>s+(p1.costCum[c.id]||0),0):0;
  const fcCostYr=p12?fcCostTot-D.cst.reduce((s,c)=>s+(p12.costCum[c.id]||0),0):0;
  if(e('fc-hd-rev-my'))e('fc-hd-rev-my').innerHTML=(mi>=1?`+${fm(fcRevMo)}${_moL} `:'')+(mi>=12?`+${fm(fcRevYr)}${_yrL} `:'');
  if(e('fc-hd-cst-my'))e('fc-hd-cst-my').innerHTML=(mi>=1?`-${fm(fcCostMo)}${_moL} `:'')+(mi>=12?`-${fm(fcCostYr)}${_yrL} `:'');
}

// ═══════════════ TAG helper
export function tg(label,bg,col){return`<span class="tg" style="background:${bg};color:${col}">${label}</span>`}

// ═══════════════ BREAKDOWN (summaries only)
export function renderBreakdown(){
  const el=document.getElementById('bkdn');
  // Summary tiles — always visible
  // Tile values: use forecast data when slider > 0, current input data when at "now"
  let tLiq,tIll,tRev,tCost,tNet,surplus,tileLabel;
  if(D.sl>0&&state.FC.length>0){
    const fc=state.FC[Math.min(D.sl,state.FC.length-1)];
    tLiq=fc.cash;
    tIll=fc.assetTotal;
    // Monthly revenue/cost at that point (use cumulative diffs for the last month)
    const fcP=D.sl>=1?state.FC[Math.min(D.sl-1,state.FC.length-1)]:null;
    tRev=fcP?D.rev.reduce((s,r)=>s+((fc.revCum[r.id]||0)-(fcP.revCum[r.id]||0)),0):D.rev.filter(r=>!r.disabled).reduce((s,r)=>s+(r.amount||0),0);
    tCost=fcP?D.cst.reduce((s,c)=>s+((fc.costCum[c.id]||0)-(fcP.costCum[c.id]||0)),0):D.cst.filter(c=>!c.disabled).reduce((s,c)=>s+(c.amount||0),0);
    tileLabel=fmT(D.sl);
  }else{
    tLiq=D.liq.filter(a=>!a.disabled).reduce((s,a)=>s+(a.value||0),0);
    tIll=D.ill.filter(a=>!a.disabled).reduce((s,a)=>s+(a.value||0),0);
    tRev=D.rev.filter(r=>!r.disabled).reduce((s,r)=>s+(r.amount||0),0);
    tCost=D.cst.filter(c=>!c.disabled).reduce((s,c)=>s+(c.amount||0),0);
    tileLabel=t('now')||'now';
  }
  tNet=tLiq+tIll;
  surplus=tRev-tCost;
  const tiles=[
    {label:t('curNet'),value:fm(tNet),color:tNet>=0?'var(--acc)':'var(--red)'},
    {label:t('liquid'),value:fm(tLiq),color:'var(--liq)'},
    {label:t('illiquid'),value:fm(tIll),color:'var(--ill)'},
    {label:t('revHd'),value:'+'+fm(tRev)+t('mo'),color:'var(--grn)'},
    {label:t('costHd'),value:'-'+fm(tCost)+t('mo'),color:'var(--red)'},
    {label:t(surplus>=0?'savingsRate':'deficit'),value:(surplus>=0?'+':'')+fm(surplus)+t('mo'),color:surplus>=0?'var(--grn)':'var(--red)'}
  ];
  const tileLblStyle='font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--mut);font-family:var(--mo);margin-bottom:4px';
  let bkH='';
  bkH+=`<div style="display:grid;margin-top:2px;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 0 10px">${tiles.map(t=>`<div class="c" style="padding:12px;text-align:center"><div style="${tileLblStyle}">${t.label}</div><div style="font-size:16px;font-weight:700;font-family:var(--mo);color:${t.color}">${t.value}</div></div>`).join('')}</div>`;
  el.innerHTML=bkH;
}

// ═══════════════ RELOCATE
export function renderRelocate(){
  const bd=document.getElementById('rel-body');
  const mRev=D.rev.reduce((s,r)=>s+(r.amount||0),0);
  const fam=FAMS.find(p=>p.id===D.fam)||FAMS[0];
  const curAT=mRev*(1-(D.curTax||0)/100);
  const data=COL.map(c=>{const mc=colTot(c,D.fam);const destAT=mRev*(1-(c.tax||0)/100);const sur=destAT-mc;const taxDiff=destAT-curAT;
    return{...c,mc,destAT,curAT,sur,taxDiff,ok:sur>=0,_r:Math.round(c.rent*fam.rentMul),_f:Math.round(c.food*(fam.persons*.65+.35)),_t:Math.round(c.transport*(fam.persons*.65+.35)),_u:Math.round(c.utilities*fam.utilMul),_h:Math.round(c.health*fam.persons),_o:Math.round(c.other*(fam.persons*.65+.35))}}).sort((a,b)=>b.sur-a.sur);
  const aff=data.filter(c=>c.ok),naf=data.filter(c=>!c.ok);
  function cityRow(c){const s=c.sur;const exp=D.relExp===c.code;const td=c.taxDiff;
    let h=`<div class="c cr" style="opacity:${c.ok?1:.7};border-color:${exp?'var(--acc)':'var(--brd)'}" data-city="${c.code}">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:6px;min-width:0"><span style="font-size:15px;flex-shrink:0">${c.flag}</span><span style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.city}</span><span style="font-size:10px;color:var(--mut);flex-shrink:0">${c.country}</span></div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <span style="font-family:var(--mo);font-size:12px;font-weight:600;color:var(--mut)">${state.CUR}${c.mc.toLocaleString()}<span style="font-size:9px;font-weight:400">${t('mo')}</span></span>
        ${c.tax!==D.curTax?`<span style="font-family:var(--mo);font-size:9px;padding:1px 5px;border-radius:3px;background:${td>=0?'var(--grn-bg)':'#fef3c7'};color:${td>=0?'var(--grn)':'#92400e'}">${c.tax}% ${td>0?'↓':'↑'} ${t('tax')}</span>`:`<span style="font-family:var(--mo);font-size:9px;padding:1px 5px;border-radius:3px;background:var(--brd);color:var(--mut)">${c.tax}% ${t('sameTax')}</span>`}
        <span style="font-family:var(--mo);font-size:11px;font-weight:700;padding:2px 7px;border-radius:4px;background:${s>=0?'var(--grn-bg)':'var(--red-bg)'};color:${s>=0?'var(--grn)':'var(--red)'};min-width:52px;text-align:right">${s>=0?'+':''}${fm(s)}</span>
      </div></div>`;
    if(exp){const cats=[[t('rent'),c._r,'#6366f1'],[t('food'),c._f,'#059669'],[t('transport'),c._t,'#d97706'],[t('util'),c._u,'#dc2626'],[t('health'),c._h,'#f59e0b'],[t('other'),c._o,'#8b5cf6']];
      h+=`<div class="ce"><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px 12px;font-size:11px;margin-bottom:6px">`;
      cats.forEach(([l,v,co])=>{h+=`<div style="display:flex;justify-content:space-between;padding:1px 0"><span style="color:var(--mut)"><span style="display:inline-block;width:6px;height:6px;border-radius:2px;background:${co};opacity:.7;margin-right:4px"></span>${l}</span><span style="font-family:var(--mo);font-weight:600">${state.CUR}${v.toLocaleString()}</span></div>`});
      h+=`</div><div style="display:flex;gap:8px;margin-bottom:4px">
        <div class="mt" style="background:var(--acc-lt)"><div class="ml">${t('afterTaxInc')}</div><div class="mv" style="color:var(--acc)">${fm(c.destAT)}${t('mo')}</div></div>
        <div class="mt" style="background:${td>=0?'var(--grn-bg)':'var(--red-bg)'}"><div class="ml">${td>=0?t('taxSavings'):t('taxIncrease')}</div><div class="mv" style="color:${td>=0?'var(--grn)':'var(--red)'}">${td>=0?'+':''}${fm(td)}${t('mo')}</div></div>
        <div class="mt" style="background:${s>=0?'var(--grn-bg)':'var(--red-bg)'}"><div class="ml">${t('netSurplus')}</div><div class="mv" style="color:${s>=0?'var(--grn)':'var(--red)'}">${s>=0?'+':''}${fm(s)}</div></div>
        <div class="mt" style="background:#fef3c7"><div class="ml">${t('localInf')}</div><div class="mv" style="color:#92400e">${c.inf}%/${t('yrS')}</div></div>
      </div><p style="font-size:10px;font-style:italic;color:var(--mut);opacity:.8;margin:0">${c.notes}</p></div>`}
    h+=`</div>`;return h}
  // Controls row: household + current tax + income display
  let h=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <div style="display:flex;gap:3px;align-items:center"><span style="font-size:10px;color:var(--mut);font-family:var(--mo);margin-right:2px">${t('household')}:</span>`;
  FAMS.forEach(f=>{h+=`<button class="fb" style="border:1px solid ${D.fam===f.id?'var(--acc)':'var(--brd)'};background:${D.fam===f.id?'var(--acc-lt)':'transparent'};color:${D.fam===f.id?'var(--acc)':'var(--mut)'};font-weight:${D.fam===f.id?700:400}" data-fam="${f.id}">${t(f.lk)}</button>`});
  h+=`</div>
      <div style="display:flex;gap:4px;align-items:center"><span style="font-size:10px;color:var(--mut);font-family:var(--mo)">${t('yourTax')}:</span>
        <div style="position:relative;width:62px"><input class="sm" type="number" id="cur-tax-input" value="${D.curTax}" min="0" max="60" step="1" style="text-align:right;width:100%;padding-right:22px;font-weight:600;font-size:13px"><span style="position:absolute;right:7px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:11px;font-family:var(--mo)">%</span></div>
      </div>
    </div>
    <span style="font-size:10px;color:var(--mut);font-family:var(--mo)">${t('incomeAfterTax').replace('{inc}',fm(mRev)).replace('{aft}',fm(curAT))}</span></div>`;
  if(aff.length){h+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--grn);font-family:var(--mo)">✓ ${t('canAfford')} (${aff.length})</span><div style="flex:1;height:1px;background:var(--grn);opacity:.2"></div></div>`;h+=aff.map(cityRow).join('')}
  if(aff.length&&naf.length){h+=`<div style="display:flex;align-items:center;margin:10px 0 6px"><div style="flex:1;height:2px;background:linear-gradient(90deg,rgba(5,150,105,.2),rgba(220,38,38,.2))"></div><span style="font-size:9px;font-family:var(--mo);color:var(--mut);padding:0 10px;white-space:nowrap">${t('affordLine')}</span><div style="flex:1;height:2px;background:rgba(220,38,38,.2)"></div></div>`}
  if(naf.length){h+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--red);font-family:var(--mo)">✗ ${t('cantAfford')} (${naf.length})</span><div style="flex:1;height:1px;background:var(--red);opacity:.2"></div></div>`;h+=naf.map(cityRow).join('')}
  h+=`<p style="font-size:9px;color:var(--mut);margin-top:10px;text-align:center;opacity:.5">${t('estimates')}</p>`;
  bd.innerHTML=h;
  // Event delegation for city clicks, fam buttons, and tax input
  bd.querySelectorAll('[data-city]').forEach(el=>{el.addEventListener('click',()=>{D.relExp=D.relExp===el.dataset.city?null:el.dataset.city;renderRelocate()})});
  bd.querySelectorAll('[data-fam]').forEach(el=>{el.addEventListener('click',e=>{e.stopPropagation();D.fam=el.dataset.fam;persist();renderRelocate();(_updateView&&_updateView())})});
  const taxInp=document.getElementById('cur-tax-input');
  if(taxInp)taxInp.addEventListener('change',()=>{D.curTax=Math.max(0,Math.min(60,parseFloat(taxInp.value)||0));persist();renderRelocate();(_updateView&&_updateView())});
}

// ═══════════════ RELOCATE TOGGLE
document.getElementById('rel-hd').addEventListener('click',()=>{
  D.relOpen=!D.relOpen;
  const bd=document.getElementById('rel-body'),arr=document.getElementById('rel-arr');
  bd.style.display=D.relOpen?'block':'none';
  arr.style.transform=D.relOpen?'rotate(180deg)':'none';
  if(D.relOpen)renderRelocate();
});

// ═══════════════ SECTIONS (editable lists — rebuilt on add/remove/edit)
export function linkOpts(sel){
  let h=`<option value="">🔗</option>`;
  D.ill.forEach(a=>{h+=`<option value="${a.id}"${sel===a.id?' selected':''}>${esc(a.name||'?')}</option>`});
  D.eev.filter(e=>e.type==='buy'&&e.name).forEach(e=>{h+=`<option value="${e.id}"${sel===e.id?' selected':''}>${esc(e.name)}</option>`});
  return h;
}
export function sellOpts(sel){
  let h=`<option value="">— pick asset —</option><optgroup label="Illiquid assets">`;
  D.ill.forEach(a=>{h+=`<option value="${a.id}"${sel===a.id?' selected':''}>${esc(a.name||'Unnamed')} (${fm(a.value)})</option>`});
  h+=`</optgroup>`;const bght=D.eev.filter(e=>e.type==='buy'&&e.name);
  if(bght.length){h+=`<optgroup label="Bought assets">`;bght.forEach(e=>{const v='bought_'+e.id;h+=`<option value="${v}"${sel===v?' selected':''}>${esc(e.name)} (${fm(e.amount)})</option>`});h+=`</optgroup>`}
  return h;
}
// Month-year picker: renders two selects (month + year) for a date field
// dateVal is stored as 'YYYY-MM-DD', we only use month+year
const MO_NAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function ymPicker(arrKey,idx,fld,dateVal){
  const d=dateVal?new Date(dateVal):null;
  const selM=d?d.getMonth():'';
  const selY=d?d.getFullYear():'';
  const curY=NOW.getFullYear();
  let mOpts=`<option value="">—</option>`;
  MO_NAMES.forEach((n,i)=>{mOpts+=`<option value="${i}"${selM===i?' selected':''}>${n}</option>`});
  let yOpts=`<option value="">—</option>`;
  for(let y=curY-2;y<=curY+35;y++){yOpts+=`<option value="${y}"${selY===y?' selected':''}>${y}</option>`}
  return`<div class="ym"><select class="ym-m" data-arr="${arrKey}" data-idx="${idx}" data-fld="${fld}" data-part="m">${mOpts}</select><select class="ym-y" data-arr="${arrKey}" data-idx="${idx}" data-fld="${fld}" data-part="y">${yOpts}</select></div>`;
}
export function secHd(title,color,addFn,rightHtml,hint){
  return`<div class="c cp"><div class="sh"${hint?' style="margin-bottom:4px"':''}>
  <span class="st" style="color:${color}">${title}</span>
  <div style="display:flex;gap:6px;align-items:center">${rightHtml||''}${addFn?`<button class="ba" onclick="${addFn}">+ Add</button>`:''}</div>
  </div>${hint?`<p class="hn">${hint}</p>`:''}`;
}

export function renderSections(){
  const mRev=D.rev.reduce((s,r)=>s+(r.amount||0),0);
  const mCost=D.cst.reduce((s,c)=>s+(c.amount||0),0);
  const tLiq=D.liq.reduce((s,a)=>s+(a.value||0),0);
  const _mi=Math.min(D.sl,state.FC.length-1);
  const _fc=state.FC.length?state.FC[_mi]:null;
  const _p1=_mi>=1?state.FC[_mi-1]:null;
  const _p12=_mi>=12?state.FC[_mi-12]:null;
  const _showFC=_fc&&D.sl>0;
  const _moL=t('mo'),_yrL='/'+t('yrS');
  // Helper: forecast 3-col display (month, year, total)
  function fcV3(total,prev1Val,prev12Val,color,prefix,arr,id,fromDate){
    // If total is 0 and row hasn't started yet, show "starts [month]" instead of $0
    if(total===0&&fromDate){
      const sliderDate=new Date(NOW.getFullYear(),NOW.getMonth()+_mi,1);
      const startDate=new Date(fromDate);
      if(startDate>sliderDate){
        const label=startDate.toLocaleString('default',{month:'short',year:'numeric'});
        return `<span class="fc-val" style="color:var(--mut);font-size:10px;font-style:italic" data-fc-arr="${arr}" data-fc-id="${id}">starts ${label}</span>`;
      }
    }
    const mo=_p1!=null?total-prev1Val:total;
    const yr=_p12!=null?total-prev12Val:total;
    let s=`<span class="fc-val" style="color:${color}" data-fc-arr="${arr}" data-fc-id="${id}">`;
    if(_mi>=1)s+=`<span class="fc-vm">${prefix}${fm(mo)}${_moL}</span>`;
    if(_mi>=12)s+=`<span class="fc-vm">${prefix}${fm(yr)}${_yrL}</span>`;
    s+=`→ ${prefix}${fm(total)}</span>`;
    return s;
  }
  let h='';
  // LIQUID ASSETS
  const fcLiq=_showFC?fm(_fc.cash):'';
  h+=secHd(t('liqHd'),'var(--liq)','addLiq()',`<span class="sr" style="color:var(--liq)">${fm(tLiq)}${_showFC?` <span style="color:var(--mut);font-weight:400">→</span> <span id="fc-hd-liq">${fcLiq}</span>`:''}</span>`);
  if(D.liq.length)h+=`<div class="col-hdr"><span style="flex:1 1 100px;min-width:60px">${t('name')}</span><span style="flex:0 0 100px;text-align:right">${t('value')}</span><span style="flex:0 0 72px;text-align:right">${t('returnYr')}</span><span style="flex:0 0 56px"></span></div>`;
  D.liq.forEach((a,i)=>{
    const isPrimary=i===0;
    const rowCls=isPrimary?'rw rw-primary':'rw';
    h+=`<div class="${rowCls}${a.disabled?' disabled':''}" draggable="true" data-drag-arr="liq" data-drag-idx="${i}" style="margin-left:${isPrimary?'12px':'0'};position:relative">
    <span class="drag-handle">⠿</span>
    <button class="eye-btn${a.disabled?' off':''}" data-eye="liq" data-idx="${i}">${a.disabled?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}</button>
    ${isPrimary?`<span class="primary-badge" style="cursor:help">${t('primary')}<span class="primary-tip">${t('liqHint')}</span></span>`:''}
    <input class="sm" value="${esc(a.name)}" placeholder="${t('name')}" style="flex:1 1 100px;min-width:60px" data-arr="liq" data-idx="${i}" data-fld="name">
    <div style="position:relative;flex:0 0 100px"><span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:11px">${state.CUR}</span><input class="sm" type="number" value="${a.value||''}" placeholder="0" style="padding-left:18px;text-align:right;width:100%" data-arr="liq" data-idx="${i}" data-fld="value" data-num="1"></div>
    <div class="pct-wrap" style="position:relative;flex:0 0 72px"><input class="sm pct-input" type="text" inputmode="decimal" value="${a.returnRate??''}" placeholder="0" style="text-align:right;width:100%;padding-right:22px" data-arr="liq" data-idx="${i}" data-fld="returnRate" data-num="1"><span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:10px;font-family:var(--mo)">%</span></div>
    ${_showFC&&!a.disabled?fcV3(_fc.liqValues[a.id]||0,_p1?_p1.liqValues[a.id]||0:0,_p12?_p12.liqValues[a.id]||0:0,'var(--liq)','','liq',a.id):''}
    <div class="more-wrap"><button class="more-btn">⋯</button><div class="more-pop">
      <div style="min-width:160px"><label>Note</label><input class="sm" value="${esc(a.note||'')}" placeholder="Add a note..." style="width:100%;font-size:11px" data-arr="liq" data-idx="${i}" data-fld="note"></div>
    </div></div>
    <button class="bd" data-del="liq" data-idx="${i}">×</button></div>`});
  h+=`</div>`;
  // ILLIQUID ASSETS
  const tIll=D.ill.reduce((s,a)=>s+(a.value||0),0);
  const fcIll=_showFC?fm(_fc.assetTotal):'';
  h+=secHd(t('illHd'),'var(--ill)','addIll()',`<span class="sr" style="color:var(--ill)">${fm(tIll)}${_showFC?` <span style="color:var(--mut);font-weight:400">→</span> <span id="fc-hd-ill">${fcIll}</span>`:''}</span>`,t('illHint'));
  if(D.ill.length)h+=`<div class="col-hdr"><span style="flex:1 1 100px;min-width:60px">${t('name')}</span><span style="flex:0 0 100px;text-align:right">${t('value')}</span><span style="flex:0 0 72px;text-align:right">${t('appYr')}</span><span style="flex:0 0 56px"></span></div>`;
  D.ill.forEach((a,i)=>{h+=`<div class="rw${a.disabled?' disabled':''}" draggable="true" data-drag-arr="ill" data-drag-idx="${i}">
    <span class="drag-handle">⠿</span>
    <button class="eye-btn${a.disabled?' off':''}" data-eye="ill" data-idx="${i}">${a.disabled?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}</button>
    <input class="sm" value="${esc(a.name)}" placeholder="${t('name')}" style="flex:1 1 100px;min-width:60px" data-arr="ill" data-idx="${i}" data-fld="name">
    <div style="position:relative;flex:0 0 100px"><span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:11px">${state.CUR}</span><input class="sm" type="number" value="${a.value||''}" placeholder="0" style="padding-left:18px;text-align:right;width:100%" data-arr="ill" data-idx="${i}" data-fld="value" data-num="1"></div>
    <div class="pct-wrap" style="position:relative;flex:0 0 72px"><input class="sm pct-input" type="text" inputmode="decimal" value="${a.appRate??''}" placeholder="0" style="text-align:right;width:100%;padding-right:22px" data-arr="ill" data-idx="${i}" data-fld="appRate" data-num="1"><span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:10px;font-family:var(--mo)">%</span></div>
    ${_showFC&&!a.disabled?fcV3(_fc.assetValues[a.id]||0,_p1?_p1.assetValues[a.id]||0:0,_p12?_p12.assetValues[a.id]||0:0,'var(--ill)','','ill',a.id):''}
    <div class="more-wrap"><button class="more-btn">⋯</button><div class="more-pop">
      <div style="min-width:160px"><label>Note</label><input class="sm" value="${esc(a.note||'')}" placeholder="Add a note..." style="width:100%;font-size:11px" data-arr="ill" data-idx="${i}" data-fld="note"></div>
    </div></div>
    <button class="bd" data-del="ill" data-idx="${i}">×</button></div>`});
  h+=`</div>`;
  // MONTHLY REVENUE
  const fcRevTot=_showFC?D.rev.reduce((s,r)=>s+(_fc.revCum[r.id]||0),0):0;
  const fcRevMo=_showFC&&_p1?fcRevTot-D.rev.reduce((s,r)=>s+(_p1.revCum[r.id]||0),0):0;
  const fcRevYr=_showFC&&_p12?fcRevTot-D.rev.reduce((s,r)=>s+(_p12.revCum[r.id]||0),0):0;
  h+=secHd(t('revHd'),'var(--grn)','addRev()',`<span class="sr" style="color:var(--grn)">+${fm(mRev)}${t('mo')}${_showFC?` <span class="fc-vm" id="fc-hd-rev-my">${_mi>=1?`+${fm(fcRevMo)}${_moL} `:''}${_mi>=12?`+${fm(fcRevYr)}${_yrL} `:''}</span><span style="color:var(--mut);font-weight:400">→</span> <span id="fc-hd-rev">+${fm(fcRevTot)}</span>`:''}</span>`);
  if(D.rev.length)h+=`<div class="col-hdr"><span style="flex:1 1 100px;min-width:60px">${t('name')}</span><span style="flex:0 0 100px;text-align:right">${t('perMo')}</span><span style="flex:0 0 72px;text-align:right">${t('growthYr')}</span><span style="flex:0 0 56px"></span></div>`;
  D.rev.forEach((r,i)=>{h+=`<div class="rw${r.disabled?' disabled':''}" draggable="true" data-drag-arr="rev" data-drag-idx="${i}">
    <span class="drag-handle">⠿</span>
    <button class="eye-btn${r.disabled?' off':''}" data-eye="rev" data-idx="${i}">${r.disabled?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}</button>
    <input class="sm" value="${esc(r.name)}" placeholder="${t('name')}" style="flex:1 1 100px;min-width:60px" data-arr="rev" data-idx="${i}" data-fld="name">
    <div style="position:relative;flex:0 0 100px"><span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:11px">${state.CUR}</span><input class="sm" type="number" value="${r.amount||''}" style="padding-left:18px;text-align:right;width:100%" data-arr="rev" data-idx="${i}" data-fld="amount" data-num="1"></div>
    <div class="pct-wrap" style="position:relative;flex:0 0 72px"><input class="sm pct-input" type="text" inputmode="decimal" value="${r.appRate??''}" placeholder="0" style="text-align:right;width:100%;padding-right:22px" data-arr="rev" data-idx="${i}" data-fld="appRate" data-num="1"><span style="position:absolute;right:7px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:10px;font-family:var(--mo)">%</span></div>
    ${_showFC&&!r.disabled?fcV3(_fc.revCum[r.id]||0,_p1?_p1.revCum[r.id]||0:0,_p12?_p12.revCum[r.id]||0:0,'var(--grn)','+','rev',r.id,r.from):''}
    <div class="more-wrap"><button class="more-btn">⋯</button><div class="more-pop">
      <div><label>${t('link')}</label><select class="sm ls" data-arr="rev" data-idx="${i}" data-fld="linkedAssetId">${linkOpts(r.linkedAssetId)}</select></div>
      <div><label>${t('starts')}</label>${ymPicker('rev',i,'from',r.from)}</div>
      <div><label>${t('ends')}</label>${ymPicker('rev',i,'to',r.to)}</div>
      <div style="min-width:120px"><label>Note</label><input class="sm" value="${esc(r.note||'')}" placeholder="Note..." style="width:100%;font-size:11px" data-arr="rev" data-idx="${i}" data-fld="note"></div>
    </div></div>
    <button class="bd" data-del="rev" data-idx="${i}">×</button></div>`});
  h+=`</div>`;
  // MONTHLY COSTS
  const fcCostTot=_showFC?D.cst.reduce((s,c)=>s+(_fc.costCum[c.id]||0),0):0;
  const fcCostMo=_showFC&&_p1?fcCostTot-D.cst.reduce((s,c)=>s+(_p1.costCum[c.id]||0),0):0;
  const fcCostYr=_showFC&&_p12?fcCostTot-D.cst.reduce((s,c)=>s+(_p12.costCum[c.id]||0),0):0;
  h+=secHd(t('costHd'),'var(--red)','addCst()',`<span class="sr" style="color:var(--red)">-${fm(mCost)}${t('mo')}${_showFC?` <span class="fc-vm" id="fc-hd-cst-my">${_mi>=1?`-${fm(fcCostMo)}${_moL} `:''}${_mi>=12?`-${fm(fcCostYr)}${_yrL} `:''}</span><span style="color:var(--mut);font-weight:400">→</span> <span id="fc-hd-cst">-${fm(fcCostTot)}</span>`:''}</span>`);
  if(D.cst.length)h+=`<div class="col-hdr"><span style="flex:1 1 100px;min-width:60px">${t('name')}</span><span style="flex:0 0 100px;text-align:right">${t('perMo')}</span><span style="flex:0 0 72px;text-align:right">${t('infYr')}</span><span style="flex:0 0 56px"></span></div>`;
  D.cst.forEach((c,i)=>{h+=`<div class="rw${c.disabled?' disabled':''}" draggable="true" data-drag-arr="cst" data-drag-idx="${i}">
    <span class="drag-handle">⠿</span>
    <button class="eye-btn${c.disabled?' off':''}" data-eye="cst" data-idx="${i}">${c.disabled?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}</button>
    <input class="sm" value="${esc(c.name)}" placeholder="${t('name')}" style="flex:1 1 100px;min-width:60px" data-arr="cst" data-idx="${i}" data-fld="name">
    <div style="position:relative;flex:0 0 100px"><span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:11px">${state.CUR}</span><input class="sm" type="number" value="${c.amount||''}" style="padding-left:18px;text-align:right;width:100%" data-arr="cst" data-idx="${i}" data-fld="amount" data-num="1"></div>
    <div class="pct-wrap" style="position:relative;flex:0 0 72px"><input class="sm pct-input" type="text" inputmode="decimal" value="${c.appRate??''}" placeholder="0" style="text-align:right;width:100%;padding-right:22px" data-arr="cst" data-idx="${i}" data-fld="appRate" data-num="1"><span style="position:absolute;right:7px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:10px;font-family:var(--mo)">%</span></div>
    ${_showFC&&!c.disabled?fcV3(_fc.costCum[c.id]||0,_p1?_p1.costCum[c.id]||0:0,_p12?_p12.costCum[c.id]||0:0,'var(--red)','-','cst',c.id,c.from):''}
    <div class="more-wrap"><button class="more-btn">⋯</button><div class="more-pop">
      <div><label>${t('link')}</label><select class="sm ls" data-arr="cst" data-idx="${i}" data-fld="linkedAssetId">${linkOpts(c.linkedAssetId)}</select></div>
      <div><label>${t('starts')}</label>${ymPicker('cst',i,'from',c.from)}</div>
      <div><label>${t('ends')}</label>${ymPicker('cst',i,'to',c.to)}</div>
      <div style="min-width:120px"><label>Note</label><input class="sm" value="${esc(c.note||'')}" placeholder="Note..." style="width:100%;font-size:11px" data-arr="cst" data-idx="${i}" data-fld="note"></div>
    </div></div>
    <button class="bd" data-del="cst" data-idx="${i}">×</button></div>`});
  h+=`</div>`;
  // INCOME EVENTS
  h+=secHd(t('ievHd'),'var(--grn)','addIev()','',t('ievHint'));
  if(D.iev.length)h+=`<div class="col-hdr"><span style="flex:1 1 100px;min-width:60px">${t('nameAsset')}</span><span style="flex:0 0 100px;text-align:right">${t('amount')}</span><span style="flex:0 0 56px"></span></div>`;
  D.iev.forEach((ev,i)=>{
    const nameField=ev.type==='sell'?`<select class="sm" style="flex:1 1 100px" data-arr="iev" data-idx="${i}" data-fld="sellAssetId">${sellOpts(ev.sellAssetId)}</select>`:`<input class="sm" value="${esc(ev.name)}" placeholder="${t('name')}" style="flex:1 1 100px;min-width:60px" data-arr="iev" data-idx="${i}" data-fld="name">`;
    const amtField=ev.type!=='sell'?`<div style="position:relative;flex:0 0 100px"><span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:11px">${state.CUR}</span><input class="sm" type="number" value="${ev.amount||''}" placeholder="${ev.type==='loanOut'?t('balance'):'0'}" style="padding-left:18px;text-align:right;width:100%" data-arr="iev" data-idx="${i}" data-fld="amount" data-num="1"></div>`:'<div style="flex:0 0 100px"></div>';
    h+=`<div class="rw${ev.disabled?' disabled':''}" draggable="true" data-drag-arr="iev" data-drag-idx="${i}">
    <span class="drag-handle">⠿</span>
    <button class="eye-btn${ev.disabled?' off':''}" data-eye="iev" data-idx="${i}">${ev.disabled?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}</button>
      ${nameField}${amtField}
      <div class="more-wrap"><button class="more-btn">⋯</button><div class="more-pop">
        <div><label>${t('type')}</label><select class="sm" data-arr="iev" data-idx="${i}" data-fld="type" data-rebuild="1"><option value="cash"${ev.type==='cash'?' selected':''}>${t('cash')}</option><option value="sell"${ev.type==='sell'?' selected':''}>${t('sell')}</option><option value="loanOut"${ev.type==='loanOut'?' selected':''}>${t('loanOut')}</option></select></div>
        <div><label>${t('when')}</label>${ymPicker('iev',i,'date',ev.date)}</div>
        ${ev.type==='loanOut'?`<div><label>${t('rate')}</label><div class="pct-wrap" style="position:relative;width:72px"><input class="sm pct-input" type="text" inputmode="decimal" value="${ev.loanRate??''}" placeholder="0" style="text-align:right;width:100%;padding-right:22px" data-arr="iev" data-idx="${i}" data-fld="loanRate" data-num="1"><span style="position:absolute;right:7px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:10px;font-family:var(--mo)">%</span></div></div>
        <div><label>${t('pmtMo')}</label><div style="position:relative;width:90px"><span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:11px">${state.CUR}</span><input class="sm" type="number" value="${ev.monthlyPmt||''}" placeholder="0" style="padding-left:18px;text-align:right;width:100%" data-arr="iev" data-idx="${i}" data-fld="monthlyPmt" data-num="1"></div></div>`:''}
        <div style="min-width:120px"><label>Note</label><input class="sm" value="${esc(ev.note||'')}" placeholder="Note..." style="width:100%;font-size:11px" data-arr="iev" data-idx="${i}" data-fld="note"></div>
      </div></div>
      <button class="bd" data-del="iev" data-idx="${i}">×</button></div>`});
  if(!D.iev.length)h+=`<p style="font-size:11px;color:var(--mut);text-align:center;padding:4px">${t('none')}</p>`;
  h+=`</div>`;
  // EXPENSE EVENTS
  h+=secHd(t('eevHd'),'var(--red)','addEev()','',t('eevHint'));
  if(D.eev.length)h+=`<div class="col-hdr"><span style="flex:1 1 100px;min-width:60px">${t('name')}</span><span style="flex:0 0 100px;text-align:right">${t('amount')}</span><span style="flex:0 0 56px"></span></div>`;
  D.eev.forEach((ev,i)=>{h+=`<div class="rw${ev.disabled?' disabled':''}" draggable="true" data-drag-arr="eev" data-drag-idx="${i}">
    <span class="drag-handle">⠿</span>
    <button class="eye-btn${ev.disabled?' off':''}" data-eye="eev" data-idx="${i}">${ev.disabled?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'}</button>
      <input class="sm" value="${esc(ev.name)}" placeholder="${t('name')}" style="flex:1 1 100px;min-width:60px" data-arr="eev" data-idx="${i}" data-fld="name">
      <div style="position:relative;flex:0 0 100px"><span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:11px">${state.CUR}</span><input class="sm" type="number" value="${ev.amount||''}" placeholder="${ev.type==='debt'?t('balance'):'0'}" style="padding-left:18px;text-align:right;width:100%" data-arr="eev" data-idx="${i}" data-fld="amount" data-num="1"></div>
      <div class="more-wrap"><button class="more-btn">⋯</button><div class="more-pop">
        <div><label>${t('type')}</label><select class="sm" data-arr="eev" data-idx="${i}" data-fld="type" data-rebuild="1"><option value="expense"${ev.type==='expense'?' selected':''}>${t('expense')}</option><option value="buy"${ev.type==='buy'?' selected':''}>${t('buy')}</option><option value="debt"${ev.type==='debt'?' selected':''}>${t('debt')}</option></select></div>
        <div><label>${t('when')}</label>${ymPicker('eev',i,'date',ev.date)}</div>
        ${ev.type==='debt'?`<div><label>${t('rate')}</label><div class="pct-wrap" style="position:relative;width:72px"><input class="sm pct-input" type="text" inputmode="decimal" value="${ev.appRate??''}" placeholder="0" style="text-align:right;width:100%;padding-right:22px" data-arr="eev" data-idx="${i}" data-fld="appRate" data-num="1"><span style="position:absolute;right:7px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:10px;font-family:var(--mo)">%</span></div></div>
        <div><label>${t('pmtMo')}</label><div style="position:relative;width:90px"><span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:11px">${state.CUR}</span><input class="sm" type="number" value="${ev.monthlyPmt||''}" placeholder="0" style="padding-left:18px;text-align:right;width:100%" data-arr="eev" data-idx="${i}" data-fld="monthlyPmt" data-num="1"></div></div>`:''}
        ${ev.type==='buy'?`<div><label>${t('apprDepr')}</label><div class="pct-wrap" style="position:relative;width:72px"><input class="sm pct-input" type="text" inputmode="decimal" value="${ev.appRate??''}" placeholder="0" style="text-align:right;width:100%;padding-right:22px" data-arr="eev" data-idx="${i}" data-fld="appRate" data-num="1"><span style="position:absolute;right:7px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:10px;font-family:var(--mo)">%</span></div></div>`:''}
        <div style="min-width:120px"><label>Note</label><input class="sm" value="${esc(ev.note||'')}" placeholder="Note..." style="width:100%;font-size:11px" data-arr="eev" data-idx="${i}" data-fld="note"></div>
      </div></div>
      <button class="bd" data-del="eev" data-idx="${i}">×</button></div>`});
  if(!D.eev.length)h+=`<p style="font-size:11px;color:var(--mut);text-align:center;padding:4px">${t('none')}</p>`;
  h+=`</div>`;

  document.getElementById('secs').innerHTML=h;
  bindSections();
}

// ═══════════════ EVENT DELEGATION FOR SECTIONS
// ARRS imported from state.js — kept const; properties mutated by applyDataSnapshot
export function bindSections(){
  const secs=document.getElementById('secs');
  // More tooltips — hover to open, stays open while interacting
  secs.querySelectorAll('.more-wrap').forEach((wrap,wi)=>{
    let timer=null,locked=false;
    const tag=`[tooltip#${wi}]`;
    // Inject close button into the pop
    const pop=wrap.querySelector('.more-pop');
    const closeBtn=document.createElement('button');
    closeBtn.className='more-close';closeBtn.textContent='×';closeBtn.title='Close';
    pop.appendChild(closeBtn);
    const forceClose=()=>{clearTimeout(timer);locked=false;wrap._locked=false;wrap.classList.remove('open')};
    closeBtn.addEventListener('click',e=>{e.stopPropagation();forceClose()});
    const show=(src)=>{clearTimeout(timer);wrap.classList.add('open');
      requestAnimationFrame(()=>{pop.style.left='';pop.style.right='';const r=pop.getBoundingClientRect();const vw=window.innerWidth;const pad=8;if(r.right>vw-pad){pop.style.left=(vw-pad-r.right)+'px';}if(r.left<pad){pop.style.left=(pad-r.left)+'px';}if(r.bottom>window.innerHeight-pad){pop.style.bottom='auto';pop.style.top='calc(100% + 6px)';}});};
    const tryHide=(src)=>{clearTimeout(timer);timer=setTimeout(()=>{
      if(locked||wrap._locked)return;
      const active=document.activeElement;
      if(active&&wrap.contains(active))return;
      wrap.classList.remove('open');
    },300)};
    let hoverDelay=null;
    wrap.querySelector('.more-btn').addEventListener('mouseenter',()=>{clearTimeout(hoverDelay);hoverDelay=setTimeout(()=>show('btn-mouseenter'),500)});
    const moreBtn=wrap.querySelector('.more-btn');
    moreBtn.addEventListener('click',e=>{e.stopPropagation();clearTimeout(hoverDelay);show('btn-click')});
    wrap.addEventListener('mouseleave',()=>{clearTimeout(hoverDelay);tryHide('mouseleave')});
    wrap.addEventListener('mouseenter',()=>{clearTimeout(timer)});
    wrap.querySelectorAll('select').forEach(sel=>{
      sel.addEventListener('mousedown',()=>{locked=true;show('select-mousedown')});
      sel.addEventListener('change',()=>{locked=false;show('select-change')});
      sel.addEventListener('blur',()=>{locked=false;tryHide('select-blur')});
      sel.addEventListener('focus',()=>{locked=true;show('select-focus')});
    });
    wrap.querySelectorAll('input').forEach(inp=>{
      inp.addEventListener('focus',()=>{locked=true;show('input-focus')});
      inp.addEventListener('blur',()=>{locked=false;tryHide('input-blur')});
      inp.addEventListener('change',()=>show('input-change'));
    });
  });
  // Helper: keep parent tooltip open after a change
  function keepTooltipOpen(el){
    const wrap=el.closest('.more-wrap');
    if(wrap){wrap.classList.add('open');wrap._locked=true;setTimeout(()=>{wrap._locked=false},500)}
  }
  // Capture the next intended focus target on mousedown (before blur/change fire)
  let _pendingFocus=null;
  secs.addEventListener('mousedown',e=>{
    const t=e.target.closest('input:not([type="range"]):not(.pct-input),select:not([data-part])');
    if(t&&t.dataset.arr)_pendingFocus={arr:t.dataset.arr,idx:t.dataset.idx,fld:t.dataset.fld};
    else _pendingFocus=null;
  });
  function flashSaved(el){
    if(!el)return;
    el.classList.remove('sv-flash');
    void el.offsetWidth;
    el.classList.add('sv-flash');
    setTimeout(()=>el.classList.remove('sv-flash'),750);
  }
  function flashByAttrs(arr,idx,fld){
    const el=secs.querySelector(`input[data-arr="${arr}"][data-idx="${idx}"][data-fld="${fld}"],select[data-arr="${arr}"][data-idx="${idx}"][data-fld="${fld}"]`);
    flashSaved(el);
  }
  // Input changes (text, number, regular selects — NOT month-year part selects)
  secs.querySelectorAll('input[data-arr],select[data-arr]:not([data-part])').forEach(el=>{
    // Save immediately on every keystroke so re-renders never lose typed data
    if(el.tagName==='INPUT'){
      el.addEventListener('input',()=>{
        const arr=ARRS[el.dataset.arr],idx=+el.dataset.idx,fld=el.dataset.fld;
        if(!arr||!arr[idx])return;
        if(el.dataset.num&&el.value!==''&&el.value!=='-'&&el.value!=='.'&&isNaN(parseFloat(el.value)))return;
        arr[idx][fld]=el.dataset.num?parseFloat(el.value)||0:el.value;
        persist();
        flashSaved(el);
      });
    }
    el.addEventListener('change',()=>{
      const arr=ARRS[el.dataset.arr],idx=+el.dataset.idx,fld=el.dataset.fld;
      if(!arr||!arr[idx])return;
      arr[idx][fld]=el.dataset.num?parseFloat(el.value)||0:el.value;
      persist();
      keepTooltipOpen(el);
      const _a=el.dataset.arr,_i=el.dataset.idx,_f=el.dataset.fld;
      // Text-only fields (name, note, etc.) are already saved by input event and don't affect
      // forecasts — skip re-render so focus is never lost when tabbing between fields
      if(!el.dataset.num&&!el.dataset.rebuild){flashByAttrs(_a,_i,_f);return}
      const pf=_pendingFocus&&(_pendingFocus.arr!==_a||_pendingFocus.idx!==_i||_pendingFocus.fld!==_f)?_pendingFocus:null;
      _pendingFocus=null;
      if(el.dataset.rebuild){const idx=_saveOpenMore();(_runFC&&_runFC());renderSections();(_updateView&&_updateView());_restoreOpenMore(idx)}
      else{(_runFC&&_runFC());(_updateView&&_updateView());renderSectionTotals()}
      if(pf){const t=secs.querySelector(`[data-arr="${pf.arr}"][data-idx="${pf.idx}"][data-fld="${pf.fld}"]`);if(t){t.focus();if(t.select)t.select()}}
      flashByAttrs(_a,_i,_f);
    });
  });
  // Month-year picker selects
  secs.querySelectorAll('select[data-part]').forEach(el=>{
    el.addEventListener('change',()=>{
      const arr=ARRS[el.dataset.arr],idx=+el.dataset.idx,fld=el.dataset.fld,part=el.dataset.part;
      if(!arr||!arr[idx])return;
      const curVal=arr[idx][fld];
      const curD=curVal?new Date(curVal):new Date(NOW.getFullYear(),NOW.getMonth(),1);
      let mo=curD.getMonth(),yr=curD.getFullYear();
      if(part==='m'){const v=parseInt(el.value);if(!isNaN(v))mo=v}
      if(part==='y'){const v=parseInt(el.value);if(!isNaN(v))yr=v}
      if(el.value==='')arr[idx][fld]='';
      else arr[idx][fld]=`${yr}-${String(mo+1).padStart(2,'0')}-01`;
      persist();
      keepTooltipOpen(el);
      const _a=el.dataset.arr,_i=el.dataset.idx,_f=el.dataset.fld;
      const pf=_pendingFocus;_pendingFocus=null;
      (_runFC&&_runFC());(_updateView&&_updateView());renderSectionTotals();
      if(pf){const t=secs.querySelector(`[data-arr="${pf.arr}"][data-idx="${pf.idx}"][data-fld="${pf.fld}"]`);if(t){t.focus();if(t.select)t.select()}}
      flashByAttrs(_a,_i,_f);
    });
  });
  // Delete buttons
  secs.querySelectorAll('[data-del]').forEach(el=>{
    el.addEventListener('click',async()=>{
      const arr=ARRS[el.dataset.del],idx=+el.dataset.idx;
      if(!arr||!arr[idx])return;
      const name=arr[idx].name||'this item';
      if(!await customConfirm(name))return;
      arr.splice(idx,1);
      persist();(_fullUpdate&&_fullUpdate());
    });
  });
  // Percentage slider popups (hover-based, survive during interaction)
  secs.querySelectorAll('.pct-wrap').forEach(wrap=>{
    const inp=wrap.querySelector('.pct-input');
    if(!inp)return;
    let pop=null,hoverTimer=null;
    function showPop(){
      if(pop)return;
      const curVal=parseFloat(inp.value)||0;
      const _mob=window.innerWidth<=680;
      const mn=_mob?-10:curVal-5,mx=_mob?10:curVal+5;
      pop=document.createElement('div');
      pop.className='pct-pop';
      pop.innerHTML=`<button class="pct-dec">◀</button><input type="range" min="${mn}" max="${mx}" step="0.5" value="${curVal}"><span class="pct-pop-val">${curVal.toFixed(1)}%</span><button class="pct-inc">▶</button>`;
      if(_mob){
        pop.classList.add('mob-pop');
        document.body.appendChild(pop);
        const wr=wrap.getBoundingClientRect();
        pop.style.top=(wr.top-pop.offsetHeight-6)+'px';
        requestAnimationFrame(()=>{const pr=pop.getBoundingClientRect();if(pr.top<8)pop.style.top=(wr.bottom+6)+'px';});
      }else{wrap.appendChild(pop);}
      const rng=pop.querySelector('input[type="range"]');
      const valSpan=pop.querySelector('.pct-pop-val');
      const arrName=inp.dataset.arr,idx=+inp.dataset.idx,fld=inp.dataset.fld;
      function apply(v){
        const nv=Math.round(v*2)/2;
        inp.value=nv.toFixed(1);valSpan.textContent=nv.toFixed(1)+'%';rng.value=nv;
        // Update data directly without rebuilding sections
        const arr=ARRS[arrName];
        if(arr&&arr[idx])arr[idx][fld]=nv;
        persist();(_runFC&&_runFC());(_updateView&&_updateView());updateSectionForecasts();flashSaved(inp);
      }
      rng.addEventListener('input',()=>apply(parseFloat(rng.value)));
      pop.querySelector('.pct-dec').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();apply(parseFloat(rng.value)-0.5)});
      pop.querySelector('.pct-inc').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();apply(parseFloat(rng.value)+0.5)});
      pop.addEventListener('mousedown',e=>{if(e.target.type!=='range')e.preventDefault()});
    }
    let enterDelay=null;
    function hidePop(){clearTimeout(enterDelay);hoverTimer=setTimeout(()=>{if(pop){pop.remove();pop=null;(_fullUpdate&&_fullUpdate())}},300)}
    function cancelHide(){clearTimeout(hoverTimer)}
    wrap.addEventListener('mouseenter',()=>{cancelHide();clearTimeout(enterDelay);enterDelay=setTimeout(showPop,500)});
    wrap.addEventListener('mouseleave',hidePop);
    wrap.addEventListener('touchstart',()=>{cancelHide();showPop()},{passive:true});
    // On touch: close other popups when opening this one
    wrap.addEventListener('touchstart',()=>{
      document.querySelectorAll('.pct-pop').forEach(p=>{if(pop&&p!==pop){p.remove()}});
    },{passive:true});
  });

  // Eye toggle (disable/enable for simulation)
  secs.querySelectorAll('[data-eye]').forEach(el=>{
    el.addEventListener('click',()=>{
      const arr=ARRS[el.dataset.eye],idx=+el.dataset.idx;
      if(!arr||!arr[idx])return;
      arr[idx].disabled=!arr[idx].disabled;
      persist();(_fullUpdate&&_fullUpdate());
    });
  });
  // Drag and drop reordering — only from handle
  let dragArr=null,dragIdx=-1,canDrag=false;
  secs.querySelectorAll('.drag-handle').forEach(handle=>{
    handle.addEventListener('mousedown',()=>{canDrag=true});
    handle.addEventListener('touchstart',()=>{canDrag=true},{passive:true});
  });
  document.addEventListener('mouseup',()=>{canDrag=false});
  document.addEventListener('touchend',()=>{canDrag=false});
  secs.querySelectorAll('[data-drag-arr]').forEach(row=>{
    row.addEventListener('dragstart',e=>{
      if(!canDrag){e.preventDefault();return}
      dragArr=row.dataset.dragArr;dragIdx=+row.dataset.dragIdx;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain','');
    });
    row.addEventListener('dragend',()=>{
      row.classList.remove('dragging');canDrag=false;
      secs.querySelectorAll('.drag-over').forEach(r=>r.classList.remove('drag-over'));
      dragArr=null;dragIdx=-1;
    });
    row.addEventListener('dragover',e=>{
      if(row.dataset.dragArr!==dragArr)return;
      e.preventDefault();e.dataTransfer.dropEffect='move';
      secs.querySelectorAll('.drag-over').forEach(r=>r.classList.remove('drag-over'));
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));
    row.addEventListener('drop',e=>{
      e.preventDefault();row.classList.remove('drag-over');
      const toIdx=+row.dataset.dragIdx;
      if(dragArr!==row.dataset.dragArr||dragIdx===toIdx||dragIdx<0)return;
      const arr=ARRS[dragArr];if(!arr)return;
      const item=arr.splice(dragIdx,1)[0];
      arr.splice(toIdx,0,item);
      persist();(_fullUpdate&&_fullUpdate());
    });
  });
}
export function renderSectionTotals(){
  const idx=_saveOpenMore();
  renderSections();
  _restoreOpenMore(idx);
}

// ═══════════════ ADD FUNCTIONS (global, called from onclick)
export function addLiq(){D.liq.push({id:uid(),name:'',value:0,returnRate:0});persist();(_fullUpdate&&_fullUpdate())}
export function addIll(){D.ill.push({id:uid(),name:'',value:0,appRate:0});persist();(_fullUpdate&&_fullUpdate())}
export function addRev(){D.rev.push({id:uid(),name:'',amount:0,from:DF,to:DT,appRate:0,linkedAssetId:''});persist();(_fullUpdate&&_fullUpdate())}
export function addCst(){D.cst.push({id:uid(),name:'',amount:0,from:DF,to:DT,appRate:0,linkedAssetId:''});persist();(_fullUpdate&&_fullUpdate())}
export function addIev(){D.iev.push({id:uid(),type:'cash',name:'',amount:0,date:DF,sellAssetId:''});persist();(_fullUpdate&&_fullUpdate())}
export function addEev(){D.eev.push({id:uid(),type:'expense',name:'',amount:0,date:DF,appRate:0});persist();(_fullUpdate&&_fullUpdate())}
// ═══════════════ HELPERS
export function _saveOpenMore(){const w=[...document.querySelectorAll('.more-wrap')];return w.findIndex(x=>x.classList.contains('open'))}
export function _restoreOpenMore(idx){if(idx>=0){const w=[...document.querySelectorAll('.more-wrap')];if(w[idx])w[idx].classList.add('open')}}
