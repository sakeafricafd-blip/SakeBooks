/* ---- Supabase config: replace with your project's values ---- */
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabaseClient = (SUPABASE_URL.startsWith('YOUR_')) ? null :
  supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================================================
   SakeBooks — core financial engine
   Single-file app: state, persistence, rendering, reports, AI
   ========================================================= */

document.querySelectorAll('.mark-icon').forEach(el=> el.innerHTML = window.BESE_SAKA_SVG);
if(window.pdfjsLib){ pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }

const STORAGE_KEY = 'cedibooks_v1';

function uid(p){ return (p||'') + Math.random().toString(36).slice(2,9); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function monthKeyOf(dateStr){ return (dateStr||'').slice(0,7); }
const CURRENCIES = [
  {code:'GHS', name:'Ghana — Cedi', symbol:'₵'},
  {code:'NGN', name:'Nigeria — Naira', symbol:'₦'},
  {code:'KES', name:'Kenya — Shilling', symbol:'KSh'},
  {code:'ZAR', name:'South Africa — Rand', symbol:'R'},
  {code:'EGP', name:'Egypt — Pound', symbol:'E£'},
  {code:'XOF', name:'West Africa — CFA Franc (BCEAO)', symbol:'CFA'},
  {code:'XAF', name:'Central Africa — CFA Franc (BEAC)', symbol:'FCFA'},
  {code:'MAD', name:'Morocco — Dirham', symbol:'DH'},
  {code:'TZS', name:'Tanzania — Shilling', symbol:'TSh'},
  {code:'UGX', name:'Uganda — Shilling', symbol:'USh'},
  {code:'ETB', name:'Ethiopia — Birr', symbol:'Br'},
  {code:'RWF', name:'Rwanda — Franc', symbol:'FRw'},
  {code:'GBP', name:'United Kingdom — Pound', symbol:'£'},
  {code:'USD', name:'United States — Dollar', symbol:'$'},
  {code:'EUR', name:'Eurozone — Euro', symbol:'€'}
];
function currencySymbol(code){ const c = CURRENCIES.find(x=>x.code===code); return c ? c.symbol : (code+' '); }
const INVOICE_TEMPLATES = [
  {key:'classic', name:'Classic Ledger', swatch:'background:linear-gradient(135deg, var(--ink) 50%, var(--gold) 50%);'},
  {key:'mono', name:'Minimal Mono', swatch:'background:#fff; border-top:5px solid #111; border-bottom:1px solid #111;'},
  {key:'bold', name:'Bold Block', swatch:'background:var(--ink);'},
  {key:'elegant', name:'Elegant Serif', swatch:'background:var(--paper); border:1px solid var(--gold); border-bottom:4px solid var(--gold);'},
  {key:'compact', name:'Compact Slip', swatch:'background:repeating-linear-gradient(45deg, var(--paper-2), var(--paper-2) 4px, #fff 4px, #fff 8px); border:1px dashed var(--slate);'}
];
function fmtMoney(n, currency){
  const c = currency || (state.settings ? state.settings.currency : 'GHS');
  const sym = currencySymbol(c);
  const num = Number(n||0);
  const neg = num < 0;
  const out = sym + Math.abs(num).toLocaleString('en-GH',{minimumFractionDigits:2, maximumFractionDigits:2});
  return neg ? '-'+out : out;
}
function fmtDate(d){
  if(!d) return '—';
  const dt = new Date(d+'T00:00:00');
  return dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
}
function daysBetween(a,b){ return Math.round((new Date(b)-new Date(a))/86400000); }

/* ---------------- WhatsApp helpers ---------------- */
function toWaNumber(phone){
  let p = (phone||'').replace(/[^\d+]/g,'');
  if(p.startsWith('+')) p = p.slice(1);
  if(p.startsWith('0')) p = '233'+p.slice(1);
  return p;
}
function waLink(phone, message){
  return `https://wa.me/${toWaNumber(phone)}?text=${encodeURIComponent(message)}`;
}
function waButton(phone, message, label){
  label = label || 'WhatsApp';
  if(!phone) return `<span class="icon-btn" style="opacity:.35;" title="No phone number on file">${label}</span>`;
  return `<a class="icon-btn" href="${waLink(phone, message)}" target="_blank" rel="noopener">${label}</a>`;
}

function defaultState(){
  return {
    onboarded:false,
    settings:{
      businessName:'', ownerName:'', phone:'', address:'', taxId:'',
      currency:'GHS', taxScheme:'standard', taxRate:20, flatRate:3, logoText:'',
      logoDataUrl:'', invoiceTemplate:'classic',
      reportsPasswordHash:'', biometricCredentialId:''
    },
    customers:[],
    leads:[],
    products:[],
    invoices:[],
    quotations:[],
    expenseCategories:['Rent','Utilities','Salaries & Wages','Transport & Fuel','Supplies & Inventory','Marketing','Mobile Money & Bank Charges','Repairs & Maintenance','Communication','Other'],
    expenses:[],
    bills:[],
    employees:[],
    payrollRuns:[],
    aiHistory:[],
    budgets:{},
    otherIncome:[],
    assets:[],
    loans:[],
    equityTransactions:[]
  };
}

/* ---------------- Language ----------------
   Covers the highest-visibility chrome — navigation, sidebar, and the
   sign-in gate — plus dashboard headings as a working example. Deeper
   strings (every modal field, every table header) stay in English for
   now; add more keys to I18N to extend coverage. */
const I18N = {
  en:{ tagline:'Business books, made plain', signInTag:'Sign in to open your books',
    nav_dashboard:'Dashboard', nav_sales:'Sales & Invoicing', nav_expenses:'Expenses', nav_inventory:'Inventory',
    nav_bankimport:'Bank & MoMo Import', nav_customers:'Customers', nav_crm:'CRM / Pipeline', nav_payroll:'Payroll',
    nav_reports:'Reports', nav_budgeting:'Budgeting', nav_assets:'Assets, Loans & Equity', nav_worth:'Business Worth', nav_settings:'Business Settings',
    continueBtn:'Continue', signOut:'Sign out', dashTitle:'Dashboard', save:'Save', cancel:'Cancel', add:'Add' },
  fr:{ tagline:'Vos comptes, en toute simplicité', signInTag:'Connectez-vous pour ouvrir vos comptes',
    nav_dashboard:'Tableau de bord', nav_sales:'Ventes et factures', nav_expenses:'Dépenses', nav_inventory:'Inventaire',
    nav_bankimport:'Import bancaire et Mobile Money', nav_customers:'Clients', nav_crm:'CRM / Pipeline', nav_payroll:'Paie',
    nav_reports:'Rapports', nav_budgeting:'Budget', nav_assets:'Actifs, prêts et capitaux', nav_worth:'Valeur de l\'entreprise', nav_settings:"Paramètres de l'entreprise",
    continueBtn:'Continuer', signOut:'Se déconnecter', dashTitle:'Tableau de bord', save:'Enregistrer', cancel:'Annuler', add:'Ajouter' },
  sw:{ tagline:'Vitabu vya biashara, kwa urahisi', signInTag:'Ingia ili kufungua vitabu vyako',
    nav_dashboard:'Dashibodi', nav_sales:'Mauzo na Ankara', nav_expenses:'Matumizi', nav_inventory:'Bidhaa Ghalani',
    nav_bankimport:'Ingiza Taarifa za Benki na MoMo', nav_customers:'Wateja', nav_crm:'CRM / Fursa', nav_payroll:'Mishahara',
    nav_reports:'Ripoti', nav_budgeting:'Bajeti', nav_assets:'Mali, Mikopo na Hisa', nav_worth:'Thamani ya Biashara', nav_settings:'Mipangilio ya Biashara',
    continueBtn:'Endelea', signOut:'Toka', dashTitle:'Dashibodi', save:'Hifadhi', cancel:'Ghairi', add:'Ongeza' }
};
const UI_LANGUAGES = [{code:'en',name:'English'},{code:'fr',name:'Français'},{code:'sw',name:'Kiswahili'}];
function t(key){
  const lang = (meta && meta.uiLanguage) || 'en';
  return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
}
function applyI18N(){
  document.querySelectorAll('[data-route]').forEach(btn=>{
    const key = 'nav_'+btn.dataset.route;
    if(I18N.en[key]) btn.innerHTML = t(key);
  });
  const st = document.getElementById('sidebarTagline'); if(st) st.textContent = t('tagline');
  const at = document.getElementById('authTagline'); if(at) at.textContent = t('signInTag');
  const gc = document.getElementById('gate_continue'); if(gc) gc.textContent = t('continueBtn');
}
function setUiLanguage(code){
  meta.uiLanguage = code;
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  applyI18N();
  render();
}

/* ---------------- Multi-business storage layer ----------------
   Each business owns its own full data object (customers, invoices,
   expenses, employees, etc). `state` always points at the active
   business's data; switching businesses swaps that reference. */
const META_KEY = 'sakebooks_meta_v1';
const LEGACY_META_KEY = 'cedibooks_meta_v1';
let meta = loadMeta();
let state = meta.businesses[meta.currentId].data;

function loadMeta(){
  try{
    const raw = localStorage.getItem(META_KEY) || localStorage.getItem(LEGACY_META_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      Object.values(parsed.businesses).forEach(b=>{ b.data = Object.assign(defaultState(), b.data); });
      return parsed;
    }
  }catch(e){ console.warn('Meta read failed, starting fresh.', e); }
  // migrate legacy single-business storage if present
  let migrated = null;
  try{
    const oldRaw = localStorage.getItem(STORAGE_KEY);
    if(oldRaw) migrated = Object.assign(defaultState(), JSON.parse(oldRaw));
  }catch(e){ /* ignore */ }
  const id = uid('biz_');
  return {
    currentId: id,
    businesses: {
      [id]: { name: (migrated && migrated.settings.businessName) || 'My Business', data: migrated || defaultState() }
    }
  };
}
function saveMeta(){
  meta.businesses[meta.currentId].data = state;
  meta.businesses[meta.currentId].name = state.settings.businessName || meta.businesses[meta.currentId].name || 'My Business';
  try{ localStorage.setItem(META_KEY, JSON.stringify(meta)); }
  catch(e){ console.warn('Storage save failed', e); }
  scheduleCloudSync();
}

/* ---------------- Sign-in gate ----------------
   NOTE: There's no backend here, so this can't be a real multi-device
   account system. "Sign in with Google" uses Google Identity Services,
   which DOES work with just a client-side script — but it requires a
   free OAuth Client ID from Google Cloud Console with this site's exact
   URL added as an authorized JavaScript origin. Swap GOOGLE_CLIENT_ID
   below with your own once you've registered one; until then the
   Google button won't render and the manual name/email fallback covers
   the same "who's using this" purpose without any setup. */
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com';
function decodeJwtPayload(token){
  try{ return JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))))); }
  catch(e){ return {}; }
}
async function completeSignIn(user){
  meta.currentUser = user;
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  await syncBusinessesFromCloud();
  document.getElementById('authGate').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  go('dashboard');
}

/* ---------------- Cloud sync (Supabase) ----------------
   Each business is one row in the "businesses" table, keyed by our own
   local id, owned by the signed-in user via user_id + row-level security.
   On sign-in we pull the user's rows down; if they have none yet (first
   login) we push whatever is currently in this browser up, so nothing
   entered before signing up is lost. */
