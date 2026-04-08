/* ═══════════════ app.js — Entry point: fullUpdate(), updateView(), init, PWA install ═══════════════ */

import { D, state, CURRENCIES, fm, fmT, t, LANG, persist } from './state.js';
import { COL, colTot } from './i18n.js';
import { runFC } from './forecast.js';
import { drawChart } from './chart.js';
import { initSlider, updateSliderPos, setSliderDeps } from './slider.js';
import { renderSections, renderBreakdown, renderRelocate, updateSectionForecasts,
         addLiq, addIll, addRev, addCst, addIev, addEev,
         _saveOpenMore, _restoreOpenMore, setSectionDeps } from './sections.js';
import { setProfileDeps } from './profiles.js';

// ═══════════════ UPDATE VIEW (called during slider drag — no innerHTML on sections)
function updateView(){
  const cur=state.FC[Math.min(D.sl,state.FC.length-1)];
  const mCost=D.cst.reduce((s,c)=>s+(c.amount||0),0);
  // Hero — cleared, info moved to chart labels
  document.getElementById('h-label').innerHTML='';
  document.getElementById('h-val').textContent='';
  document.getElementById('h-sub').textContent='';
  document.getElementById('h-fire').innerHTML='';
  // Slider position
  updateSliderPos();
  // Chart
  drawChart();
  // Breakdown
  renderBreakdown();
  // Relocate count
  const mRev=D.rev.reduce((s,r)=>s+(r.amount||0),0);
  const curAfterTax=mRev*(1-(D.curTax||0)/100);
  const affCnt=COL.filter(c=>{const destAT=mRev*(1-(c.tax||0)/100);return destAT>=colTot(c,D.fam)}).length;
  document.getElementById('rel-cnt').textContent=`${affCnt} of ${COL.length} cities`;
  // If relocate is open, re-render it
  if(D.relOpen)renderRelocate();
  // Live forecast values in sections
  updateSectionForecasts();
}

// ═══════════════ FULL UPDATE (recalc + render everything)
function fullUpdate(){
  const idx=_saveOpenMore();
  runFC();renderSections();updateView();
  _restoreOpenMore(idx);
}

// ═══════════════ Wire up circular dependencies
setSliderDeps({ fullUpdate, renderSections, updateView });
setSectionDeps({ fullUpdate, runFC, updateView, drawChart });
setProfileDeps({ fullUpdate });

// ═══════════════ Attach onclick handlers to window (used in HTML strings)
window.addLiq = addLiq;
window.addIll = addIll;
window.addRev = addRev;
window.addCst = addCst;
window.addIev = addIev;
window.addEev = addEev;

// ═══════════════ INIT
// Apply i18n to static elements
if(LANG!=='en'){
  const np=document.getElementById('nav-pillars');if(np)np.textContent=t('pillars');
  const rt=document.getElementById('rel-title');if(rt)rt.textContent=t('relocHd');
}
// Session name
const _sn=document.getElementById('session-name');
if(_sn){
  _sn.value=D.sessionName;
  _sn.addEventListener('input',()=>{D.sessionName=_sn.value;persist()});
  _sn.addEventListener('focus',()=>{document.getElementById('session-name-hint').style.opacity='0'});
  _sn.addEventListener('blur',()=>{document.getElementById('session-name-hint').style.opacity=_sn.value?'0':'1'});
  _sn.parentElement.addEventListener('mouseenter',()=>{if(!_sn.value)document.getElementById('session-name-hint').style.opacity='1'});
  _sn.parentElement.addEventListener('mouseleave',()=>{if(document.activeElement!==_sn)document.getElementById('session-name-hint').style.opacity='0'});
}
// Currency switcher
const _cs=document.getElementById('cur-switcher');
if(_cs){
  _cs.value=D.cur;
  _cs.addEventListener('change',()=>{
    D.cur=_cs.value;
    state.CUR=CURRENCIES[D.cur]||'$';
    persist();fullUpdate();
  });
}
// Language switcher
const _ls=document.getElementById('lang-switcher');
if(_ls){
  _ls.value=LANG;
  _ls.addEventListener('change',()=>{
    const newLang=_ls.value;
    const url=new URL(window.location);
    if(newLang==='en')url.searchParams.delete('lang');
    else url.searchParams.set('lang',newLang);
    window.location.href=url.toString();
  });
}
runFC();
initSlider();
renderSections();
updateView();
window.addEventListener('resize',()=>drawChart());

