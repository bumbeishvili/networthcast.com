/* ═══════════════ profiles.js — Profiles save/load, export/import/share, data menu, compress/decompress ═══════════════ */

import { D, state, ARRS, CURRENCIES, esc, fm, persist, customConfirm } from "./state.js";

// Callback injection for circular deps
let _fullUpdate;
export function setProfileDeps(deps) {
  _fullUpdate = deps.fullUpdate;
}

// ═══════════════ PROFILES (save/load/search multiple datasets)
export const PROFILES_KEY='networthcast_profiles';
export function loadProfiles(){try{return JSON.parse(localStorage.getItem(PROFILES_KEY))||[]}catch{return[]}}
export function saveProfiles(profiles){try{localStorage.setItem(PROFILES_KEY,JSON.stringify(profiles))}catch{}}
export function getDataSnapshot(){
  return{liquidAssets:D.liq,ownedAssets:D.ill,revs:D.rev,costs:D.cst,incomeEvents:D.iev,expenseEvents:D.eev,slider:D.sl,famSize:D.fam,curTax:D.curTax,currency:D.cur,sessionName:D.sessionName};
}
export function applyDataSnapshot(data,profileId){
  D.liq=data.liquidAssets||[];D.ill=data.ownedAssets||[];D.rev=data.revs||[];D.cst=data.costs||[];
  D.iev=data.incomeEvents||[];D.eev=data.expenseEvents||[];D.sl=data.slider||0;
  D.fam=data.famSize||'solo';D.curTax=data.curTax??24;D.cur=data.currency||'USD';
  D.sessionName=data.sessionName||'';
  D.activeProfileId=profileId||null;
  // Sync ARRS references so event handlers always target the current arrays
  ARRS.liq=D.liq;ARRS.ill=D.ill;ARRS.rev=D.rev;ARRS.cst=D.cst;ARRS.iev=D.iev;ARRS.eev=D.eev;
  state.CUR=CURRENCIES[D.cur]||'$';
  const cs=document.getElementById('cur-switcher');if(cs)cs.value=D.cur;
  const sn=document.getElementById('session-name');if(sn)sn.value=D.sessionName;
  persist();(_fullUpdate&&_fullUpdate());
}
export function genProfileId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