let cloudSyncTimer = null;
function scheduleCloudSync(){
  if(!supabaseClient || !meta.currentUser) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(pushCurrentBusinessToCloud, 1500);
}
async function pushCurrentBusinessToCloud(){
  if(!supabaseClient) return;
  const { data:{ session } } = await supabaseClient.auth.getSession();
  if(!session) return;
  const biz = meta.businesses[meta.currentId];
  const { error } = await supabaseClient.from('businesses').upsert({
    id: meta.currentId,
    user_id: session.user.id,
    name: biz.name,
    data: biz.data,
    updated_at: new Date().toISOString()
  });
  if(error) console.warn('Cloud sync failed', error);
}
async function syncBusinessesFromCloud(){
  if(!supabaseClient) return;
  const { data:{ session } } = await supabaseClient.auth.getSession();
  if(!session) return;

  const { data: rows, error } = await supabaseClient.from('businesses').select('*').eq('user_id', session.user.id);
  if(error){ console.warn('Cloud load failed', error); return; }

  if(rows && rows.length > 0){
    const businesses = {};
    rows.forEach(r => { businesses[r.id] = { name: r.name, data: Object.assign(defaultState(), r.data) }; });
    meta.businesses = businesses;
    meta.currentId = rows[0].id;
    state = meta.businesses[meta.currentId].data;
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } else {
    // No cloud data yet — push everything currently local up as this user's data
    for(const id of Object.keys(meta.businesses)){
      const biz = meta.businesses[id];
      const { error: upErr } = await supabaseClient.from('businesses').upsert({
        id, user_id: session.user.id, name: biz.name, data: biz.data, updated_at: new Date().toISOString()
      });
      if(upErr) console.warn('Initial cloud push failed', upErr);
    }
  }
}
function handleGoogleCredential(response){
  const p = decodeJwtPayload(response.credential);
  completeSignIn({ name: p.name || 'Google user', email: p.email || '', picture: p.picture || '', method:'google' });
}
let gateMode = 'login'; // 'login' | 'signup'
function setGateMode(mode){
  gateMode = mode;
  document.getElementById('gate_name_field').style.display = mode==='signup' ? 'block' : 'none';
  document.getElementById('gate_continue').textContent = mode==='signup' ? 'Sign up' : 'Log in';
  document.getElementById('authTagline').textContent = mode==='signup' ? 'Create your account' : 'Sign in to open your books';
  document.getElementById('gate_error').style.display = 'none';
  document.getElementById('gate_confirm_note').style.display = 'none';
}
async function initAuthGate(){
  applyI18N();

  if(!supabaseClient){
    document.getElementById('gate_error').textContent = 'Sign-in is not configured yet — add your Supabase URL and key in the code.';
    document.getElementById('gate_error').style.display = 'block';
  }

  document.getElementById('gate_tab_login').onclick = ()=>setGateMode('login');
  document.getElementById('gate_tab_signup').onclick = ()=>setGateMode('signup');
  setGateMode('login');

  // Already have a live Supabase session (e.g. returning visitor)?
  if(supabaseClient){
    const { data:{ session } } = await supabaseClient.auth.getSession();
    if(session){ return completeSignIn({ name: session.user.user_metadata?.name || session.user.email, email: session.user.email, picture:'', method:'supabase' }); }
  }

  document.getElementById('gate_continue').onclick = async ()=>{
    const errEl = document.getElementById('gate_error');
    errEl.style.display = 'none';
    if(!supabaseClient){ errEl.textContent = 'Sign-in is not configured yet.'; errEl.style.display='block'; return; }

    const email = document.getElementById('gate_email').value.trim();
    const password = document.getElementById('gate_password').value;
    const name = document.getElementById('gate_name').value.trim();

    if(!email || !password) { errEl.textContent = 'Please enter your email and password.'; errEl.style.display='block'; return; }
    if(gateMode==='signup' && !name){ errEl.textContent = 'Please enter your name.'; errEl.style.display='block'; return; }

    const btn = document.getElementById('gate_continue');
    btn.disabled = true;

    try{
      if(gateMode==='signup'){
        const { data, error } = await supabaseClient.auth.signUp({
          email, password, options:{ data:{ name } }
        });
        if(error) throw error;
        if(!data.session){
          // Email confirmation required before a session exists
          document.getElementById('gate_confirm_note').style.display = 'block';
          setGateMode('login');
          return;
        }
        completeSignIn({ name, email, picture:'', method:'supabase' });
      } else {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if(error) throw error;
        completeSignIn({ name: data.user.user_metadata?.name || email, email, picture:'', method:'supabase' });
      }
    }catch(err){
      errEl.textContent = err.message || 'Something went wrong. Please try again.';
      errEl.style.display = 'block';
    }finally{
      btn.disabled = false;
    }
  };
}
async function signOut(){
  if(supabaseClient){ await supabaseClient.auth.signOut(); }
  delete meta.currentUser;
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  document.getElementById('app').style.display = 'none';
  document.getElementById('authGate').style.display = 'flex';
  document.getElementById('gate_email').value = '';
  document.getElementById('gate_password').value = '';
  document.getElementById('gate_name').value = '';
}
function save(){ saveMeta(); }
function switchBusiness(id){
  if(id===meta.currentId) return;
  saveMeta();
  meta.currentId = id;
  state = meta.businesses[id].data;
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  route = 'dashboard';
  render();
}
function addBusiness(){
  const id = uid('biz_');
  meta.businesses[id] = { name:'New business', data: defaultState() };
  switchBusiness(id);
  scheduleCloudSync();
}
function renderBizSwitcher(){
  const sel = document.getElementById('bizSwitcher');
  if(!sel) return;
  sel.innerHTML = Object.entries(meta.businesses).map(([id,b])=>
    `<option value="${id}" ${id===meta.currentId?'selected':''}>${b.name||'Untitled business'}</option>`
  ).join('');
}

/* ---------------- Backup, restore & Drive sync ----------------
   Everything already runs offline: all data lives in this browser's
   localStorage, so entering invoices/expenses etc. works with no
   connection at all. What genuinely needs a network is: downloading a
   backup file, restoring one, syncing to Google Drive, and the AI
   assistant. Drive sync reuses the same Google OAuth Client ID as
   sign-in (just needs the Drive API enabled on it), requesting
   drive.file scope so it can only see files this app created. */
function exportBackupFile(){
  saveMeta();
  const blob = new Blob([JSON.stringify(meta, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `sakebooks-backup-${todayISO()}.json`; a.click();
  URL.revokeObjectURL(url);
}
function restoreFromParsedBackup(parsed){
  if(!parsed || !parsed.businesses || !parsed.currentId){ alert("That doesn't look like a SakeBooks backup file."); return; }
  if(!confirm('This replaces all data currently in this browser with the backup. Continue?')) return;
  meta = parsed;
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  state = meta.businesses[meta.currentId].data;
  go('dashboard');
}
function importBackupFile(file){
  const reader = new FileReader();
  reader.onload = ()=>{ try{ restoreFromParsedBackup(JSON.parse(reader.result)); }catch(e){ alert('Could not read that backup file.'); } };
  reader.readAsText(file);
}
function driveReady(){
  if(!window.google || !google.accounts || !google.accounts.oauth2) return false;
  if(GOOGLE_CLIENT_ID.startsWith('YOUR_')){ alert('Add your own Google OAuth Client ID (with the Drive API enabled) in the code to use Drive backup.'); return false; }
  return true;
}
function backupToDrive(){
  if(!driveReady()) return;
  saveMeta();
  google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: async (resp)=>{
      if(resp.error){ alert('Google Drive authorization failed.'); return; }
      const metadata = { name: `sakebooks-backup-${todayISO()}.json`, mimeType:'application/json' };
      const boundary = 'sakebooks-'+Date.now();
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
        + `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}--`;
      try{
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method:'POST',
          headers:{ 'Authorization':'Bearer '+resp.access_token, 'Content-Type':`multipart/related; boundary=${boundary}` },
          body
        });
        alert(res.ok ? 'Backed up to Google Drive.' : 'Drive backup failed.');
      }catch(e){ alert('Drive backup failed.'); }
    }
  }).requestAccessToken();
}
function restoreFromDrive(){
  if(!driveReady()) return;
  google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: async (resp)=>{
      if(resp.error){ alert('Google Drive authorization failed.'); return; }
      try{
        const listRes = await fetch("https://www.googleapis.com/drive/v3/files?q=name+contains+'sakebooks-backup'&orderBy=createdTime desc&pageSize=1&fields=files(id,name)", { headers:{'Authorization':'Bearer '+resp.access_token} });
        const listData = await listRes.json();
        const file = (listData.files||[])[0];
        if(!file){ alert('No SakeBooks backups found in Drive yet.'); return; }
        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers:{'Authorization':'Bearer '+resp.access_token} });
        restoreFromParsedBackup(await fileRes.json());
      }catch(e){ alert('Drive restore failed.'); }
    }
  }).requestAccessToken();
}

/* ---------------- Derived figures ---------------- */
function invoiceTotal(inv){
  const sub = inv.items.reduce((s,i)=> s + (i.qty*i.price), 0);
  const tax = inv.taxScheme === 'flat' ? sub*(inv.taxRate/100) : sub*(inv.taxRate/100);
  return {sub, tax, total: sub+tax};
}
function invoicePaid(inv){ return (inv.payments||[]).reduce((s,p)=>s+p.amount,0); }
function invoiceBalance(inv){ const {total} = invoiceTotal(inv); return +(total - invoicePaid(inv)).toFixed(2); }
function invoiceStatus(inv){
  const bal = invoiceBalance(inv);
  const paid = invoicePaid(inv);
  if(inv.status==='draft') return 'draft';
  if(bal<=0.005) return 'paid';
  if(paid>0) return 'partial';
  if(inv.dueDate && inv.dueDate < todayISO()) return 'overdue';
  return 'sent';
}
function allInvoices(){ return state.invoices; }

function cashAndBankBalance(){
  let cash=0, bank=0;
  state.invoices.forEach(inv=>{
    (inv.payments||[]).forEach(p=>{
      if(p.method==='cash') cash+=p.amount; else bank+=p.amount;
    });
  });
  state.expenses.forEach(e=>{
    if(e.method==='cash') cash-=e.amount; else bank-=e.amount;
  });
  state.bills.forEach(b=>{
    (b.payments||[]).forEach(p=>{
      if(p.method==='cash') cash-=p.amount; else bank-=p.amount;
    });
  });
  state.otherIncome.forEach(inc=>{
    if(inc.method==='cash') cash+=inc.amount; else bank+=inc.amount;
  });
  state.assets.forEach(a=>{
    if(a.method==='cash') cash-=a.purchaseCost; else bank-=a.purchaseCost;
  });
  state.loans.forEach(l=>{
    if(l.method==='cash') cash+=l.principal; else bank+=l.principal;
    (l.payments||[]).forEach(p=>{
      if(p.method==='cash') cash-=p.amount; else bank-=p.amount;
    });
  });
  state.equityTransactions.forEach(e=>{
    const sign = e.type==='drawing' ? -1 : 1;
    if(e.method==='cash') cash += sign*e.amount; else bank += sign*e.amount;
  });
  return {cash, bank};
}
function totalAR(){
  return state.invoices.filter(i=>i.status!=='draft').reduce((s,i)=>s+Math.max(0,invoiceBalance(i)),0);
}
function billPaid(b){ return (b.payments||[]).reduce((s,p)=>s+p.amount,0); }
function billBalance(b){ return +(b.amount - billPaid(b)).toFixed(2); }
function billStatus(b){
  const bal = billBalance(b);
  if(bal<=0.005) return 'paid';
  if(billPaid(b)>0) return 'partial';
  if(b.dueDate && b.dueDate < todayISO()) return 'overdue';
  return 'open';
}
function totalAP(){
  return state.bills.reduce((s,b)=>s+Math.max(0,billBalance(b)),0);
}
function salesOn(dateStr){
  return state.invoices.reduce((s,inv)=>{
    return s + (inv.payments||[]).filter(p=>p.date===dateStr).reduce((a,p)=>a+p.amount,0);
  },0);
}
function invoicedOn(dateStr){
  return state.invoices.filter(i=>i.status!=='draft' && i.date===dateStr)
    .reduce((s,i)=>s+invoiceTotal(i).total,0);
}
function expensesOn(dateStr){
  return state.expenses.filter(e=>e.date===dateStr).reduce((s,e)=>s+e.amount,0);
}
function revenueInMonth(mKey){
  return state.invoices.filter(i=>i.status!=='draft' && monthKeyOf(i.date)===mKey)
    .reduce((s,i)=>s+invoiceTotal(i).sub,0);
}
/* Accrual fix: a supplier bill counts as an expense the month it's billed,
   not the month it's paid — otherwise unpaid bills never showed up in the
   P&L at all, which understated expenses and broke Assets = Liabilities + Equity. */
function billsInMonth(mKey){
  return state.bills.filter(b=>monthKeyOf(b.date)===mKey).reduce((s,b)=>s+b.amount,0);
}
function expensesInMonth(mKey){
  const direct = state.expenses.filter(e=>monthKeyOf(e.date)===mKey).reduce((s,e)=>s+e.amount,0);
  const billed = billsInMonth(mKey);
  const dep = depreciationInMonth(mKey);
  const interest = loanInterestInMonth(mKey);
  return direct + billed + dep + interest;
}
/* ---------------- Fixed assets: straight-line depreciation ---------------- */
function monthsBetweenDates(d1, d2){
  const a = new Date(d1), b = new Date(d2);
  return (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth());
}
function depreciationForAsset(a, asOf){
  asOf = asOf || todayISO();
  const lifeMonths = Math.max(1, (a.usefulLifeYears||1)*12);
  const monthlyDep = a.purchaseCost / lifeMonths;
  const elapsed = Math.max(0, Math.min(lifeMonths, monthsBetweenDates(a.purchaseDate, asOf)));
  const accumulated = +(monthlyDep*elapsed).toFixed(2);
  const nbv = a.status==='Active' ? Math.max(0, +(a.purchaseCost-accumulated).toFixed(2)) : 0;
  return { monthlyDep: +monthlyDep.toFixed(2), accumulated, nbv, fullyDepreciated: elapsed>=lifeMonths };
}
function totalFixedAssetsNBV(){
  return state.assets.reduce((s,a)=>s+depreciationForAsset(a).nbv, 0);
}
function depreciationInMonth(mKey){
  return state.assets.filter(a=>a.status==='Active' && monthKeyOf(a.purchaseDate)<=mKey).reduce((s,a)=>{
    const d = depreciationForAsset(a, mKey+'-28');
    const lifeMonths = Math.max(1,(a.usefulLifeYears||1)*12);
    const monthIndex = monthsBetweenDates(a.purchaseDate, mKey+'-01');
    return s + (monthIndex>=0 && monthIndex<lifeMonths ? d.monthlyDep : 0);
  }, 0);
}
function allTimeDepreciation(){
  return state.assets.reduce((s,a)=>s+depreciationForAsset(a).accumulated, 0);
}