// ═══════════════ SERVICE WORKER & PWA INSTALL
if('serviceWorker'in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}
const _isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&'ontouchend'in document);
const _isSafari=/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const _isStandalone=window.matchMedia('(display-mode:standalone)').matches||navigator.standalone;
let _deferredPrompt=null;

const _pwaInstalled=_isStandalone||localStorage.getItem('pwa_installed')==='1';

if((_isIOS||_isSafari)&&!_pwaInstalled){
  const btn=document.getElementById('pwa-install');
  if(btn)btn.style.display='inline-flex';
}

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  if(_pwaInstalled)return;
  _deferredPrompt=e;
  const btn=document.getElementById('pwa-install');
  if(btn)btn.style.display='inline-flex';
});

document.getElementById('pwa-install')?.addEventListener('click',async()=>{
  if(_deferredPrompt){
    _deferredPrompt.prompt();
    const{outcome}=await _deferredPrompt.userChoice;
    _deferredPrompt=null;
    if(outcome==='accepted')localStorage.setItem('pwa_installed','1');
    document.getElementById('pwa-install').style.display='none';
  }else{
    const modal=document.getElementById('ios-modal');
    if(modal)modal.style.display='flex';
  }
});

document.getElementById('ios-modal-close')?.addEventListener('click',()=>{
  document.getElementById('ios-modal').style.display='none';
});
document.getElementById('ios-modal')?.addEventListener('click',e=>{
  if(e.target===e.currentTarget)e.currentTarget.style.display='none';
});

window.addEventListener('appinstalled',()=>{
  localStorage.setItem('pwa_installed','1');
  document.getElementById('pwa-install').style.display='none';
  _deferredPrompt=null;
});