// ═══════════════ SHARE VIA URL
export async function compressData(obj){
  const json=JSON.stringify(obj);
  const blob=new Blob([json]);
  const cs=new CompressionStream('deflate');
  const stream=blob.stream().pipeThrough(cs);
  const buf=await new Response(stream).arrayBuffer();
  // base64url encode
  let b='';const bytes=new Uint8Array(buf);
  for(let i=0;i<bytes.length;i++)b+=String.fromCharCode(bytes[i]);
  return btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export async function decompressData(str){
  // base64url decode
  let b64=str.replace(/-/g,'+').replace(/_/g,'/');
  while(b64.length%4)b64+='=';
  const raw=atob(b64);
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const ds=new DecompressionStream('deflate');
  const stream=new Blob([bytes]).stream().pipeThrough(ds);
  const text=await new Response(stream).text();
  return JSON.parse(text);
}

document.getElementById('btn-share')?.addEventListener('click',async()=>{
  const btn=document.getElementById('btn-share');
  try{
    const snap=getDataSnapshot();
    const compressed=await compressData(snap);
    const url=new URL(window.location);
    url.hash='d='+compressed;
    // Preserve language param, remove everything else
    const _lang=url.searchParams.get('lang');
    url.search='';
    if(_lang&&_lang!=='en')url.searchParams.set('lang',_lang);
    await navigator.clipboard.writeText(url.toString());
    // Visual feedback — toast
    btn.style.color='#059669';
    const toast=document.createElement('div');
    toast.textContent='Share link copied to clipboard';
    toast.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#059669;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;font-family:var(--fn);z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.15);opacity:0;transition:opacity .2s';
    document.body.appendChild(toast);
    requestAnimationFrame(()=>toast.style.opacity='1');
    setTimeout(()=>{toast.style.opacity='0';setTimeout(()=>toast.remove(),300)},2500);
    setTimeout(()=>{btn.style.color=''},2500);
  }catch(e){
    console.error('Share failed:',e);
    btn.style.color='#dc2626';
    const toast=document.createElement('div');
    toast.textContent='Failed to copy share link';
    toast.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#dc2626;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:600;font-family:var(--fn);z-index:99999;box-shadow:0 6px 20px rgba(0,0,0,.15);opacity:0;transition:opacity .2s';
    document.body.appendChild(toast);
    requestAnimationFrame(()=>toast.style.opacity='1');
    setTimeout(()=>{toast.style.opacity='0';setTimeout(()=>toast.remove(),300)},2500);
    setTimeout(()=>{btn.style.color='';btn.title='Share via link'},2000);
  }
});

// On page load: detect shared data in URL hash
(async function loadSharedData(){
  const hash=window.location.hash;
  if(!hash||!hash.startsWith('#d='))return;
  try{
    const data=await decompressData(hash.slice(3));
    if(data&&(data.liquidAssets||data.ownedAssets||data.revs)){
      applyDataSnapshot(data);
      // Clean hash from URL without reload
      history.replaceState(null,'',window.location.pathname+window.location.search);
    }
  }catch(e){console.error('Failed to load shared data:',e)}
})();

// ═══════════════ EXPORT
document.getElementById('btn-export')?.addEventListener('click',()=>{
  const profiles=loadProfiles();
  if(!profiles.length){
    // No profiles — export current data directly
    exportData(getDataSnapshot(),'networthcast');
    return;
  }
  // Show modal to pick which profiles to export
  showExportModal(profiles);
});
export function exportData(data,name){
  const payload={
    meta:{app:'NetWorthCast',version:'2.0',exportedAt:new Date().toISOString(),currency:data.currency||D.cur},
    data:data
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`${name.replace(/[^a-zA-Z0-9_-]/g,'_')}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();URL.revokeObjectURL(a.href);
}
export function showExportModal(profiles){
  const m=document.createElement('div');
  m.id='profile-modal';m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center';
  let h=`<div style="background:var(--card);border-radius:16px;max-width:400px;width:calc(100% - 32px);padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2);position:relative;max-height:80vh;overflow-y:auto">
    <button onclick="this.closest('#profile-modal').remove()" style="position:absolute;top:10px;right:14px;background:0;border:0;font-size:20px;cursor:pointer;color:var(--mut)">&times;</button>
    <div style="font-weight:700;font-size:14px;margin-bottom:12px">Export Profiles</div>
    <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer;border-bottom:1px solid var(--brd)">
      <input type="checkbox" checked data-exp="current"> <strong>Current session</strong>
    </label>`;
  profiles.forEach((p,i)=>{
    h+=`<label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer;border-bottom:1px solid var(--brd)">
      <input type="checkbox" checked data-exp-idx="${i}"> ${esc(p.name)} <span style="font-size:10px;color:var(--mut)">${p.savedAt?.slice(0,10)||''}</span>
    </label>`;
  });
  h+=`<button id="exp-go" style="margin-top:12px;width:100%;background:var(--acc);color:#fff;border:0;border-radius:8px;padding:8px;font-size:13px;font-weight:600;cursor:pointer">Export Selected</button></div>`;
  m.innerHTML=h;document.body.appendChild(m);
  m.addEventListener('click',e=>{if(e.target===m)m.remove()});
  document.getElementById('exp-go').addEventListener('click',()=>{
    const result={};
    if(m.querySelector('[data-exp]:checked'))result.current=getDataSnapshot();
    profiles.forEach((p,i)=>{if(m.querySelector(`[data-exp-idx="${i}"]:checked`))result[p.name]=p.data});
    const payload={meta:{app:'NetWorthCast',version:'2.0',exportedAt:new Date().toISOString()},profiles:result};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`networthcast_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
    m.remove();
  });
}