/* ---------------- Loans: principal/interest amortization ---------------- */
function loanPrincipalPaid(l){ return (l.payments||[]).reduce((s,p)=>s+p.principalPortion,0); }
function loanOutstanding(l){ return +Math.max(0, l.principal - loanPrincipalPaid(l)).toFixed(2); }
function loanMonthlyRate(l){ return (l.interestRatePct||0)/100/12; }
function computeRepaymentSplit(l, paymentAmount){
  const outstanding = loanOutstanding(l);
  const interest = +(outstanding*loanMonthlyRate(l)).toFixed(2);
  const principal = +Math.max(0, Math.min(outstanding, paymentAmount-interest)).toFixed(2);
  return { interest, principal };
}
function totalLoansOutstanding(){
  return state.loans.reduce((s,l)=>s+loanOutstanding(l), 0);
}
function loanInterestInMonth(mKey){
  let total=0;
  state.loans.forEach(l=>(l.payments||[]).forEach(p=>{ if(monthKeyOf(p.date)===mKey) total+=p.interestPortion; }));
  return total;
}
function allTimeLoanInterest(){
  let total=0;
  state.loans.forEach(l=>(l.payments||[]).forEach(p=>{ total+=p.interestPortion; }));
  return total;
}

/* ---------------- Owner's equity ---------------- */
function totalCapitalContributed(){
  return state.equityTransactions.filter(e=>e.type!=='drawing').reduce((s,e)=>s+e.amount,0);
}
function totalDrawings(){
  return state.equityTransactions.filter(e=>e.type==='drawing').reduce((s,e)=>s+e.amount,0);
}
function allTimeRevenue(){
  return state.invoices.filter(i=>i.status!=='draft').reduce((s,i)=>s+invoiceTotal(i).sub,0);
}
function allTimeOtherIncome(){ return state.otherIncome.reduce((s,i)=>s+i.amount,0); }
function allTimeDirectExpenses(){ return state.expenses.reduce((s,e)=>s+e.amount,0); }
function allTimeBills(){ return state.bills.reduce((s,b)=>s+b.amount,0); }
function retainedEarnings(){
  return allTimeRevenue() + allTimeOtherIncome() - allTimeDirectExpenses() - allTimeBills() - allTimeDepreciation() - allTimeLoanInterest();
}
function totalOwnerEquity(){
  return totalCapitalContributed() + retainedEarnings() - totalDrawings();
}
function businessWorthFigures(){
  const {cash, bank} = cashAndBankBalance();
  const ar = totalAR();
  const fixedAssetsNBV = totalFixedAssetsNBV();
  const totalAssets = cash+bank+ar+fixedAssetsNBV;
  const ap = totalAP();
  const loansOutstanding = totalLoansOutstanding();
  const totalLiabilities = ap+loansOutstanding;
  const equity = totalOwnerEquity();
  const currentAssets = cash+bank+ar;
  const currentLiabilities = ap;
  const workingCapital = currentAssets-currentLiabilities;
  const debtToAsset = totalAssets>0 ? totalLiabilities/totalAssets : 0;
  const currentRatio = currentLiabilities>0 ? currentAssets/currentLiabilities : (currentAssets>0?Infinity:0);
  const reconciliation = +(totalAssets-totalLiabilities-equity).toFixed(2);
  return { cash, bank, ar, fixedAssetsNBV, totalAssets, ap, loansOutstanding, totalLiabilities, equity, workingCapital, debtToAsset, currentRatio, reconciliation };
}

function last6Months(){
  const out=[];
  const d=new Date();
  for(let i=5;i>=0;i--){
    const dt=new Date(d.getFullYear(), d.getMonth()-i, 1);
    out.push(dt.toISOString().slice(0,7));
  }
  return out;
}
function businessHealthScore(){
  const mKey = todayISO().slice(0,7);
  const rev = revenueInMonth(mKey), exp = expensesInMonth(mKey);
  const margin = rev>0 ? (rev-exp)/rev : (exp>0? -1 : 0);
  const overdue = state.invoices.filter(i=>invoiceStatus(i)==='overdue').length;
  const totalOpen = state.invoices.filter(i=>i.status!=='draft' && invoiceBalance(i)>0).length || 1;
  const overdueRatio = overdue/totalOpen;
  let score = 50 + margin*100*0.5 - overdueRatio*30;
  score = Math.max(0, Math.min(100, Math.round(score)));
  let label='Fair', color='#8A6417';
  if(score>=75){label='Strong'; color='#2F6B4F';}
  else if(score>=50){label='Steady'; color='#8A6417';}
  else {label='At risk'; color='#B5453C';}
  return {score, label, color};
}

/* ---------------- Inventory helpers ---------------- */
function lowStockProducts(){
  return state.products.filter(p=>p.stockQty <= p.lowStockThreshold);
}
function inventoryValue(){
  return state.products.reduce((s,p)=>s+p.stockQty*p.costPrice,0);
}

/* ---------------- Payroll: Ghana SSNIT + PAYE (2026 GRA bands) ----------------
   Defaults reflect 2026 GRA/SSNIT rules: SSNIT 5.5% employee / 13% employer of
   basic salary, capped at an annual insurable ceiling of GHS 61,000 (~GHS 5,083/mo).
   PAYE uses the 2026 monthly-equivalent graduated bands. These are estimates for
   planning — always confirm current rates with GRA/SSNIT before real filing. */
const SSNIT_EMPLOYEE_RATE = 0.055;
const SSNIT_EMPLOYER_RATE = 0.13;
const SSNIT_MONTHLY_CEILING = 61000/12; // ~5,083.33
const PAYE_MONTHLY_BANDS = [
  {upto:490, rate:0},
  {upto:600, rate:0.05},
  {upto:730, rate:0.10},
  {upto:3896.67, rate:0.175},
  {upto:19896.67, rate:0.25},
  {upto:50416.67, rate:0.30},
  {upto:Infinity, rate:0.35}
];
function calcSSNIT(basicSalary){
  const capped = Math.min(basicSalary, SSNIT_MONTHLY_CEILING);
  return { employee: +(capped*SSNIT_EMPLOYEE_RATE).toFixed(2), employer: +(capped*SSNIT_EMPLOYER_RATE).toFixed(2) };
}
function calcPAYE(chargeableIncome){
  let tax=0, prev=0;
  for(const band of PAYE_MONTHLY_BANDS){
    if(chargeableIncome<=prev) break;
    const amountInBand = Math.min(chargeableIncome, band.upto)-prev;
    tax += amountInBand*band.rate;
    prev = band.upto;
  }
  return +tax.toFixed(2);
}
function computePayslip(basicSalary){
  const ssnit = calcSSNIT(basicSalary);
  const chargeable = Math.max(0, basicSalary - ssnit.employee);
  const paye = calcPAYE(chargeable);
  const net = +(basicSalary - ssnit.employee - paye).toFixed(2);
  const employerCost = +(basicSalary + ssnit.employer).toFixed(2);
  return { basicSalary, ssnitEmployee: ssnit.employee, ssnitEmployer: ssnit.employer, paye, net, employerCost };
}

/* ---------------- CRM / pipeline helpers ---------------- */
const PIPELINE_STAGES = ['Lead','Contacted','Quotation Sent','Negotiation','Won','Repeat Customer'];
function stageColor(stage){
  return ({
    'Lead':'#5C6672','Contacted':'#33507A','Quotation Sent':'#8A6417',
    'Negotiation':'#B5453C','Won':'#2F6B4F','Repeat Customer':'#2F6B4F'
  })[stage] || '#5C6672';
}