// ═══════════════ FOOTER i18n (from second <script> block)
const footerI18n={
en:{line1:'Free Net Worth Tracker · FIRE Calculator · Net Worth Forecast · Cost of Living Comparison',line2:'Track your net worth · Calculate your FIRE number · Forecast financial growth · Compare cost of living across 44 cities',copy:'All data stored locally in your browser. Nothing is sent to any server.',tagline:'Your wealth. Your timeline. Your move.'},
es:{line1:'Rastreador de patrimonio gratuito · Calculadora FIRE · Pronóstico financiero · Comparación de costo de vida',line2:'Rastrea tu patrimonio · Calcula tu número FIRE · Pronostica tu crecimiento financiero · Compara el costo de vida en 44 ciudades',copy:'Todos los datos se almacenan localmente en tu navegador. Nada se envía a ningún servidor.',tagline:'Tu riqueza. Tu cronograma. Tu decisión.'},
fr:{line1:'Suivi de patrimoine gratuit · Calculateur FIRE · Prévision financière · Comparaison du coût de la vie',line2:'Suivez votre patrimoine · Calculez votre numéro FIRE · Projetez votre croissance · Comparez le coût de la vie dans 44 villes',copy:'Toutes les données sont stockées localement. Rien n\'est envoyé à un serveur.',tagline:'Votre patrimoine. Votre calendrier. Votre choix.'},
de:{line1:'Kostenloser Vermögens-Tracker · FIRE-Rechner · Finanzprognose · Lebenshaltungskosten-Vergleich',line2:'Verfolgen Sie Ihr Vermögen · Berechnen Sie Ihre FIRE-Zahl · Prognostizieren Sie Ihr Wachstum · Vergleichen Sie 44 Städte',copy:'Alle Daten werden lokal in Ihrem Browser gespeichert. Nichts wird an einen Server gesendet.',tagline:'Ihr Vermögen. Ihr Zeitplan. Ihre Entscheidung.'},
pt:{line1:'Rastreador de patrimônio gratuito · Calculadora FIRE · Previsão financeira · Comparação de custo de vida',line2:'Rastreie seu patrimônio · Calcule seu número FIRE · Preveja seu crescimento · Compare o custo de vida em 44 cidades',copy:'Todos os dados são armazenados localmente no seu navegador. Nada é enviado a nenhum servidor.',tagline:'Sua riqueza. Seu cronograma. Sua decisão.'},
ja:{line1:'無料純資産トラッカー · FIRE計算機 · 財務予測 · 生活費比較',line2:'純資産を追跡 · FIRE目標を計算 · 成長を予測 · 44都市の生活費を比較',copy:'すべてのデータはブラウザにローカル保存されます。サーバーには送信されません。',tagline:'あなたの資産。あなたのタイムライン。あなたの選択。'},
zh:{line1:'免费净资产追踪器 · FIRE计算器 · 财务预测 · 生活成本比较',line2:'追踪净资产 · 计算FIRE目标 · 预测增长 · 比较44个城市的生活成本',copy:'所有数据存储在您的浏览器中。不会发送到任何服务器。',tagline:'你的财富。你的时间线。你的选择。'},
ko:{line1:'무료 순자산 추적기 · FIRE 계산기 · 재무 예측 · 생활비 비교',line2:'순자산 추적 · FIRE 목표 계산 · 성장 예측 · 44개 도시 생활비 비교',copy:'모든 데이터는 브라우저에 로컬 저장됩니다. 서버로 전송되지 않습니다.',tagline:'당신의 자산. 당신의 타임라인. 당신의 선택.'},
ru:{line1:'Бесплатный трекер капитала · FIRE-калькулятор · Финансовый прогноз · Сравнение стоимости жизни',line2:'Отслеживайте капитал · Рассчитайте FIRE · Прогнозируйте рост · Сравните 44 города',copy:'Все данные хранятся локально в вашем браузере. Ничего не отправляется на сервер.',tagline:'Ваш капитал. Ваш план. Ваш выбор.'},
ka:{line1:'უფასო კაპიტალის ტრეკერი · FIRE კალკულატორი · ფინანსური პროგნოზი · საცხოვრებელი ხარჯების შედარება',line2:'თვალყური ადევნეთ კაპიტალს · გამოთვალეთ FIRE · იწინასწარმეტყველეთ ზრდა · შეადარეთ 44 ქალაქი',copy:'ყველა მონაცემი ინახება ლოკალურად თქვენს ბრაუზერში.',tagline:'თქვენი სიმდიდრე. თქვენი გეგმა. თქვენი არჩევანი.'},
tr:{line1:'Ücretsiz Net Değer Takipçisi · FIRE Hesaplayıcı · Finansal Tahmin · Yaşam Maliyeti Karşılaştırması',line2:'Net değerinizi takip edin · FIRE hedefinizi hesaplayın · Büyümeyi tahmin edin · 44 şehri karşılaştırın',copy:'Tüm veriler tarayıcınızda yerel olarak saklanır. Hiçbir şey sunucuya gönderilmez.',tagline:'Servetiniz. Zaman çizelgeniz. Kararınız.'},
ar:{line1:'متتبع ثروة مجاني · حاسبة FIRE · توقعات مالية · مقارنة تكلفة المعيشة',line2:'تتبع ثروتك · احسب هدف FIRE · توقع النمو · قارن 44 مدينة',copy:'جميع البيانات مخزنة محلياً في متصفحك. لا يتم إرسال أي شيء إلى أي خادم.',tagline:'ثروتك. جدولك الزمني. قرارك.'},
hi:{line1:'मुफ्त संपत्ति ट्रैकर · FIRE कैलकुलेटर · वित्तीय पूर्वानुमान · जीवन लागत तुलना',line2:'अपनी संपत्ति ट्रैक करें · FIRE लक्ष्य गणना करें · विकास का पूर्वानुमान लगाएं · 44 शहरों की तुलना करें',copy:'सभी डेटा आपके ब्राउज़र में स्थानीय रूप से संग्रहीत है। कुछ भी किसी सर्वर पर नहीं भेजा जाता।',tagline:'आपकी संपत्ति। आपकी समयरेखा। आपका निर्णय।'},
uk:{line1:'Безкоштовний трекер капіталу · FIRE-калькулятор · Фінансовий прогноз · Порівняння вартості життя',line2:'Відстежуйте капітал · Розрахуйте FIRE · Прогнозуйте зростання · Порівняйте 44 міста',copy:'Всі дані зберігаються локально у вашому браузері.',tagline:'Ваш капітал. Ваш план. Ваш вибір.'}
};
const fl=footerI18n[LANG]||footerI18n.en;
document.getElementById('app-footer').innerHTML=`
  <div style="margin-bottom:10px;line-height:2"><span style="font-weight:600">NetWorthCast</span> — ${fl.line1}</div>
  <div style="margin-bottom:8px;line-height:1.8">${fl.line2}</div>
  <p>&copy; 2026 NetWorthCast. ${fl.copy}</p>
  <p style="margin-top:4px">${fl.tagline}</p>`;