// ═══════════════ IMPORT
document.getElementById('btn-import')?.addEventListener('click',()=>document.getElementById('file-import').click());
document.getElementById('file-import')?.addEventListener('change',e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const json=JSON.parse(reader.result);
      if(json.profiles){
        // Multi-profile import
        const names=Object.keys(json.profiles);
        if(names.length===1){applyDataSnapshot(json.profiles[names[0]]);return}
        showImportPickerModal(json.profiles);
      }else if(json.data){
        applyDataSnapshot(json.data);
      }else{
        // Try as raw data
        applyDataSnapshot(json);
      }
    }catch(err){alert('Invalid file: '+err.message)}
  };
  reader.readAsText(file);
  e.target.value='';
});
export function showImportPickerModal(profiles){
  const m=document.createElement('div');
  m.id='profile-modal';m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center';
  const names=Object.keys(profiles);
  let h=`<div style="background:var(--card);border-radius:16px;max-width:400px;width:calc(100% - 32px);padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2);position:relative">
    <button onclick="this.closest('#profile-modal').remove()" style="position:absolute;top:10px;right:14px;background:0;border:0;font-size:20px;cursor:pointer;color:var(--mut)">&times;</button>
    <div style="font-weight:700;font-size:14px;margin-bottom:12px">Choose profile to load</div>`;
  names.forEach(n=>{
    h+=`<button class="imp-pick" data-name="${esc(n)}" style="display:block;width:100%;text-align:left;background:var(--bg);border:1px solid var(--brd);border-radius:8px;padding:8px 12px;margin-bottom:6px;cursor:pointer;font-size:13px;font-family:var(--fn)">${esc(n)}</button>`;
  });
  h+=`</div>`;m.innerHTML=h;document.body.appendChild(m);
  m.addEventListener('click',e=>{if(e.target===m)m.remove()});
  m.querySelectorAll('.imp-pick').forEach(btn=>{
    btn.addEventListener('click',()=>{applyDataSnapshot(profiles[btn.dataset.name]);m.remove()});
  });
}

// ═══════════════ DATA MENU (toggle dropdown)
(function(){
  const menuBtn=document.getElementById('data-menu-btn');
  const menuPop=document.getElementById('data-menu-pop');
  if(!menuBtn||!menuPop)return;
  menuBtn.addEventListener('click',e=>{e.stopPropagation();menuPop.style.display=menuPop.style.display==='none'?'block':'none'});
  document.addEventListener('click',e=>{if(!menuPop.contains(e.target)&&e.target!==menuBtn)menuPop.style.display='none'});
  // Close menu when any item is clicked (except save which opens its own modal)
  menuPop.querySelectorAll('.dm-item').forEach(btn=>{btn.addEventListener('click',()=>{menuPop.style.display='none'})});
})();