/* ---------------- Routing / rendering ---------------- */
let route = 'dashboard';
function go(r){ route = r; document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active', b.dataset.route===r)); render(); }

document.getElementById('navList').addEventListener('click', e=>{
  const b = e.target.closest('button[data-route]');
  if(b) go(b.dataset.route);
});
document.getElementById('bizSwitcher').addEventListener('change', e=> switchBusiness(e.target.value));
document.getElementById('addBizBtn').addEventListener('click', ()=> addBusiness());

function updateNetStatus(){
  const el = document.getElementById('netStatus');
  if(!el) return;
  const online = navigator.onLine;
  el.innerHTML = `<span style="width:7px; height:7px; border-radius:50%; background:${online?'var(--green)':'var(--gold)'}; display:inline-block;"></span> ${online?'Online':'Offline — saved locally'}`;
}
window.addEventListener('online', updateNetStatus);
window.addEventListener('offline', updateNetStatus);

function render(){
  renderBizSwitcher();
  updateNetStatus();
  applyI18N();
  if(meta.currentUser){
    const u = meta.currentUser;
    document.getElementById('userFoot').innerHTML = `
      <div class="user-chip">${u.picture?`<img src="${u.picture}">`:`<div class="avatar-fallback">${(u.name||'?')[0].toUpperCase()}</div>`}<span>${(u.name||'').split(' ')[0]}</span></div>
      <button id="signOutBtn" style="all:unset; cursor:pointer; color:#8892A8; font-size:11px; text-decoration:underline;">${t('signOut')}</button>
    `;
    const so = document.getElementById('signOutBtn');
    if(so) so.onclick = signOut;
  }
  if(!state.onboarded){ openOnboarding(); }
  document.getElementById('bizFoot').textContent = state.settings.ownerName || state.settings.businessName || 'Set up your business →';
  const main = document.getElementById('main');
  main.innerHTML = ({
    dashboard: renderDashboard,
    sales: renderSales,
    expenses: renderExpenses,
    inventory: renderInventory,
    bankimport: renderBankImport,
    customers: renderCustomers,
    crm: renderCRM,
    payroll: renderPayroll,
    reports: renderReports,
    budgeting: renderBudgeting,
    assets: renderAssetsHub,
    worth: renderBusinessWorth,
    settings: renderSettings
  }[route] || renderDashboard)();
  attachRouteHandlers();
}

/* ---------------- Dashboard ---------------- */
function renderDashboard(){
  const today = todayISO();
  const {cash, bank} = cashAndBankBalance();
  const mKey = today.slice(0,7);
  const rev = revenueInMonth(mKey), exp = expensesInMonth(mKey);
  const ar = totalAR();
  const ap = totalAP();
  const stockValue = inventoryValue();
  const invoicesThisMonth = state.invoices.filter(i=>i.status!=='draft' && monthKeyOf(i.date)===mKey).length;
  const health = businessHealthScore();
  const invoicedToday = invoicedOn(today);
  const expToday = expensesOn(today);

  return `
    <div class="topbar">
      <div>
        <h1>${t('dashTitle')}</h1>
        <div class="sub">${fmtDate(today)} · ${state.settings.businessName || 'Your business'}</div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" data-action="new-expense">+ Expense</button>
        <button class="btn btn-primary" data-action="new-invoice">+ Invoice</button>
      </div>
    </div>

    <div class="ledger-strip">
      <div class="ledger-row">
        <div class="ledger-item"><span class="lbl">Invoiced today</span><span class="val figure">${fmtMoney(invoicedToday)}</span></div>
        <div class="ledger-item"><span class="lbl">Collected today</span><span class="val figure pos">${fmtMoney(salesOn(today))}</span></div>
        <div class="ledger-item"><span class="lbl">Spent today</span><span class="val figure neg">${fmtMoney(expToday)}</span></div>
        <div class="ledger-item"><span class="lbl">Cash on hand</span><span class="val figure">${fmtMoney(cash)}</span></div>
        <div class="ledger-item"><span class="lbl">Bank balance</span><span class="val figure">${fmtMoney(bank)}</span></div>
        <div class="ledger-item"><span class="lbl">Receivables (AR)</span><span class="val figure">${fmtMoney(ar)}</span></div>
        <div class="ledger-item"><span class="lbl">Payables (AP)</span><span class="val figure">${fmtMoney(ap)}</span></div>
        <div class="ledger-item"><span class="lbl">Stock value</span><span class="val figure">${fmtMoney(stockValue)}</span></div>
      </div>
    </div>

    ${lowStockProducts().length ? `<div class="card" style="border-color:var(--rust); background:var(--rust-soft); margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
      <div><strong>${lowStockProducts().length} item${lowStockProducts().length>1?'s':''} running low on stock</strong> — ${lowStockProducts().map(p=>p.name).join(', ')}</div>
      <button class="btn btn-sm btn-ghost" data-action="goto-inventory">View inventory</button>
    </div>` : ''}
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card"><div class="lbl">This month's revenue</div><div class="num figure">${fmtMoney(rev)}</div></div>
      <div class="card stat-card"><div class="lbl">This month's expenses</div><div class="num figure">${fmtMoney(exp)}</div></div>
      <div class="card stat-card"><div class="lbl">Invoices this month</div><div class="num">${invoicesThisMonth}</div></div>
      <div class="card stat-card" style="display:flex; align-items:center; gap:14px;">
        <div class="health-ring" style="background:${health.color}22; color:${health.color}; border:3px solid ${health.color};">${health.score}</div>
        <div><div class="lbl">Business health</div><div class="num" style="font-size:16px;">${health.label}</div></div>
      </div>
    </div>
    <p style="color:var(--slate); font-size:11.5px; margin:-10px 0 16px;">Profit &amp; loss and the full balance sheet live in Reports (and can be password-protected there) — kept off the everyday dashboard on purpose.</p>

    <div class="grid grid-2">
      <div class="card">
        <h3>Sales vs expenses — last 6 months</h3>
        <canvas id="trendChart" height="180"></canvas>
      </div>
      <div class="card">
        <h3>Who owes you</h3>
        ${renderTopDebtors()}
      </div>
    </div>
  `;
}
function renderTopDebtors(){
  const open = state.invoices.filter(i=>i.status!=='draft' && invoiceBalance(i)>0.005)
    .sort((a,b)=>invoiceBalance(b)-invoiceBalance(a)).slice(0,6);
  if(!open.length) return `<div class="empty">Nobody owes you right now — clean books.</div>`;
  return `<table><thead><tr><th>Customer</th><th>Invoice</th><th>Due</th><th>Balance</th></tr></thead><tbody>
    ${open.map(i=>{
      const cust = state.customers.find(c=>c.id===i.customerId);
      const overdue = i.dueDate && i.dueDate < todayISO();
      return `<tr>
        <td>${cust?cust.name:'—'}</td>
        <td>${i.number}</td>
        <td>${overdue?`<span style="color:var(--rust)">${fmtDate(i.dueDate)}</span>`:fmtDate(i.dueDate)}</td>
        <td class="figure">${fmtMoney(invoiceBalance(i))}</td>
      </tr>`;
    }).join('')}
  </tbody></table>`;
}
function drawTrendChart(){
  const el = document.getElementById('trendChart');
  if(!el || !window.Chart) return;
  const months = last6Months();
  const revs = months.map(m=>revenueInMonth(m));
  const exps = months.map(m=>expensesInMonth(m));
  const labels = months.map(m=>{
    const [y,mo]=m.split('-'); return new Date(y,mo-1,1).toLocaleDateString('en-GB',{month:'short'});
  });
  if(el._chart) el._chart.destroy();
  el._chart = new Chart(el, {
    type:'bar',
    data:{ labels, datasets:[
      {label:'Revenue', data:revs, backgroundColor:'#C9971E'},
      {label:'Expenses', data:exps, backgroundColor:'#16213E'}
    ]},
    options:{ responsive:true, plugins:{legend:{position:'bottom', labels:{font:{family:'IBM Plex Sans'}}}}, scales:{y:{beginAtZero:true}} }
  });
}

/* ---------------- Sales & Invoicing ---------------- */
let salesTab = 'invoices';
function renderSales(){
  return `
    <div class="topbar">
      <div><h1>Sales &amp; Invoicing</h1><div class="sub">Quotations, invoices, and payments.</div></div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" data-action="new-quote">+ Quotation</button>
        <button class="btn btn-primary" data-action="new-invoice">+ Invoice</button>
      </div>
    </div>
    <div class="tabs">
      <button class="${salesTab==='invoices'?'active':''}" data-tab="invoices">Invoices</button>
      <button class="${salesTab==='quotations'?'active':''}" data-tab="quotations">Quotations</button>
    </div>
    <div class="card">${salesTab==='invoices'?renderInvoiceTable():renderQuoteTable()}</div>
  `;
}
function renderInvoiceTable(){
  if(!state.invoices.length) return `<div class="empty">No invoices yet. Create your first one.</div>`;
  const rows = [...state.invoices].sort((a,b)=>b.date.localeCompare(a.date));
  return `<table><thead><tr><th>No.</th><th>Customer</th><th>Date</th><th>Due</th><th>Total</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map(inv=>{
      const cust = state.customers.find(c=>c.id===inv.customerId);
      const st = invoiceStatus(inv);
      const {total} = invoiceTotal(inv);
      return `<tr>
        <td class="mono">${inv.number}</td>
        <td>${cust?cust.name:'—'}</td>
        <td>${fmtDate(inv.date)}</td>
        <td>${fmtDate(inv.dueDate)}</td>
        <td class="figure">${fmtMoney(total)}</td>
        <td class="figure">${fmtMoney(invoiceBalance(inv))}</td>
        <td><span class="pill ${st}">${st}</span></td>
        <td class="row-actions">
          ${st!=='paid' && st!=='draft' ? `<button class="icon-btn" data-action="record-payment" data-id="${inv.id}">Record payment</button>`:''}
          ${st==='draft' ? `<button class="icon-btn" data-action="send-invoice" data-id="${inv.id}">Mark sent</button>`:''}
          <button class="icon-btn" data-action="view-invoice" data-id="${inv.id}">View</button>
          <button class="icon-btn" data-action="print-invoice" data-id="${inv.id}">PDF</button>
          ${waButton(cust&&cust.phone, `Hi ${cust?cust.name:''}, here's your invoice ${inv.number} from ${state.settings.businessName||'us'} for ${fmtMoney(total)}, due ${fmtDate(inv.dueDate)}. Outstanding balance: ${fmtMoney(invoiceBalance(inv))}. Thank you!`)}
        </td>
      </tr>`;
    }).join('')}
  </tbody></table>`;
}
function renderQuoteTable(){
  if(!state.quotations.length) return `<div class="empty">No quotations yet.</div>`;
  const rows = [...state.quotations].sort((a,b)=>b.date.localeCompare(a.date));
  return `<table><thead><tr><th>No.</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map(q=>{
      const cust = state.customers.find(c=>c.id===q.customerId);
      const sub = q.items.reduce((s,i)=>s+i.qty*i.price,0);
      const total = sub*(1+q.taxRate/100);
      return `<tr>
        <td class="mono">${q.number}</td>
        <td>${cust?cust.name:'—'}</td>
        <td>${fmtDate(q.date)}</td>
        <td class="figure">${fmtMoney(total)}</td>
        <td><span class="pill ${q.status==='won'?'won':'sent'}">${q.status}</span></td>
        <td class="row-actions">
          ${q.status!=='won' ? `<button class="icon-btn" data-action="convert-quote" data-id="${q.id}">Convert to invoice</button>`:''}
          ${waButton(cust&&cust.phone, `Hi ${cust?cust.name:''}, here's your quotation ${q.number} from ${state.settings.businessName||'us'} for ${fmtMoney(total)}. Let us know if you'd like to go ahead!`)}
        </td>
      </tr>`;
    }).join('')}
  </tbody></table>`;
}

/* ---------------- Expenses ---------------- */
let expensesTab = 'expenses';
function renderExpenses(){
  return `
    <div class="topbar">
      <div><h1>Expenses</h1><div class="sub">Every cedi out — categorised, plus what you owe suppliers.</div></div>
      ${expensesTab==='bills' ? `<button class="btn btn-primary" data-action="new-bill">+ Record supplier bill</button>` : `<button class="btn btn-primary" data-action="new-expense">+ Record expense</button>`}
    </div>
    <div class="tabs">
      <button class="${expensesTab==='expenses'?'active':''}" data-etab="expenses">Expenses</button>
      <button class="${expensesTab==='bills'?'active':''}" data-etab="bills">Supplier Bills (Payable)</button>
    </div>
    ${expensesTab==='expenses' ? renderExpensesBody() : renderBillsBody()}
  `;
}
function renderExpensesBody(){
  const rows = [...state.expenses].sort((a,b)=>b.date.localeCompare(a.date));
  const byCat = {};
  state.expenses.forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
  const catRows = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  return `
    <div class="grid grid-2">
      <div class="card">
        <h3>Recent expenses</h3>
        ${rows.length? `<table><thead><tr><th>Date</th><th>Vendor</th><th>Category</th><th>Method</th><th>Amount</th></tr></thead><tbody>
          ${rows.map(e=>`<tr>
            <td>${fmtDate(e.date)}</td><td>${e.vendor||'—'}</td><td>${e.category}</td>
            <td style="text-transform:capitalize">${e.method}${e.recurring?' · recurring':''}</td>
            <td class="figure">${fmtMoney(e.amount)}</td>
          </tr>`).join('')}
        </tbody></table>` : `<div class="empty">No expenses recorded yet.</div>`}
      </div>
      <div class="card">
        <h3>By category</h3>
        ${catRows.length? catRows.map(([c,v])=>`
          <div style="display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px solid var(--paper-2); font-size:13.5px;">
            <span>${c}</span><span class="figure">${fmtMoney(v)}</span>
          </div>`).join('') : `<div class="empty">Nothing to show yet.</div>`}
      </div>
    </div>
  `;
}
function renderBillsBody(){
  const rows = [...state.bills].sort((a,b)=>b.date.localeCompare(a.date));
  const ap = totalAP();
  return `
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card"><div class="lbl">Total owed to suppliers</div><div class="num figure" style="color:${ap>0?'var(--rust)':'inherit'}">${fmtMoney(ap)}</div></div>
      <div class="card stat-card"><div class="lbl">Open bills</div><div class="num">${state.bills.filter(b=>billStatus(b)!=='paid').length}</div></div>
      <div class="card stat-card"><div class="lbl">Overdue bills</div><div class="num" style="color:${state.bills.filter(b=>billStatus(b)==='overdue').length?'var(--rust)':'inherit'}">${state.bills.filter(b=>billStatus(b)==='overdue').length}</div></div>
      <div class="card stat-card"><div class="lbl">Paid all-time</div><div class="num figure">${fmtMoney(state.bills.reduce((s,b)=>s+billPaid(b),0))}</div></div>
    </div>
    <div class="card">
      ${!rows.length ? `<div class="empty">No supplier bills recorded yet — add one to track what you owe.</div>` : `
      <table><thead><tr><th>Supplier</th><th>Bill date</th><th>Due</th><th>Amount</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody>
        ${rows.map(b=>{
          const st = billStatus(b);
          return `<tr>
            <td>${b.vendor}</td><td>${fmtDate(b.date)}</td><td>${fmtDate(b.dueDate)}</td>
            <td class="figure">${fmtMoney(b.amount)}</td>
            <td class="figure">${fmtMoney(billBalance(b))}</td>
            <td><span class="pill ${st==='paid'?'paid':st==='overdue'?'overdue':st==='partial'?'partial':'sent'}">${st}</span></td>
            <td class="row-actions">${st!=='paid'?`<button class="icon-btn" data-action="pay-bill" data-id="${b.id}">Record payment</button>`:''}</td>
          </tr>`;
        }).join('')}
      </tbody></table>`}
    </div>
  `;
}

/* ---------------- Bank & MoMo statement import ---------------- */
let stagedTxns = [];
function detectDelimiter(line){
  const candidates = [',',';','\t'];
  let best=',', bestCount=-1;
  candidates.forEach(d=>{
    const count = line.split(d).length;
    if(count>bestCount){ bestCount=count; best=d; }
  });
  return best;
}
function splitDelimLine(line, delim){
  const out=[]; let cur=''; let inQ=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){ inQ=!inQ; continue; }
    if(ch===delim && !inQ){ out.push(cur); cur=''; } else cur+=ch;
  }
  out.push(cur);
  return out.map(s=>s.trim());
}
function looksLikeDateStr(s){ return /\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}/.test(s||''); }
function parseAmountStr(s){
  if(!s) return 0;
  const neg = /\(.*\)/.test(s) || /^-/.test(s.trim());
  const n = parseFloat((s.match(/[\d.,]+/)||['0'])[0].replace(/,/g,''))||0;
  return neg ? -Math.abs(n) : n;
}
function normalizeDateStr(s){
  const m1 = s.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if(m1) return `${m1[1]}-${m1[2].padStart(2,'0')}-${m1[3].padStart(2,'0')}`;
  const m2 = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if(m2){ const yr = m2[3].length===2?'20'+m2[3]:m2[3]; return `${yr}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`; }
  return todayISO();
}
function parseStatementCSV(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
  if(!lines.length) return [];
  const delim = detectDelimiter(lines[0]);
  let rows = lines.map(l=>splitDelimLine(l, delim));
  const headerKeywords = ['date','description','narration','particulars','details','amount','debit','credit','value'];
  let headerIdx=-1;
  for(let i=0;i<Math.min(rows.length,6);i++){
    if(headerKeywords.some(k=>rows[i].join(' ').toLowerCase().includes(k))){ headerIdx=i; break; }
  }
  let col = {date:0, desc:1, amount:2, debit:-1, credit:-1};
  if(headerIdx>=0){
    rows[headerIdx].forEach((h,i)=>{
      const hl = h.toLowerCase();
      if(hl.includes('date')) col.date=i;
      else if(hl.includes('desc')||hl.includes('narr')||hl.includes('particular')||hl.includes('detail')) col.desc=i;
      else if(hl.includes('debit')) col.debit=i;
      else if(hl.includes('credit')) col.credit=i;
      else if(hl.includes('amount')||hl.includes('value')) col.amount=i;
    });
    rows = rows.slice(headerIdx+1);
  }
  const out=[];
  rows.forEach(r=>{
    if(!r.length || r.every(c=>!c)) return;
    const dateRaw = r[col.date]||'';
    if(!looksLikeDateStr(dateRaw)) return;
    const desc = r[col.desc] || 'Transaction';
    let amount=0, type='expense';
    if(col.debit>=0 || col.credit>=0){
      const debit = col.debit>=0 ? Math.abs(parseAmountStr(r[col.debit])) : 0;
      const credit = col.credit>=0 ? Math.abs(parseAmountStr(r[col.credit])) : 0;
      if(credit>0){ amount=credit; type='income'; } else { amount=debit; type='expense'; }
    } else {
      const n = parseAmountStr(r[col.amount]);
      amount = Math.abs(n); type = n<0 ? 'expense' : 'income';
    }
    if(amount>0) out.push({ date: normalizeDateStr(dateRaw), description: desc, amount, type, category:'Other', include:true });
  });
  return out;
}
function parseStatementFreeText(text){
  const lines = text.split(/\n/).map(l=>l.trim()).filter(Boolean);
  const out=[];
  lines.forEach(line=>{
    const dateMatch = line.match(/\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}/);
    if(!dateMatch) return;
    const numMatches = line.match(/-?\(?\d[\d,]*\.\d{2}\)?/g);
    if(!numMatches || !numMatches.length) return;
    const amountRaw = numMatches[numMatches.length-1];
    const amount = Math.abs(parseAmountStr(amountRaw));
    if(!amount) return;
    let desc = line.replace(dateMatch[0],'').replace(amountRaw,'').trim() || 'Transaction';
    const type = /credit|deposit|received|\bcr\b/i.test(line) ? 'income' : 'expense';
    out.push({ date: normalizeDateStr(dateMatch[0]), description: desc, amount, type, category:'Other', include:true });
  });
  return out;
}
function isLikelyDuplicateTxn(t){
  return state.expenses.some(e=>e.date===t.date && Math.abs(e.amount-t.amount)<0.01);
}
function renderBankImport(){
  return `
    <div class="topbar">
      <div><h1>Bank &amp; MoMo Import</h1><div class="sub">Upload a statement, review each line, then bring it into your books.</div></div>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <h3>Upload a statement</h3>
      <p style="color:var(--slate); font-size:12.5px; margin-top:-4px;">CSV or TXT exports parse most reliably. PDF statements are read on a best-effort basis — bank layouts vary a lot, so check the results carefully before importing.</p>
      <input type="file" id="bankFile" accept=".csv,.txt,.pdf">
    </div>
    <div id="bankStaging">${stagedTxns.length ? renderStagedTxnTable() : ''}</div>
  `;
}
function renderStagedTxnTable(){
  return `
    <div class="card" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>${stagedTxns.length} transaction${stagedTxns.length>1?'s':''} found — review before importing.</div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost btn-sm" data-action="ai-categorize">✨ Auto-categorize with Besesaka</button>
        <button class="btn btn-primary btn-sm" data-action="import-staged">Import selected</button>
      </div>
    </div>
    <div class="card">
      <table><thead><tr><th></th><th>Date</th><th>Description</th><th>Amount</th><th>Type</th><th>Category</th><th></th></tr></thead><tbody>
      ${stagedTxns.map((t,i)=>`<tr>
          <td><input type="checkbox" class="stg-include" data-i="${i}" ${t.include?'checked':''}></td>
          <td>${fmtDate(t.date)}</td>
          <td><input class="stg-desc" data-i="${i}" value="${(t.description||'').replace(/"/g,'&quot;')}" style="border:none; background:transparent; width:100%;"></td>
          <td class="figure">${fmtMoney(t.amount)}</td>
          <td><select class="stg-type" data-i="${i}"><option value="expense" ${t.type==='expense'?'selected':''}>Expense</option><option value="income" ${t.type==='income'?'selected':''}>Income</option></select></td>
          <td>${t.type==='expense' ? `<select class="stg-cat" data-i="${i}">${state.expenseCategories.map(c=>`<option ${t.category===c?'selected':''}>${c}</option>`).join('')}</select>` : '—'}</td>
          <td>${isLikelyDuplicateTxn(t)?`<span class="pill overdue">duplicate?</span>`:''}</td>
        </tr>`).join('')}
      </tbody></table>
    </div>
  `;
}
async function aiCategorizeStagedTxns(){
  if(!stagedTxns.length) return;
  const sys = `You are a bookkeeping assistant. Given a JSON array of bank transactions (index, description, amount), classify each as "income" or "expense" and, for expenses, assign the single best-fitting category from this exact list: ${JSON.stringify(state.expenseCategories)}. Respond with ONLY a raw JSON array like [{"i":0,"type":"expense","category":"Rent"}] — no markdown, no commentary, no explanation.`;
  const payload = stagedTxns.map((t,i)=>({i, description:t.description, amount:t.amount}));
  try{
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:2000, system: sys, messages:[{role:'user', content: JSON.stringify(payload)}] })
    });
    const data = await resp.json();
    const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
    const clean = text.replace(/```json|```/g,'').trim();
    const results = JSON.parse(clean);
    results.forEach(r=>{
      if(stagedTxns[r.i]){
        stagedTxns[r.i].type = r.type==='income' ? 'income' : 'expense';
        if(r.category && state.expenseCategories.includes(r.category)) stagedTxns[r.i].category = r.category;
      }
    });
  }catch(e){ alert("Couldn't reach Besesaka just now — you can still set types and categories manually."); }
  render();
}
function importStagedTxns(){
  let count=0;
  stagedTxns.forEach(t=>{
    if(!t.include) return;
    if(t.type==='expense'){
      state.expenses.push({ id: uid('exp_'), date:t.date, amount:t.amount, category:t.category||'Other', method:'bank', vendor:t.description, recurring:false });
    } else {
      state.otherIncome.push({ id: uid('inc_'), date:t.date, amount:t.amount, description:t.description, method:'bank' });
    }
    count++;
  });
  stagedTxns = stagedTxns.filter(t=>!t.include);
  save();
  alert(`Imported ${count} transaction${count!==1?'s':''}.`);
  render();
}

