/* ═══════════════ slider.js — initSlider(), updateSliderPos() ═══════════════ */

import { D, state, fm, fmF, fmT, t, persist, MX, SS, s2m, m2s } from "./state.js";

// Callback injection for circular deps
let _fullUpdate, _renderSections, _updateView;
export function setSliderDeps(deps) {
  _fullUpdate = deps.fullUpdate;
  _renderSections = deps.renderSections;
  _updateView = deps.updateView;
}

export let slDrag=false;
export function initSlider(){
  const trk=document.getElementById('trk'),thumb=document.getElementById('thumb'),fill=document.getElementById('fill'),tip=document.getElementById('tip'),tipT=document.getElementById('tip-t');
  // Build static ticks & labels
  const ty=MX/12,ys=ty<=15?1:ty<=25?2:5;const tks=[];
  for(let yr=0;yr<=ty;yr+=ys){const m2=yr*12;tks.push({yr,pct:(m2s(m2)/SS)*100,label:fmT(m2)})}
  let tkH='';tks.forEach((t,i)=>{tkH+=`<div style="position:absolute;left:${t.pct}%;transform:translateX(-50%);width:1px;height:${i===0?10:6}px;background:${i===0?'var(--mut)':'#d4d0ca'};pointer-events:none"></div>`});
  document.getElementById('ticks').innerHTML=tkH;
  const _lastYr=tks[tks.length-1]?.yr;
  const _slMob=window.innerWidth<=680;
  let lbH='';tks.filter((_,i)=>i%(tks.length>12?2:1)===0).forEach(t=>{
    const isLast=t.yr===_lastYr;
    const lbl=t.yr===0?t.label:t.yr;
    lbH+=`<span style="position:absolute;left:${t.pct}%;transform:translateX(-50%);font-size:9px;font-family:var(--mo);color:${t.yr===0?'var(--txt)':'var(--mut)'};font-weight:${t.yr===0?600:400}"${isLast?' class="sl-last"':''}>${lbl}</span>`});

  const _lblC=document.getElementById('labels');
  _lblC.innerHTML=lbH;
  // Re-add thumb position label
  const _tLbl=document.createElement('span');_tLbl.id='thumb-lbl';
  _tLbl.style.cssText='position:absolute;transform:translateX(-50%);font-size:14px;font-weight:800;font-family:var(--mo);color:var(--acc);white-space:nowrap;pointer-events:none;z-index:1;text-shadow:0 0 6px rgba(37,99,235,.2)';
  _lblC.appendChild(_tLbl);
  // Quick buttons — rendered dynamically so FIRE button can be positioned correctly
  document.getElementById('qbtns').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const m=+b.dataset.qm;if(m>=0){D.sl=Math.min(m,MX);persist();(_fullUpdate&&_fullUpdate());document.getElementById('tip').style.opacity='0'}});

  function posToMonth(e){const r=trk.getBoundingClientRect();const cx=e.touches?e.touches[0].clientX:e.clientX;return s2m(Math.round(Math.max(0,Math.min(1,(cx-r.left)/r.width))*SS))}
  function showTip(){tip.style.opacity='1'}
  function hideTip(){if(!slDrag)tip.style.opacity='0'}

  trk.addEventListener('mousedown',e=>{e.preventDefault();slDrag=true;thumb.classList.add('on');D.sl=posToMonth(e);(_updateView&&_updateView());showTip();trk.focus()});
  trk.addEventListener('touchstart',e=>{e.preventDefault();slDrag=true;thumb.classList.add('on');D.sl=posToMonth(e);(_updateView&&_updateView());showTip();trk.focus()},{passive:false});
  trk.addEventListener('mouseenter',showTip);
  trk.addEventListener('mouseleave',hideTip);
  trk.addEventListener('focus',showTip);
  trk.addEventListener('blur',hideTip);
  trk.addEventListener('keydown',e=>{
    let n=D.sl;const s=e.shiftKey?12:1;
    if(e.key==='ArrowRight'||e.key==='ArrowUp'){n=Math.min(D.sl+s,MX);e.preventDefault()}
    else if(e.key==='ArrowLeft'||e.key==='ArrowDown'){n=Math.max(D.sl-s,0);e.preventDefault()}
    else if(e.key==='Home'){n=0;e.preventDefault()}
    else if(e.key==='End'){n=MX;e.preventDefault()}
    else return;
    D.sl=n;persist();(_fullUpdate&&_fullUpdate())});
  window.addEventListener('mousemove',e=>{if(!slDrag)return;e.preventDefault();D.sl=posToMonth(e);(_updateView&&_updateView())});
  window.addEventListener('touchmove',e=>{if(!slDrag)return;e.preventDefault();D.sl=posToMonth(e);(_updateView&&_updateView())},{passive:false});
  window.addEventListener('mouseup',()=>{if(slDrag){slDrag=false;thumb.classList.remove('on');hideTip();persist();(_renderSections&&_renderSections());(_updateView&&_updateView())}});
  window.addEventListener('touchend',()=>{if(slDrag){slDrag=false;thumb.classList.remove('on');hideTip();persist();(_renderSections&&_renderSections());(_updateView&&_updateView())}});
}