// ═══════════════ SAVE/LOAD PROFILES
const _saveBtn=document.getElementById('btn-save');
_saveBtn.addEventListener('click',()=>{
  const profiles=loadProfiles();
  const m=document.createElement('div');
  m.id='profile-modal';m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center';
  let h=`<div style="background:var(--card);border-radius:16px;max-width:420px;width:calc(100% - 32px);padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2);position:relative;max-height:80vh;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden">
    <button onclick="this.closest('#profile-modal').remove()" style="position:absolute;top:10px;right:14px;background:0;border:0;font-size:20px;cursor:pointer;color:var(--mut)">&times;</button>
    <div style="font-weight:700;font-size:14px;margin-bottom:10px">Saved</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
      <input id="prof-name" class="sm" placeholder="Profile name..." value="${esc(D.sessionName)}" style="flex:1 1 150px;min-width:0;font-size:13px;padding:8px 10px">
      <button id="prof-save-btn" style="background:var(--acc);color:#fff;border:0;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;flex:0 0 auto">Save</button>
      <button id="prof-fresh-btn" style="background:var(--bg);color:var(--mut);border:1px solid var(--brd);border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;flex:0 0 auto">New</button>
    </div>
    <input id="prof-search" class="sm" placeholder="Search profiles..." style="width:100%;font-size:12px;padding:6px 10px;margin-bottom:8px;box-sizing:border-box;${profiles.length<3?'display:none':''}">
    <div id="prof-list" style="overflow-y:auto;flex:1;max-height:50vh">`;
  if(!profiles.length){
    h+=`<p style="font-size:12px;color:var(--mut);text-align:center;padding:16px 0">No saved profiles yet</p>`;
  }
  profiles.forEach((p,i)=>{
    const nw=fm(p.summary?.netWorth||0);
    const isActive=D.activeProfileId&&p.id===D.activeProfileId;
    h+=`<div class="prof-item" data-idx="${i}" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid ${isActive?'var(--acc)':'var(--brd)'};border-radius:8px;margin-bottom:4px;cursor:pointer;transition:border-color .15s;background:${isActive?'var(--acc-lt)':''}">
      <div style="min-width:0"><div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}${isActive?' <span style="font-size:9px;background:var(--acc);color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px;vertical-align:middle">active</span>':''}</div>
      <div style="font-size:10px;color:var(--mut);font-family:var(--mo)">${p.savedAt?.slice(0,10)||''} · ${nw}</div></div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        <button class="prof-load" data-idx="${i}" data-id="${p.id||''}" style="background:var(--acc-lt);color:var(--acc);border:0;border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer">${isActive?'Reload':'Load'}</button>
        <button class="prof-del" data-idx="${i}" style="background:var(--red-bg);color:var(--red);border:0;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer">×</button>
      </div></div>`;
  });
  h+=`</div></div>`;
  m.innerHTML=h;document.body.appendChild(m);
  m.addEventListener('click',e=>{if(e.target===m)m.remove()});
  // Save
  document.getElementById('prof-save-btn').addEventListener('click',()=>{
    const name=document.getElementById('prof-name').value.trim();
    if(!name){document.getElementById('prof-name').focus();return}
    const snap=getDataSnapshot();
    const summary={netWorth:state.FC.length?state.FC[0].value:0,liqTotal:D.liq.reduce((s,a)=>s+(a.value||0),0),illTotal:D.ill.reduce((s,a)=>s+(a.value||0),0)};
    // If a profile is currently loaded, update it by ID; otherwise match by name or create new
    const byId=D.activeProfileId?profiles.findIndex(p=>p.id===D.activeProfileId):-1;
    if(byId>=0){
      profiles[byId]={...profiles[byId],name,data:snap,summary,savedAt:new Date().toISOString()};
      D.sessionName=name;
    }else{
      const byName=profiles.findIndex(p=>p.name===name);
      if(byName>=0){profiles[byName]={...profiles[byName],name,data:snap,summary,savedAt:new Date().toISOString()}}
      else{const id=genProfileId();profiles.push({id,name,data:snap,summary,savedAt:new Date().toISOString()});D.activeProfileId=id}
    }
    saveProfiles(profiles);m.remove();_saveBtn.click();
  });
  // Start Fresh
  document.getElementById('prof-fresh-btn').addEventListener('click',()=>{
    if(!confirm('Start a blank profile? Any unsaved changes will be lost.'))return;
    applyDataSnapshot({liquidAssets:[],ownedAssets:[],revs:[],costs:[],incomeEvents:[],expenseEvents:[],slider:0,famSize:'solo',curTax:24,currency:D.cur,sessionName:''},null);
    m.remove();
  });
  // Search
  document.getElementById('prof-search')?.addEventListener('input',e=>{
    const q=e.target.value.toLowerCase();
    m.querySelectorAll('.prof-item').forEach(el=>{
      const name=el.querySelector('div div')?.textContent?.toLowerCase()||'';
      el.style.display=name.includes(q)?'flex':'none';
    });
  });
  // Load
  m.querySelectorAll('.prof-load').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const idx=+btn.dataset.idx;
      if(profiles[idx]){
        // Ensure profile has an id (backfill for old profiles)
        if(!profiles[idx].id){profiles[idx].id=genProfileId();saveProfiles(profiles)}
        applyDataSnapshot(profiles[idx].data,profiles[idx].id);
        m.remove();
      }
    });
  });
  // Delete (with confirmation)
  m.querySelectorAll('.prof-del').forEach(btn=>{
    btn.addEventListener('click',async e=>{
      e.stopPropagation();
      const idx=+btn.dataset.idx;
      const name=profiles[idx]?.name||'this profile';
      if(!await customConfirm(name))return;
      profiles.splice(idx,1);saveProfiles(profiles);m.remove();_saveBtn.click();
    });
  });
});