/* ---------------- Inventory ---------------- */
function renderInventory(){
  const low = lowStockProducts();
  return `
    <div class="topbar">
      <div><h1>Inventory</h1><div class="sub">Products, stock levels, and margins.</div></div>
      <button class="btn btn-primary" data-action="new-product">+ Add product</button>
    </div>
    ${low.length ? `<div class="card" style="border-color:var(--rust); background:var(--rust-soft); margin-bottom:16px;">
      <strong>${low.length} item${low.length>1?'s':''} at or below reorder level:</strong> ${low.map(p=>p.name).join(', ')}
    </div>`:''}
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card"><div class="lbl">Products tracked</div><div class="num">${state.products.length}</div></div>
      <div class="card stat-card"><div class="lbl">Total units in stock</div><div class="num">${state.products.reduce((s,p)=>s+p.stockQty,0)}</div></div>
      <div class="card stat-card"><div class="lbl">Inventory value (cost)</div><div class="num figure">${fmtMoney(inventoryValue())}</div></div>
      <div class="card stat-card"><div class="lbl">Items low on stock</div><div class="num" style="color:${low.length?'var(--rust)':'inherit'}">${low.length}</div></div>
    </div>
    <div class="card">
      ${!state.products.length ? `<div class="empty">No products yet. Add your first item to start tracking stock.</div>` : `
      <table><thead><tr><th>Product</th><th>SKU</th><th>Cost price</th><th>Sell price</th><th>Margin</th><th>In stock</th><th></th></tr></thead><tbody>
        ${state.products.map(p=>{
          const margin = p.sellPrice>0 ? (((p.sellPrice-p.costPrice)/p.sellPrice)*100).toFixed(0) : '—';
          const lowFlag = p.stockQty<=p.lowStockThreshold;
          return `<tr>
            <td>${p.name}</td><td class="mono">${p.sku||'—'}</td>
            <td class="figure">${fmtMoney(p.costPrice)}</td><td class="figure">${fmtMoney(p.sellPrice)}</td>
            <td>${margin}${margin!=='—'?'%':''}</td>
            <td style="color:${lowFlag?'var(--rust)':'inherit'}; font-weight:${lowFlag?'700':'400'}">${p.stockQty}${lowFlag?' ⚠':''}</td>
            <td class="row-actions"><button class="icon-btn" data-action="restock-product" data-id="${p.id}">Restock</button></td>
          </tr>`;
        }).join('')}
      </tbody></table>`}
    </div>
  `;
}

