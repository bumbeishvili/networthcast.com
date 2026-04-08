/* ═══════════════ state.js — Shared state, constants, utilities, persistence, customConfirm ═══════════════ */

import { t, S, LANG } from './i18n.js';

// Re-export i18n essentials so other modules can import from state.js
export { t, LANG };

// ═══════════════ UTILS
export const uid=()=>Math.random().toString(36).slice(2,9);
export const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export const CURRENCIES={USD:'$',EUR:'€',GBP:'£',JPY:'¥',CNY:'¥',KRW:'₩',INR:'₹',TRY:'₺',RUB:'₽',UAH:'₴',GEL:'₾',PLN:'zł',CZK:'Kč',SEK:'kr',NOK:'kr',DKK:'kr',CHF:'Fr',BRL:'R$',AUD:'A$',CAD:'C$',THB:'฿',VND:'₫',IDR:'Rp',MYR:'RM',BDT:'৳',PHP:'₱',SGD:'S$',HKD:'HK$',TWD:'NT$',ARS:'$',MXN:'$',COP:'$',PEN:'S/'};

// Shared mutable state object — properties reassigned, object never reassigned
export const state = { FC: [], CUR: '$' };

export const NOW=new Date(),MX=360,DF=NOW.toISOString().slice(0,10);
export const DT=new Date(NOW.getFullYear()+30,NOW.getMonth(),NOW.getDate()).toISOString().slice(0,10);
export const SS=1000;
export const s2m=s=>Math.round(MX*(s/SS)**2);
export const m2s=m=>Math.round(SS*Math.sqrt(m/MX));

export function fm(n,precise){if(n==null||isNaN(n))return state.CUR+'0';const s=n<0?'-':'',a=Math.abs(n);if(a>=1e6){const d=a>=100e6?1:a>=10e6?2:3;return s+state.CUR+(a/1e6).toFixed(precise?Math.max(d,2):d)+'M'}if(a>=1e3){const d=a>=100e3?0:1;return s+state.CUR+(a/1e3).toFixed(precise?Math.max(d,1):d)+'k'}return s+state.CUR+Math.round(a).toLocaleString()}
export function fmF(n){if(n==null||isNaN(n))return state.CUR+'0';return(n<0?'-'+state.CUR:state.CUR)+Math.abs(Math.round(n)).toLocaleString()}
export function fmT(m){if(m<=0)return t('now');const y=Math.floor(m/12),mo=m%12;const tNow=t('now'),tMo=t('inMo'),tYr=t('inYr'),tYrMo=t('inYrMo');if(!y)return tMo.replace('{m}',mo);if(!mo)return tYr.replace('{y}',y);return tYrMo.replace('{y}',y).replace('{m}',mo)}

export function customConfirm(name){
  return new Promise(resolve=>{
    const ov=document.createElement('div');ov.className='cd-overlay';
    ov.innerHTML=`<div class="cd-box"><div class="cd-icon">🗑️</div><div class="cd-title">Delete "${name}"?</div><div class="cd-msg">This action cannot be undone.</div><div class="cd-btns"><button class="cd-cancel">Cancel</button><button class="cd-confirm">Delete</button></div></div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(()=>ov.classList.add('show'));
    const close=(result)=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),150);resolve(result)};
    ov.querySelector('.cd-cancel').addEventListener('click',()=>close(false));
    ov.querySelector('.cd-confirm').addEventListener('click',()=>close(true));
    ov.addEventListener('click',e=>{if(e.target===ov)close(false)});
  });
}

export const SK='networthcast_v2';

export function load(){try{const r=localStorage.getItem(SK);return r?JSON.parse(r):null}catch{return null}}
export function persist(){try{localStorage.setItem(SK,JSON.stringify({liquidAssets:D.liq,ownedAssets:D.ill,revs:D.rev,costs:D.cst,incomeEvents:D.iev,expenseEvents:D.eev,slider:D.sl,famSize:D.fam,curTax:D.curTax,currency:D.cur,sessionName:D.sessionName}))}catch{}}

const y1=String(NOW.getFullYear()+1),y3=String(NOW.getFullYear()+3),y5=String(NOW.getFullYear()+5);

// ═══════════════ STATE
const sv=load()||{};
export const D={
  liq:sv.liquidAssets||[
    {id:'idx_001',name:S.brk,value:22000,returnRate:9},
    {id:'cash_001',name:S.chk,value:8500,returnRate:0},
    {id:'sav_001',name:S.emf,value:15000,returnRate:4.5},
    {id:'sp5_001',name:S.ret,value:85000,returnRate:8}],
  ill:sv.ownedAssets||[
    {id:'home_001',name:S.home,value:380000,appRate:3.5},
    {id:'car_001',name:S.car,value:24000,appRate:-12}],
  rev:sv.revs||[
    {id:uid(),name:S.sal,amount:7200,from:DF,to:DT,appRate:3,linkedAssetId:''},
    {id:uid(),name:S.side,amount:800,from:DF,to:DT,appRate:0,linkedAssetId:''}],
  cst:sv.costs||[
    {id:uid(),name:S.mort,amount:2100,from:DF,to:DT,appRate:0,linkedAssetId:'home_001'},
    {id:uid(),name:S.groc,amount:650,from:DF,to:DT,appRate:4,linkedAssetId:''},
    {id:uid(),name:S.carPay,amount:580,from:DF,to:`${y5}-01-01`,appRate:0,linkedAssetId:'car_001'},
    {id:uid(),name:S.util,amount:280,from:DF,to:DT,appRate:3,linkedAssetId:''},
    {id:uid(),name:S.health,amount:350,from:DF,to:DT,appRate:6,linkedAssetId:''},
    {id:uid(),name:S.gas,amount:250,from:DF,to:DT,appRate:3,linkedAssetId:''},
    {id:uid(),name:S.subs,amount:180,from:DF,to:DT,appRate:3,linkedAssetId:''},
    {id:uid(),name:S.dine,amount:400,from:DF,to:DT,appRate:3,linkedAssetId:''},
    {id:uid(),name:S.misc,amount:300,from:DF,to:DT,appRate:3,linkedAssetId:''}],
  iev:sv.incomeEvents||[
    {id:uid(),type:'cash',name:S.taxRef,amount:3200,date:`${y1}-04-15`,sellAssetId:''},
    {id:uid(),type:'cash',name:S.bonus,amount:6000,date:`${y1}-12-15`,sellAssetId:''}],
  eev:sv.expenseEvents||[
    {id:uid(),type:'expense',name:S.vac,amount:5000,date:`${y1}-07-01`,appRate:0},
    {id:uid(),type:'expense',name:S.repair,amount:8000,date:`${y1}-10-01`,appRate:0},
    {id:uid(),type:'buy',name:S.reno,amount:15000,date:`${String(NOW.getFullYear()+2)}-03-01`,appRate:5}],
  sl:sv.slider??0,
  fam:sv.famSize||'solo',
  curTax:sv.curTax??24,
  cur:sv.currency||'USD',
  sessionName:sv.sessionName||'',
  relOpen:false,
  relExp:null
};
state.CUR=CURRENCIES[D.cur]||'$';

// ARRS — properties mutated by applyDataSnapshot
export const ARRS={liq:D.liq,ill:D.ill,rev:D.rev,cst:D.cst,iev:D.iev,eev:D.eev};