export let _lastFireKey=''; // cache to avoid rebuilding buttons on every drag frame
export function updateSliderPos(){
  const pct=(m2s(D.sl)/SS)*100;
  const cur=state.FC[Math.min(D.sl,state.FC.length-1)];
  document.getElementById('fill').style.width=pct+'%';
  document.getElementById('fill').style.background=`linear-gradient(90deg,var(--acc),${cur.value>=0?'#059669':'#dc2626'})`;
  document.getElementById('fill').style.transition=slDrag?'none':'width .08s';
  document.getElementById('thumb').style.left=pct+'%';
  document.getElementById('thumb').style.transition=slDrag?'none':'all .15s';
  document.getElementById('tip').style.left=`clamp(44px,${pct}%,calc(100% - 44px))`;
  document.getElementById('tip-t').textContent=`${fmF(cur.value)}  ${fmT(D.sl)}`;
  const _tl=document.getElementById('thumb-lbl');
  if(_tl){
    _tl.textContent=fmT(D.sl);
    _tl.style.left=pct+'%';
    // Hide axis labels that overlap with the thumb label (after layout)
    requestAnimationFrame(()=>{
      const tlr=_tl.getBoundingClientRect();
      if(!tlr.width)return;
      document.querySelectorAll('#labels>span:not(#thumb-lbl)').forEach(s=>{
        const sr=s.getBoundingClientRect();
        const overlap=!(sr.right<tlr.left-4||sr.left>tlr.right+4);
        s.style.opacity=overlap?'0':'';
      });
    });
  }
  // Compute all FIRE months
  const mCost=D.cst.reduce((s,c)=>s+(c.amount||0),0);
  const fireNum=mCost>0?(mCost*12)/.04:0;
  const fireVariants=[
    {id:'coast',label:'Coast',num:fireNum?fireNum/Math.pow(1.07,20):0,color:'#0891b2',bg:'#ecfeff'},
    {id:'barista',label:'Barista',num:fireNum?fireNum*0.5:0,color:'#8b5cf6',bg:'#f5f3ff'},
    {id:'lean',label:'Lean',num:fireNum*0.6,color:'#16a34a',bg:'#f0fdf4'},
    {id:'fire',label:'FIRE',num:fireNum,color:'#f59e0b',bg:'#fffbeb'},
    {id:'chubby',label:'Chubby',num:fireNum*1.2,color:'#ea580c',bg:'#fff7ed'},
    {id:'fat',label:'Fat',num:fireNum*1.5,color:'#dc2626',bg:'#fef2f2'}
  ];
  const fireMonths=fireVariants.map(v=>({...v,month:v.num>0?state.FC.findIndex(p=>p.cash>=v.num):-1}));
  const fireKey=fireMonths.map(f=>f.month).join(',');
  // Rebuild button HTML only when any FIRE month changes
  if(fireKey!==_lastFireKey){
    _lastFireKey=fireKey;
    const _tShort=m=>{const y=Math.floor(m/12),mo=m%12;if(!y)return`${mo}${t('moS')}`;if(!mo)return`${y}${t('yrS')}`;return`${y}${t('yrS')}${mo}${t('moS')}`};
    const timeBtns=[{l:t('now')||'Now',m:0},{l:_tShort(6),m:6},{l:_tShort(12),m:12},{l:_tShort(24),m:24},{l:_tShort(60),m:60},{l:_tShort(120),m:120},{l:_tShort(240),m:240},{l:_tShort(360),m:360}];
    let allBtns=timeBtns.map(b=>({...b,fireId:null,fireColor:null,fireBg:null}));
    // Add FIRE buttons
    const _mob=window.innerWidth<=680;
    const _fireIcons={coast:'⛵',barista:'☕',lean:'🌱',fire:'🔥',chubby:'🍔',fat:'👑'};
    const mCost=D.cst.reduce((s,c)=>s+(c.amount||0),0);
    const annualSpend=mCost*12;
    const _fireDescs={
      coast:{sub:'Coast FIRE',desc:'Stop contributing and let compound growth do the work. Your current investments, growing at ~7%/yr, will reach full FIRE in ~20 years without another dollar saved.',detail:n=>`Target: ${fm(n)} (present value of FIRE number)\nMonthly withdraw: $0 — you keep working for expenses only\nAssumes 7% annual real return over 20 years`},
      barista:{sub:'Barista / Flamingo FIRE',desc:'Semi-retire now. Cover about half your expenses with a low-stress part-time job while your portfolio grows to full FIRE. Also known as Flamingo FIRE — save to 50%, then coast for 10-15 years.',detail:n=>`Target: ${fm(n)} (50% of FIRE number)\n4% withdrawal: ${fm(n*0.04)}/yr = ${fm(n*0.04/12)}/mo\nYou still earn ${fm(annualSpend*0.5)}/yr part-time to cover the gap`},
      lean:{sub:'Lean FIRE',desc:'Retire on a minimalist budget. Covers essential expenses only — housing, food, transport, healthcare. No luxury spending.',detail:n=>`Target: ${fm(n)} (60% of FIRE number)\n4% withdrawal: ${fm(n*0.04)}/yr = ${fm(n*0.04/12)}/mo\nCovers ${fm(mCost*0.6)}/mo in living costs`},
      fire:{sub:'FIRE (Financial Independence)',desc:'The standard benchmark. Your investments generate enough passive income to cover all current expenses indefinitely using the 4% safe withdrawal rate.',detail:n=>`Target: ${fm(n)} (annual spend ÷ 4%)\n4% withdrawal: ${fm(annualSpend)}/yr = ${fm(mCost)}/mo\nBased on your current costs of ${fm(mCost)}/mo`},
      chubby:{sub:'Chubby FIRE',desc:'The upper middle class of retirement. More than standard FIRE but not as extravagant as Fat. Covers your current lifestyle plus a comfortable buffer for travel, hobbies, and surprises.',detail:n=>`Target: ${fm(n)} (120% of FIRE number)\n4% withdrawal: ${fm(n*0.04)}/yr = ${fm(n*0.04/12)}/mo\nCovers ${fm(mCost*1.2)}/mo — 20% lifestyle buffer`},
      fat:{sub:'Fat FIRE',desc:'Retire with a generous lifestyle buffer. Travel, hobbies, dining out, and unexpected expenses are all comfortably covered. The gold standard for worry-free retirement.',detail:n=>`Target: ${fm(n)} (150% of FIRE number)\n4% withdrawal: ${fm(n*0.04)}/yr = ${fm(n*0.04/12)}/mo\nCovers ${fm(mCost*1.5)}/mo — 50% more than current costs`}
    };
    for(const fv of fireMonths){
      if(fv.month<=0)continue;
      const existing=allBtns.find(b=>b.m===fv.month);
      const fLabel=_tShort(fv.month);
      const ico=_fireIcons[fv.id]||'🔥';
      const fdesc=_fireDescs[fv.id]||{sub:'',desc:'',detail:()=>''};
      if(existing){
        existing.fireId=fv.id;existing.fireColor=fv.color;existing.fireBg=fv.bg;existing.fireDesc=fdesc;existing.fireNum=fv.num;
        existing.l=_mob?`${ico}${existing.l}`:`${ico} ${fv.label} ${existing.l}`;
      }else{
        allBtns.push({l:_mob?`${ico}${fLabel}`:`${ico} ${fv.label} ${fLabel}`,m:fv.month,fireId:fv.id,fireColor:fv.color,fireBg:fv.bg,fireDesc:fdesc,fireNum:fv.num});
      }
    }
    allBtns.sort((a,b)=>a.m-b.m);
    let qH='';allBtns.forEach(b=>{
      const attrs=b.fireId?` data-fire="${b.fireId}" data-fc="${b.fireColor}" data-fb="${b.fireBg}"`:'';
      const tipHtml=b.fireId&&b.fireDesc?`<span class="qb-tip" style="display:none;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:var(--card);border:1px solid var(--brd);border-radius:10px;padding:12px 16px;font-size:11px;font-weight:400;color:var(--txt);white-space:normal;width:280px;box-shadow:0 8px 30px rgba(0,0,0,.15);z-index:60;font-family:var(--fn);pointer-events:none;line-height:1.5;text-align:left"><div style="font-size:13px;font-weight:700;color:${b.fireColor};margin-bottom:4px">${b.fireDesc.sub}</div><div style="font-size:20px;font-weight:800;font-family:var(--mo);color:${b.fireColor};margin-bottom:6px">${fm(b.fireNum)}</div><div style="margin-bottom:8px;color:var(--txt)">${b.fireDesc.desc}</div><div style="font-size:10px;font-family:var(--mo);color:var(--mut);white-space:pre-line;border-top:1px solid var(--brd);padding-top:6px">${b.fireDesc.detail(b.fireNum)}</div></span>`:'';
      qH+=`<button data-qm="${b.m}"${attrs} style="position:relative">${b.l}${tipHtml}</button>`;
    });
    document.getElementById('qbtns').innerHTML=qH;
    // Wire hover tooltips for FIRE buttons
    document.querySelectorAll('#qbtns button[data-fire]').forEach(btn=>{
      let tipTimer=null;
      btn.addEventListener('mouseenter',()=>{tipTimer=setTimeout(()=>{const tip=btn.querySelector('.qb-tip');if(tip){tip.style.display='block';requestAnimationFrame(()=>{const r=tip.getBoundingClientRect();if(r.left<8)tip.style.transform=`translateX(${8-r.left}px)`;if(r.right>window.innerWidth-8)tip.style.transform=`translateX(${window.innerWidth-8-r.right}px)`})}},400)});
      btn.addEventListener('mouseleave',()=>{clearTimeout(tipTimer);const tip=btn.querySelector('.qb-tip');if(tip)tip.style.display='none'});
      btn.addEventListener('click',()=>{clearTimeout(tipTimer);const tip=btn.querySelector('.qb-tip');if(tip)tip.style.display='none'});
    });
  }
  // Update button styles (cheap — no innerHTML)
  document.querySelectorAll('#qbtns button').forEach(b=>{
    const m=+b.dataset.qm;const active=D.sl===m;
    const fc=b.dataset.fc;const fb=b.dataset.fb;
    if(fc){
      b.style.background=active?fc:fb;
      b.style.border=(active?'1.5px':'1px')+` solid ${fc}`;
      b.style.color=active?'#fff':fc;
      b.style.fontWeight=active?'700':'600';
    }else{
      b.style.border=active?'1.5px solid var(--acc)':'1px solid var(--brd)';
      b.style.background=active?'var(--acc-lt)':'var(--card)';
      b.style.color=active?'var(--acc)':'var(--mut)';
    }
  });
}