/* ---------------- Payroll ---------------- */
function currentPeriod(){ return todayISO().slice(0,7); }
function runForPeriod(period){ return state.payrollRuns.find(r=>r.period===period); }
function renderPayroll(){
  const period = currentPeriod();
  const existingRun = runForPeriod(period);
  const activeEmp = state.employees.filter(e=>e.active);
  const estGross = activeEmp.reduce((s,e)=>s+e.basicSalary,0);
  const estNet = activeEmp.reduce((s,e)=>s+computePayslip(e.basicSalary).net,0);
  const estEmployerCost = activeEmp.reduce((s,e)=>s+computePayslip(e.basicSalary).employerCost,0);
  return `
    <div class="topbar">
      <div><h1>Payroll</h1><div class="sub">SSNIT and PAYE calculated automatically from Ghana's 2026 GRA bands.</div></div>
      <button class="btn btn-primary" data-action="new-employee">+ Add employee</button>
    </div>
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card"><div class="lbl">Active employees</div><div class="num">${activeEmp.length}</div></div>
      <div class="card stat-card"><div class="lbl">This month's gross</div><div class="num figure">${fmtMoney(estGross)}</div></div>
      <div class="card stat-card"><div class="lbl">This month's net pay</div><div class="num figure">${fmtMoney(estNet)}</div></div>
      <div class="card stat-card"><div class="lbl">Employer cost (incl. SSNIT)</div><div class="num figure">${fmtMoney(estEmployerCost)}</div></div>
    </div>
    <div class="card" style="margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong>${new Date(period+'-01').toLocaleDateString('en-GB',{month:'long', year:'numeric'})} payroll</strong>
        <div style="color:var(--slate); font-size:12.5px; margin-top:2px;">
          ${existingRun ? `Already run on ${fmtDate(existingRun.runDate)} — running again will replace it.` : 'Not run yet for this month.'}
        </div>
      </div>
      <button class="btn btn-gold" data-action="run-payroll" ${!activeEmp.length?'disabled':''}>${existingRun?'Re-run payroll':'Run payroll'}</button>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <h3>Employees</h3>
      ${!state.employees.length ? `<div class="empty">No employees yet. Add your team to start running payroll.</div>` : `
      <table><thead><tr><th>Name</th><th>Role</th><th>Basic salary</th><th>SSNIT (emp. / empl'r)</th><th>Est. PAYE</th><th>Est. net</th><th>Status</th><th></th></tr></thead><tbody>
        ${state.employees.map(e=>{
          const p = computePayslip(e.basicSalary);
          return `<tr>
            <td>${e.name}</td><td>${e.role||'—'}</td>
            <td class="figure">${fmtMoney(e.basicSalary)}</td>
            <td class="figure">${fmtMoney(p.ssnitEmployee)} / ${fmtMoney(p.ssnitEmployer)}</td>
            <td class="figure">${fmtMoney(p.paye)}</td>
            <td class="figure">${fmtMoney(p.net)}</td>
            <td><span class="pill ${e.active?'paid':'draft'}">${e.active?'active':'inactive'}</span></td>
            <td class="row-actions">
              <button class="icon-btn" data-action="toggle-employee" data-id="${e.id}">${e.active?'Deactivate':'Reactivate'}</button>
              ${waButton(e.phone, `Hi ${e.name}, your payslip for ${new Date(period+'-01').toLocaleDateString('en-GB',{month:'long', year:'numeric'})}: gross ${fmtMoney(e.basicSalary)}, net pay ${fmtMoney(p.net)}. Thank you for your work!`, 'Send payslip')}
            </td>
          </tr>`;
        }).join('')}
      </tbody></table>`}
    </div>
    <div class="card">
      <h3>Payroll history</h3>
      ${!state.payrollRuns.length ? `<div class="empty">No payroll runs yet.</div>` : `
      <table><thead><tr><th>Period</th><th>Run date</th><th>Employees paid</th><th>Total gross</th><th>Total net</th><th></th></tr></thead><tbody>
        ${[...state.payrollRuns].sort((a,b)=>b.period.localeCompare(a.period)).map(r=>`
          <tr>
            <td>${new Date(r.period+'-01').toLocaleDateString('en-GB',{month:'long', year:'numeric'})}</td>
            <td>${fmtDate(r.runDate)}</td><td>${r.entries.length}</td>
            <td class="figure">${fmtMoney(r.totalGross)}</td><td class="figure">${fmtMoney(r.totalNet)}</td>
            <td><button class="icon-btn" data-action="view-payrun" data-id="${r.id}">View payslips</button></td>
          </tr>`).join('')}
      </tbody></table>`}
    </div>
  `;
}

/* ---------------- Customers ---------------- */
function renderCustomers(){
  return `
    <div class="topbar">
      <div><h1>Customers</h1><div class="sub">Everyone you invoice, and what they owe.</div></div>
      <button class="btn btn-primary" data-action="new-customer">+ Add customer</button>
    </div>
    <div class="card">${renderCustomerTable()}</div>
  `;
}
function renderCustomerTable(){
  if(!state.customers.length) return `<div class="empty">No customers yet. Add one to start invoicing.</div>`;
  return `<table><thead><tr><th>Name</th><th>Phone</th><th>Total invoiced</th><th>Outstanding</th><th></th></tr></thead><tbody>
      ${state.customers.map(c=>{
        const invs = state.invoices.filter(i=>i.customerId===c.id && i.status!=='draft');
        const totalInv = invs.reduce((s,i)=>s+invoiceTotal(i).total,0);
        const out = invs.reduce((s,i)=>s+Math.max(0,invoiceBalance(i)),0);
        return `<tr>
          <td>${c.name}</td><td>${c.phone||'—'}</td>
          <td class="figure">${fmtMoney(totalInv)}</td>
          <td class="figure" style="color:${out>0?'var(--rust)':'inherit'}">${fmtMoney(out)}</td>
          <td><button class="icon-btn" data-action="view-statement" data-id="${c.id}">Portal / Statement</button></td>
        </tr>`;
      }).join('')}
    </tbody></table>`;
}

/* ---------------- CRM / Pipeline ---------------- */
function allOpenTasks(){
  const out = [];
  state.leads.forEach(l=>(l.tasks||[]).forEach(t=>{ if(!t.done) out.push({...t, leadId:l.id, leadName:l.name}); }));
  return out.sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
}
function renderCRM(){
  const counts = {};
  PIPELINE_STAGES.forEach(s=>counts[s]=0);
  state.leads.forEach(l=>counts[l.stage]=(counts[l.stage]||0)+1);
  const totalValue = state.leads.reduce((s,l)=>s+(l.dealValue||0),0);
  const openValue = state.leads.filter(l=>l.stage!=='Won'&&l.stage!=='Repeat Customer').reduce((s,l)=>s+(l.dealValue||0),0);
  const wonValue = state.leads.filter(l=>l.stage==='Won'||l.stage==='Repeat Customer').reduce((s,l)=>s+(l.dealValue||0),0);
  const openTasks = allOpenTasks();
  const overdueTasks = openTasks.filter(t=>t.dueDate && t.dueDate<todayISO());
  return `
    <div class="topbar">
      <div><h1>CRM / Pipeline</h1><div class="sub">Every prospect, their deal value, and what's next.</div></div>
      <button class="btn btn-primary" data-action="new-lead">+ Add lead</button>
    </div>
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card"><div class="lbl">Open pipeline value</div><div class="num figure">${fmtMoney(openValue)}</div></div>
      <div class="card stat-card"><div class="lbl">Won value</div><div class="num figure" style="color:var(--green)">${fmtMoney(wonValue)}</div></div>
      <div class="card stat-card"><div class="lbl">Total leads</div><div class="num">${state.leads.length}</div></div>
      <div class="card stat-card"><div class="lbl">Tasks overdue</div><div class="num" style="color:${overdueTasks.length?'var(--rust)':'inherit'}">${overdueTasks.length}</div></div>
    </div>
    ${!state.leads.length ? `<div class="card"><div class="empty">No leads yet. Add a prospect to start tracking your pipeline.</div></div>` : `
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px;">
      ${PIPELINE_STAGES.map(s=>`<div style="flex:1; min-width:100px; text-align:center; padding:10px 6px; border-radius:8px; background:${stageColor(s)}14;">
        <div style="font-size:20px; font-weight:700; color:${stageColor(s)}">${counts[s]}</div>
        <div style="font-size:10.5px; color:var(--slate); text-transform:uppercase; letter-spacing:0.4px;">${s}</div>
      </div>`).join('')}
    </div>
    ${renderLeadSourceDashboard()}
    ${renderTaskWidget(openTasks)}
    <div class="card">
    <table><thead><tr><th>Name</th><th>Company</th><th>Deal value</th><th>Source</th><th>Stage</th><th>Follow up</th><th></th></tr></thead><tbody>
    ${[...state.leads].sort((a,b)=> PIPELINE_STAGES.indexOf(a.stage)-PIPELINE_STAGES.indexOf(b.stage)).map(l=>{
      const overdue = l.followUpDate && l.followUpDate < todayISO();
      return `<tr>
        <td><button class="icon-btn" data-action="view-lead" data-id="${l.id}" style="padding:0; font-weight:600; color:var(--ink);">${l.name}</button></td>
        <td>${l.company||'—'}</td>
        <td class="figure">${l.dealValue?fmtMoney(l.dealValue):'—'}</td>
        <td>${l.source||'—'}</td>
        <td><select class="lead-stage" data-id="${l.id}" style="width:auto; padding:4px 8px; font-size:12px; border-radius:14px; background:${stageColor(l.stage)}22; color:${stageColor(l.stage)}; border:1px solid ${stageColor(l.stage)}55;">
          ${PIPELINE_STAGES.map(s=>`<option value="${s}" ${s===l.stage?'selected':''}>${s}</option>`).join('')}
        </select></td>
        <td style="color:${overdue?'var(--rust)':'inherit'}">${l.followUpDate?fmtDate(l.followUpDate):'—'}</td>
        <td class="row-actions">
          <button class="icon-btn" data-action="view-lead" data-id="${l.id}">Details</button>
          ${l.stage==='Won' && !l.convertedCustomerId ? `<button class="icon-btn" data-action="convert-lead" data-id="${l.id}">Make customer</button>`:''}
          ${waButton(l.phone, `Hi ${l.name}, this is ${state.settings.ownerName||state.settings.businessName||'us'}. Just following up on our conversation — let me know if you have any questions!`)}
        </td>
      </tr>`;
    }).join('')}
    </tbody></table>
    </div>
    `}
  `;
}
function renderTaskWidget(openTasks){
  if(!openTasks.length) return '';
  return `
    <div class="card" style="margin-bottom:18px;">
      <h3>Follow-ups &amp; tasks</h3>
      <table><thead><tr><th>Task</th><th>Lead</th><th>Due</th><th></th></tr></thead><tbody>
        ${openTasks.slice(0,8).map(t=>{
          const overdue = t.dueDate && t.dueDate<todayISO();
          return `<tr>
            <td>${t.text}</td><td>${t.leadName}</td>
            <td style="color:${overdue?'var(--rust)':'inherit'}">${t.dueDate?fmtDate(t.dueDate):'—'}</td>
            <td><button class="icon-btn" data-action="complete-task" data-lead="${t.leadId}" data-task="${t.id}">Mark done</button></td>
          </tr>`;
        }).join('')}
      </tbody></table>
    </div>
  `;
}
function renderLeadSourceDashboard(){
  const bySource = {};
  state.leads.forEach(l=>{
    const src = l.source || 'Unspecified';
    if(!bySource[src]) bySource[src] = {total:0, won:0};
    bySource[src].total++;
    if(l.stage==='Won' || l.stage==='Repeat Customer') bySource[src].won++;
  });
  const entries = Object.entries(bySource).sort((a,b)=>b[1].total-a[1].total);
  if(!entries.length) return '';
  const totalLeads = state.leads.length;
  const totalWon = state.leads.filter(l=>l.stage==='Won'||l.stage==='Repeat Customer').length;
  const maxTotal = Math.max(...entries.map(e=>e[1].total));
  return `
    <div class="card" style="margin-bottom:18px; padding:16px 20px;">
      <h3>Leads by source · ${totalLeads} total, ${totalWon} won (${totalLeads?((totalWon/totalLeads)*100).toFixed(0):0}% conversion)</h3>
      ${entries.map(([src,d])=>`
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <div style="width:120px; font-size:12.5px; flex-shrink:0;">${src}</div>
          <div style="flex:1; background:var(--paper-2); border-radius:5px; height:14px; overflow:hidden; position:relative;">
            <div style="width:${(d.total/maxTotal)*100}%; background:var(--gold); height:100%;"></div>
          </div>
          <div style="width:110px; font-size:12px; color:var(--slate); text-align:right; flex-shrink:0;">${d.total} lead${d.total>1?'s':''} · ${d.won} won</div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ---------------- Reports ---------------- */
/* ---------------- Report security gate ----------------
   Locks Reports & Business Worth behind a password (hashed with
   SubtleCrypto SHA-256 — never stored in plain text) with an optional
   Face ID / fingerprint unlock via WebAuthn's platform authenticator.
   Honest caveat: like the rest of this app, enforcement happens in
   client-side JS, so it deters casual snooping rather than resisting
   someone with browser dev tools open. */
let reportsUnlocked = false;
async function sha256Hex(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function bufToBase64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function base64ToBuf(b64){ const bin = atob(b64); const arr = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); return arr.buffer; }
function isReportsLocked(){ return !!state.settings.reportsPasswordHash && !reportsUnlocked; }
function renderLockScreen(title){
  return `
    <div class="topbar"><div><h1>${title}</h1><div class="sub">🔒 Locked — enter your reports password to view.</div></div></div>
    <div class="card" style="max-width:360px;">
      <div class="field"><label>Password</label><input id="lockPw" type="password"></div>
      <button class="btn btn-primary" id="lockUnlock" style="width:100%; justify-content:center;">Unlock</button>
      ${state.settings.biometricCredentialId && window.PublicKeyCredential ? `<button class="btn btn-ghost" id="lockBiometric" style="width:100%; justify-content:center; margin-top:8px;">Use Face ID / Fingerprint</button>`:''}
      <div id="lockError" style="color:var(--rust); font-size:12px; margin-top:8px;"></div>
    </div>
  `;
}
async function registerBiometric(){
  if(!window.PublicKeyCredential){ alert("This device or browser doesn't support biometric unlock."); return; }
  try{
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({ publicKey:{
      challenge, rp:{ name:'SakeBooks' },
      user:{ id:userId, name: state.settings.ownerName||'owner', displayName: state.settings.ownerName||'Owner' },
      pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
      authenticatorSelection:{ authenticatorAttachment:'platform', userVerification:'required' },
      timeout:60000
    }});
    state.settings.biometricCredentialId = bufToBase64(cred.rawId);
    save(); render();
    alert('Biometric unlock enabled on this device.');
  }catch(e){ alert('Could not set up biometric unlock — '+(e.message||'it may have been cancelled.')); }
}

let reportTab = 'pl';
function renderReports(){
  if(isReportsLocked()) return renderLockScreen('Reports');
  return `
    <div class="topbar">
      <div><h1>Reports</h1><div class="sub">Generated automatically from your sales and expenses — no bookkeeping required.</div></div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-ghost" data-action="export-csv">Export CSV</button>
        <button class="btn btn-primary" data-action="print-report">Export as PDF</button>
      </div>
    </div>
    <div class="tabs">
      <button class="${reportTab==='pl'?'active':''}" data-rtab="pl">Profit &amp; Loss</button>
      <button class="${reportTab==='bs'?'active':''}" data-rtab="bs">Balance Sheet</button>
      <button class="${reportTab==='cf'?'active':''}" data-rtab="cf">Cash Flow</button>
    </div>
    <div class="card" id="reportCard">${renderReportBody()}</div>
  `;
}
function reportDocHTML(){
  const s = state.settings;
  const titleMap = {pl:'Profit & Loss', bs:'Balance Sheet', cf:'Cash Flow Summary'};
  return `<div class="doc-head">
      <div>${s.logoDataUrl?`<img src="${s.logoDataUrl}" class="doc-logo">`:''}<div class="doc-brand">${s.businessName||'Your Business'}</div>
        <div class="doc-meta">${[s.address, s.phone].filter(Boolean).join(' · ')}</div></div>
      <div class="doc-title"><div class="doc-title-label">${titleMap[reportTab].toUpperCase()}</div><div class="doc-title-num">${fmtDate(todayISO())}</div></div>
    </div>
    <div class="doc-report">${renderReportBody().split('class="figure"').join('').split("class='figure'").join('')}</div>
    <style>.doc-report table{width:100%; border-collapse:collapse; font-size:13.5px;} .doc-report td{padding:6px 8px; font-family:'IBM Plex Mono',monospace;} .doc-report td:first-child{font-family:'IBM Plex Sans',Arial,sans-serif;}</style>`;
}
function renderReportBody(){
  const mKey = todayISO().slice(0,7);
  if(reportTab==='pl'){
    const rev = revenueInMonth(mKey);
    const otherInc = state.otherIncome.filter(i=>monthKeyOf(i.date)===mKey).reduce((s,i)=>s+i.amount,0);
    const byCat = {};
    state.expenses.filter(e=>monthKeyOf(e.date)===mKey).forEach(e=>{ byCat[e.category]=(byCat[e.category]||0)+e.amount; });
    state.bills.filter(b=>monthKeyOf(b.date)===mKey).forEach(b=>{ byCat[b.category]=(byCat[b.category]||0)+b.amount; });
    const dep = depreciationInMonth(mKey);
    const interest = loanInterestInMonth(mKey);
    const totalExp = Object.values(byCat).reduce((s,v)=>s+v,0) + dep + interest;
    return `<h3>Profit &amp; Loss — ${new Date(mKey+'-01').toLocaleDateString('en-GB',{month:'long', year:'numeric'})}</h3>
      <table>
        <tr><td>Revenue (sales, excl. tax)</td><td class="figure" style="text-align:right">${fmtMoney(rev)}</td></tr>
        ${otherInc>0?`<tr><td>Other income (bank deposits)</td><td class="figure" style="text-align:right">${fmtMoney(otherInc)}</td></tr>`:''}
        ${Object.entries(byCat).map(([c,v])=>`<tr><td style="padding-left:20px; color:var(--slate)">${c}</td><td class="figure" style="text-align:right; color:var(--slate)">(${fmtMoney(v)})</td></tr>`).join('')}
        ${dep>0?`<tr><td style="padding-left:20px; color:var(--slate)">Depreciation</td><td class="figure" style="text-align:right; color:var(--slate)">(${fmtMoney(dep)})</td></tr>`:''}
        ${interest>0?`<tr><td style="padding-left:20px; color:var(--slate)">Loan interest</td><td class="figure" style="text-align:right; color:var(--slate)">(${fmtMoney(interest)})</td></tr>`:''}
        <tr style="border-top:1px solid var(--rule); font-weight:700;"><td>Net profit</td><td class="figure" style="text-align:right; color:${rev+otherInc-totalExp>=0?'var(--green)':'var(--rust)'}">${fmtMoney(rev+otherInc-totalExp)}</td></tr>
      </table>
      <p style="color:var(--slate); font-size:11.5px; margin-top:10px;">Supplier bills count as an expense the month they're billed, not when paid. Loan repayments split automatically — only the interest portion appears here; principal reduces the loan balance on the Balance Sheet.</p>`;
  }
  if(reportTab==='bs'){
    const w = businessWorthFigures();
    return `<h3>Balance Sheet — as at ${fmtDate(todayISO())}</h3>
      <table>
        <tr style="font-weight:700;"><td>Assets</td><td></td></tr>
        <tr><td style="padding-left:20px;">Cash on hand</td><td class="figure" style="text-align:right">${fmtMoney(w.cash)}</td></tr>
        <tr><td style="padding-left:20px;">Bank balance</td><td class="figure" style="text-align:right">${fmtMoney(w.bank)}</td></tr>
        <tr><td style="padding-left:20px;">Accounts receivable</td><td class="figure" style="text-align:right">${fmtMoney(w.ar)}</td></tr>
        <tr><td style="padding-left:20px;">Fixed assets (net book value)</td><td class="figure" style="text-align:right">${fmtMoney(w.fixedAssetsNBV)}</td></tr>
        <tr style="border-top:1px solid var(--rule);"><td><strong>Total assets</strong></td><td class="figure" style="text-align:right"><strong>${fmtMoney(w.totalAssets)}</strong></td></tr>
        <tr style="font-weight:700;"><td style="padding-top:14px;">Liabilities</td><td></td></tr>
        <tr><td style="padding-left:20px;">Accounts payable (unpaid supplier bills)</td><td class="figure" style="text-align:right">${fmtMoney(w.ap)}</td></tr>
        <tr><td style="padding-left:20px;">Loans payable (outstanding principal)</td><td class="figure" style="text-align:right">${fmtMoney(w.loansOutstanding)}</td></tr>
        <tr style="border-top:1px solid var(--rule);"><td><strong>Total liabilities</strong></td><td class="figure" style="text-align:right"><strong>${fmtMoney(w.totalLiabilities)}</strong></td></tr>
        <tr style="border-top:1px solid var(--rule); font-weight:700;"><td style="padding-top:8px;">Owner's equity</td><td class="figure" style="text-align:right; padding-top:8px;">${fmtMoney(w.equity)}</td></tr>
      </table>
      ${Math.abs(w.reconciliation)>1 ? `<p style="color:var(--rust); font-size:11.5px; margin-top:10px;">Assets and Liabilities + Equity are off by ${fmtMoney(w.reconciliation)} — usually means a transaction was recorded outside the normal flow (e.g. cash moved without an expense, invoice, asset, loan, or equity entry to match it).</p>` : `<p style="color:var(--slate); font-size:11.5px; margin-top:10px;">Assets = Liabilities + Owner's Equity ✓</p>`}`;
  }
  // cash flow
  const {cash, bank} = cashAndBankBalance();
  const inflow = state.invoices.reduce((s,i)=>s+invoicePaid(i),0);
  const otherIncTotal = state.otherIncome.reduce((s,i)=>s+i.amount,0);
  const outflow = state.expenses.reduce((s,e)=>s+e.amount,0);
  const billOutflow = state.bills.reduce((s,b)=>s+billPaid(b),0);
  const assetOutflow = state.assets.reduce((s,a)=>s+a.purchaseCost,0);
  const loanInflow = state.loans.reduce((s,l)=>s+l.principal,0);
  const loanRepayOutflow = state.loans.reduce((s,l)=>s+(l.payments||[]).reduce((ss,p)=>ss+p.amount,0),0);
  const equityIn = totalCapitalContributed();
  const equityOut = totalDrawings();
  return `<h3>Cash Flow Summary — all time</h3>
    <table>
      <tr><td>Cash &amp; mobile money collected from customers</td><td class="figure" style="text-align:right">${fmtMoney(inflow)}</td></tr>
      ${otherIncTotal>0?`<tr><td>Other bank deposits (imported)</td><td class="figure" style="text-align:right">${fmtMoney(otherIncTotal)}</td></tr>`:''}
      <tr><td>Cash paid out for expenses</td><td class="figure" style="text-align:right">(${fmtMoney(outflow)})</td></tr>
      <tr><td>Cash paid out to suppliers (bills)</td><td class="figure" style="text-align:right">(${fmtMoney(billOutflow)})</td></tr>
      ${assetOutflow>0?`<tr><td>Cash paid for fixed assets</td><td class="figure" style="text-align:right">(${fmtMoney(assetOutflow)})</td></tr>`:''}
      ${loanInflow>0?`<tr><td>Loan proceeds received</td><td class="figure" style="text-align:right">${fmtMoney(loanInflow)}</td></tr>`:''}
      ${loanRepayOutflow>0?`<tr><td>Loan repayments (principal + interest)</td><td class="figure" style="text-align:right">(${fmtMoney(loanRepayOutflow)})</td></tr>`:''}
      ${equityIn>0?`<tr><td>Owner capital / investment received</td><td class="figure" style="text-align:right">${fmtMoney(equityIn)}</td></tr>`:''}
      ${equityOut>0?`<tr><td>Owner drawings</td><td class="figure" style="text-align:right">(${fmtMoney(equityOut)})</td></tr>`:''}
      <tr style="border-top:1px solid var(--rule); font-weight:700;"><td>Net cash position</td><td class="figure" style="text-align:right">${fmtMoney(cash+bank)}</td></tr>
    </table>`;
}

/* ---------------- Assets, Loans & Equity ---------------- */
let assetsTab = 'assets';
function renderAssetsHub(){
  return `
    <div class="topbar">
      <div><h1>Assets, Loans &amp; Equity</h1><div class="sub">The parts of the books that aren't day-to-day sales and expenses.</div></div>
      ${assetsTab==='assets'?`<button class="btn btn-primary" data-action="new-asset">+ Add asset</button>`:''}
      ${assetsTab==='loans'?`<button class="btn btn-primary" data-action="new-loan">+ Add loan</button>`:''}
      ${assetsTab==='equity'?`<button class="btn btn-primary" data-action="new-equity">+ Record transaction</button>`:''}
    </div>
    <div class="tabs">
      <button class="${assetsTab==='assets'?'active':''}" data-atab="assets">Fixed Assets</button>
      <button class="${assetsTab==='loans'?'active':''}" data-atab="loans">Loans</button>
      <button class="${assetsTab==='equity'?'active':''}" data-atab="equity">Owner's Equity</button>
    </div>
    ${assetsTab==='assets'?renderAssetsTab():assetsTab==='loans'?renderLoansTab():renderEquityTab()}
  `;
}
const ASSET_CATEGORIES = ['Building','Vehicle','Machinery','Furniture & Fittings','Computer & IT Equipment','Land','Other'];
function renderAssetsTab(){
  const nbv = totalFixedAssetsNBV();
  return `
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card"><div class="lbl">Assets tracked</div><div class="num">${state.assets.length}</div></div>
      <div class="card stat-card"><div class="lbl">Net book value</div><div class="num figure">${fmtMoney(nbv)}</div></div>
      <div class="card stat-card"><div class="lbl">Depreciation this month</div><div class="num figure">${fmtMoney(depreciationInMonth(todayISO().slice(0,7)))}</div></div>
      <div class="card stat-card"><div class="lbl">Total cost (all-time)</div><div class="num figure">${fmtMoney(state.assets.reduce((s,a)=>s+a.purchaseCost,0))}</div></div>
    </div>
    <div class="card">
      ${!state.assets.length ? `<div class="empty">No fixed assets yet. Add equipment, vehicles, or property to start tracking depreciation.</div>` : `
      <table><thead><tr><th>Asset</th><th>Category</th><th>Purchased</th><th>Cost</th><th>Net book value</th><th>Status</th><th></th></tr></thead><tbody>
        ${state.assets.map(a=>{
          const d = depreciationForAsset(a);
          return `<tr>
            <td>${a.name}${a.assetTag?` <span class="mono" style="color:var(--slate); font-size:11px;">#${a.assetTag}</span>`:''}</td>
            <td>${a.category}</td><td>${fmtDate(a.purchaseDate)}</td>
            <td class="figure">${fmtMoney(a.purchaseCost)}</td>
            <td class="figure">${fmtMoney(d.nbv)}</td>
            <td><span class="pill ${a.status==='Active'?'paid':'draft'}">${a.status}</span></td>
            <td class="row-actions">${a.status==='Active'?`<button class="icon-btn" data-action="dispose-asset" data-id="${a.id}">Mark sold/damaged</button>`:''}</td>
          </tr>`;
        }).join('')}
      </tbody></table>`}
    </div>
  `;
}
function renderLoansTab(){
  const outstanding = totalLoansOutstanding();
  return `
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card"><div class="lbl">Loans on record</div><div class="num">${state.loans.length}</div></div>
      <div class="card stat-card"><div class="lbl">Outstanding balance</div><div class="num figure" style="color:${outstanding>0?'var(--rust)':'inherit'}">${fmtMoney(outstanding)}</div></div>
      <div class="card stat-card"><div class="lbl">Interest this month</div><div class="num figure">${fmtMoney(loanInterestInMonth(todayISO().slice(0,7)))}</div></div>
      <div class="card stat-card"><div class="lbl">Interest paid (all-time)</div><div class="num figure">${fmtMoney(allTimeLoanInterest())}</div></div>
    </div>
    <div class="card">
      ${!state.loans.length ? `<div class="empty">No loans on record. Add one to track repayments and interest automatically.</div>` : `
      <table><thead><tr><th>Lender</th><th>Principal</th><th>Rate</th><th>Received</th><th>Outstanding</th><th></th></tr></thead><tbody>
        ${state.loans.map(l=>{
          const out = loanOutstanding(l);
          return `<tr>
            <td>${l.lender}</td><td class="figure">${fmtMoney(l.principal)}</td>
            <td>${l.interestRatePct}%/yr</td><td>${fmtDate(l.dateReceived)}</td>
            <td class="figure" style="color:${out>0?'var(--rust)':'var(--green)'}">${fmtMoney(out)}</td>
            <td class="row-actions">${out>0.005?`<button class="icon-btn" data-action="repay-loan" data-id="${l.id}">Record repayment</button>`:''}</td>
          </tr>`;
        }).join('')}
      </tbody></table>`}
    </div>
  `;
}
function renderEquityTab(){
  const capital = totalCapitalContributed();
  const drawings = totalDrawings();
  const retained = retainedEarnings();
  const equity = totalOwnerEquity();
  return `
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card"><div class="lbl">Capital contributed</div><div class="num figure">${fmtMoney(capital)}</div></div>
      <div class="card stat-card"><div class="lbl">Retained earnings</div><div class="num figure" style="color:${retained>=0?'var(--green)':'var(--rust)'}">${fmtMoney(retained)}</div></div>
      <div class="card stat-card"><div class="lbl">Owner drawings</div><div class="num figure">${fmtMoney(drawings)}</div></div>
      <div class="card stat-card"><div class="lbl">Owner's equity</div><div class="num figure">${fmtMoney(equity)}</div></div>
    </div>
    <div class="card">
      ${!state.equityTransactions.length ? `<div class="empty">No equity transactions yet — record capital introduced, investments, or drawings here.</div>` : `
      <table><thead><tr><th>Date</th><th>Type</th><th>Who</th><th>Amount</th></tr></thead><tbody>
        ${[...state.equityTransactions].sort((a,b)=>b.date.localeCompare(a.date)).map(e=>`
          <tr><td>${fmtDate(e.date)}</td><td style="text-transform:capitalize;">${e.type}</td><td>${e.investorName||state.settings.ownerName||'Owner'}</td>
          <td class="figure" style="color:${e.type==='drawing'?'var(--rust)':'var(--green)'}">${e.type==='drawing'?'-':''}${fmtMoney(e.amount)}</td></tr>
        `).join('')}
      </tbody></table>`}
    </div>
  `;
}

/* ---------------- Business Worth ---------------- */
function renderBusinessWorth(){
  if(isReportsLocked()) return renderLockScreen('Business Worth');
  const w = businessWorthFigures();
  const health = businessHealthScore();
  const months = last6Months();
  return `
    <div class="topbar"><div><h1>Business Worth</h1><div class="sub">Your company's financial strength, at a glance.</div></div></div>
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card"><div class="lbl">Total assets</div><div class="num figure">${fmtMoney(w.totalAssets)}</div></div>
      <div class="card stat-card"><div class="lbl">Total liabilities</div><div class="num figure">${fmtMoney(w.totalLiabilities)}</div></div>
      <div class="card stat-card"><div class="lbl">Owner's equity (net worth)</div><div class="num figure" style="color:var(--green)">${fmtMoney(w.equity)}</div></div>
      <div class="card stat-card" style="display:flex; align-items:center; gap:14px;">
        <div class="health-ring" style="background:${health.color}22; color:${health.color}; border:3px solid ${health.color};">${health.score}</div>
        <div><div class="lbl">Strength score</div><div class="num" style="font-size:16px;">${health.label}</div></div>
      </div>
    </div>
    <div class="grid grid-2" style="margin-bottom:16px;">
      <div class="card">
        <h3>Ratios</h3>
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--paper-2);"><span>Debt-to-asset ratio</span><span class="figure">${(w.debtToAsset*100).toFixed(0)}%</span></div>
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--paper-2);"><span>Current ratio</span><span class="figure">${w.currentRatio===Infinity?'∞':w.currentRatio.toFixed(2)}</span></div>
        <div style="display:flex; justify-content:space-between; padding:8px 0;"><span>Working capital</span><span class="figure" style="color:${w.workingCapital>=0?'var(--green)':'var(--rust)'}">${fmtMoney(w.workingCapital)}</span></div>
        <p style="color:var(--slate); font-size:11.5px; margin-top:10px;">Lower debt-to-asset and a current ratio above 1 generally mean more breathing room. These are guides, not guarantees — read them alongside your cash position.</p>
      </div>
      <div class="card">
        <h3>Revenue &amp; profit trend — 6 months</h3>
        <canvas id="worthChart" height="180"></canvas>
      </div>
    </div>
  `;
}
function drawWorthChart(){
  const el = document.getElementById('worthChart');
  if(!el || !window.Chart) return;
  const months = last6Months();
  const revs = months.map(m=>revenueInMonth(m));
  const profits = months.map(m=>revenueInMonth(m)+state.otherIncome.filter(i=>monthKeyOf(i.date)===m).reduce((s,i)=>s+i.amount,0)-expensesInMonth(m));
  const labels = months.map(m=>{ const [y,mo]=m.split('-'); return new Date(y,mo-1,1).toLocaleDateString('en-GB',{month:'short'}); });
  if(el._chart) el._chart.destroy();
  el._chart = new Chart(el, {
    type:'line',
    data:{ labels, datasets:[
      {label:'Revenue', data:revs, borderColor:'#C9971E', backgroundColor:'#C9971E22', fill:true, tension:0.3},
      {label:'Net profit', data:profits, borderColor:'#16213E', backgroundColor:'#16213E14', fill:true, tension:0.3}
    ]},
    options:{ responsive:true, plugins:{legend:{position:'bottom'}} }
  });
}

/* ---------------- Settings ---------------- */
/* ---------------- Budgeting ---------------- */
function renderBudgeting(){
  const mKey = todayISO().slice(0,7);
  const cats = state.expenseCategories;
  const actualByCat = {};
  state.expenses.filter(e=>monthKeyOf(e.date)===mKey).forEach(e=>{ actualByCat[e.category]=(actualByCat[e.category]||0)+e.amount; });
  const totalBudget = cats.reduce((s,c)=>s+(state.budgets[c]||0),0);
  const totalActual = Object.values(actualByCat).reduce((s,v)=>s+v,0);
  const overBudget = cats.filter(c=>(state.budgets[c]||0)>0 && (actualByCat[c]||0) > state.budgets[c]);
  return `
    <div class="topbar">
      <div><h1>Budgeting</h1><div class="sub">${new Date(mKey+'-01').toLocaleDateString('en-GB',{month:'long', year:'numeric'})} — set a monthly target per category and track spend against it.</div></div>
      <button class="btn btn-primary" data-action="edit-budgets">Set budgets</button>
    </div>
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="card stat-card"><div class="lbl">Total monthly budget</div><div class="num figure">${fmtMoney(totalBudget)}</div></div>
      <div class="card stat-card"><div class="lbl">Spent so far</div><div class="num figure">${fmtMoney(totalActual)}</div></div>
      <div class="card stat-card"><div class="lbl">Remaining</div><div class="num figure" style="color:${totalBudget-totalActual>=0?'var(--green)':'var(--rust)'}">${fmtMoney(totalBudget-totalActual)}</div></div>
      <div class="card stat-card"><div class="lbl">Categories over budget</div><div class="num" style="color:${overBudget.length?'var(--rust)':'inherit'}">${overBudget.length}</div></div>
    </div>
    <div class="card">
      <h3>By category</h3>
      ${cats.map(c=>{
        const budget = state.budgets[c]||0;
        const actual = actualByCat[c]||0;
        const pct = budget>0 ? Math.min(150,(actual/budget)*100) : (actual>0?100:0);
        const over = budget>0 && actual>budget;
        return `<div style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
            <span>${c}</span>
            <span class="figure">${fmtMoney(actual)} ${budget>0?`/ ${fmtMoney(budget)}`:'(no budget set)'}</span>
          </div>
          <div style="background:var(--paper-2); border-radius:5px; height:9px; overflow:hidden;">
            <div style="width:${Math.min(100,pct)}%; background:${over?'var(--rust)':'var(--gold)'}; height:100%;"></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}
function openBudgetModal(){
  showModal(`
    <h2>Set monthly budgets</h2>
    <div class="modal-sub">One target per category, applied every month.</div>
    ${state.expenseCategories.map(c=>`
      <div class="field-row" style="align-items:center;">
        <div style="font-size:13.5px;">${c}</div>
        <input class="budget-input" data-cat="${c.replace(/"/g,'&quot;')}" type="number" step="0.01" value="${state.budgets[c]||0}">
      </div>
    `).join('')}
    <button class="btn btn-primary" id="budget_save" style="margin-top:10px;">Save budgets</button>
  `);
  document.getElementById('budget_save').onclick = ()=>{
    document.querySelectorAll('.budget-input').forEach(inp=>{
      const val = +inp.value||0;
      if(val>0) state.budgets[inp.dataset.cat] = val; else delete state.budgets[inp.dataset.cat];
    });
    save(); closeModal(); render();
  };
}

function renderSettings(){
  const s = state.settings;
  return `
    <div class="topbar"><div><h1>Business Settings</h1><div class="sub">Appears on your invoices and quotations.</div></div></div>
    <div class="card" style="max-width:640px;">
      <div class="field-row">
        <div class="field"><label>Business name</label><input id="s_name" value="${s.businessName||''}"></div>
        <div class="field"><label>Owner name</label><input id="s_owner" value="${s.ownerName||''}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Phone</label><input id="s_phone" value="${s.phone||''}"></div>
        <div class="field"><label>Tax ID (GRA)</label><input id="s_tax" value="${s.taxId||''}"></div>
      </div>
      <div class="field"><label>Address</label><input id="s_addr" value="${s.address||''}"></div>
      <div class="field-row">
        <div class="field"><label>Currency</label>
          <select id="s_curr">${CURRENCIES.map(c=>`<option value="${c.code}" ${s.currency===c.code?'selected':''}>${c.code} — ${c.name.split(' — ')[1]}</option>`).join('')}</select>
        </div>
        <div class="field"><label>VAT scheme</label>
          <select id="s_scheme">
            <option value="standard" ${s.taxScheme==='standard'?'selected':''}>Standard (15% VAT + 2.5% NHIL + 2.5% GETFund = 20%)</option>
            <option value="flat" ${s.taxScheme==='flat'?'selected':''}>VAT Flat Rate Scheme (3%)</option>
            <option value="none" ${s.taxScheme==='none'?'selected':''}>Not VAT registered</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" data-action="save-settings">Save settings</button>
      <p style="color:var(--slate); font-size:12px; margin-top:14px;">Ghana's effective VAT rate is 20% since the Jan 2026 reforms (15% VAT + 2.5% NHIL + 2.5% GETFund, all on the same base; the old 1% COVID levy was scrapped). This is a default — check GRA for your specific registration.</p>
    </div>

    <div class="card" style="max-width:640px; margin-top:18px;">
      <h3>Expense categories</h3>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        ${state.expenseCategories.map((c,i)=>`
          <span style="background:var(--paper-2); border:1px solid var(--rule); border-radius:16px; padding:5px 8px 5px 12px; font-size:12.5px; display:inline-flex; align-items:center; gap:6px;">
            ${c} <button data-action="remove-category" data-idx="${i}" style="all:unset; cursor:pointer; color:var(--rust); font-weight:700; padding:0 4px;">✕</button>
          </span>`).join('')}
      </div>
      <div style="display:flex; gap:8px;">
        <input id="newCatInput" placeholder="e.g. Equipment lease" style="flex:1;">
        <button class="btn btn-ghost btn-sm" data-action="add-category">+ Add category</button>
      </div>
    </div>

    <div class="card" style="max-width:640px; margin-top:18px;">
      <h3>Invoice branding</h3>
      <div class="field">
        <label>Business logo</label>
        <div style="display:flex; align-items:center; gap:14px;">
          ${s.logoDataUrl ? `<img src="${s.logoDataUrl}" style="height:52px; max-width:140px; object-fit:contain; border:1px solid var(--rule); border-radius:6px; padding:4px; background:#fff;">` : `<div style="height:52px; width:90px; border:1px dashed var(--rule); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:11px; color:var(--slate);">No logo</div>`}
          <input type="file" id="logoUpload" accept="image/*" style="flex:1;">
          ${s.logoDataUrl ? `<button class="btn btn-ghost btn-sm" data-action="remove-logo">Remove</button>` : ''}
        </div>
      </div>
      <label style="margin-top:16px;">Invoice template</label>
      <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-top:6px;">
        ${INVOICE_TEMPLATES.map(t=>`
          <button data-action="pick-template" data-tpl="${t.key}" style="all:unset; cursor:pointer; border:2px solid ${s.invoice