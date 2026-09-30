'use strict';
/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const db = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('fc_' + k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem('fc_' + k, JSON.stringify(v)); }
};
const sum = (a, f) => a.reduce((t, x) => {
  const value = Number(f(x));
  return t + (Number.isFinite(value) ? value : 0);
}, 0);
const peso = n => '₱' + (+n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const add = (k, o) => db.set(k, [...db.get(k, []), { id: uid(), date: today(), ...o }]);
const toast = m => {
  const t = $('#toast'); t.textContent = m; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2800);
};
const badge = c => `<span class="badge ${c}">Class ${c}</span>`;
const sel = (n, o) => `<select name="${n}">${o.map(x => `<option>${x}</option>`).join('')}</select>`;
const inp = (n, a = '') => `<input name="${n}" ${a} required>`;
const CLS = '<select name="cls"><option value="A">Class A: High quality</option><option value="B">Class B: Neither good nor bad</option><option value="C">Class C: Bad but can be cooked</option></select>';
const pwf = (n, l) => `<label>${l}<span class="pw"><input type="password" name="${n}" data-pw required minlength="8" maxlength="8" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8}" value="${genPw('strong')}" autocomplete="new-password"><button type="button" class="eye" aria-label="Show or hide password">👁</button></span><div class="meter"><i></i></div></label>`;
const GEN = '<p class="gen">Generate password: <button type="button" class="btn ghost sm" data-gen="weak">Weak</button><button type="button" class="btn ghost sm" data-gen="medium">Medium</button><button type="button" class="btn ghost sm" data-gen="strong">Strong</button></p>';
 
function genPw(level) {
  const L = 'abcdefghjkmnpqrstuvwxyz', U = L.toUpperCase(), N = '23456789', S = '!@#$%&*?';
  const pick = s => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const pool = { weak: L, medium: L + U + N, strong: L + U + N + S }[level];
  const len = { weak: 6, medium: 10, strong: 8 }[level];
  const p = [...Array(len)].map(() => pick(pool));
  if (level === 'strong') { p[0] = pick(U); p[1] = pick(L); p[2] = pick(N); p[3] = pick(S); }
  return p.join('');
}
 
/* table with optional delete / custom action button per row */
const table = (cols, rows, del, act) => {
  if (!rows.length) return '<p class="mut">No records yet. Add one using the form.</p>';
  const btn = r => (act ? `<button class="btn sm" data-a="${act[1]}" data-i="${r.id}">${act[0]}</button> ` : '') +
    (del ? `<button class="btn danger sm" data-a="del" data-k="${del}" data-i="${r.id}">Delete</button>` : '');
  return `<div class="tw"><table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}${del || act ? '<th></th>' : ''}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.cells.map(c => `<td>${c}</td>`).join('')}${del || act ? `<td>${btn(r)}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
};
 
const ICON = {
  decision: 'M3 3v18h18M7 15l4-4 3 3 5-6', employee: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', supply: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  expenses: 'M3 7a2 2 0 0 1 2-2h14v4M3 7v10a2 2 0 0 0 2 2h16V9H5a2 2 0 0 1-2-2zM17 14h.01', profit: 'M22 7l-9 9-4-4-7 7M16 7h6v6',
  ai: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10',
  unclassified: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01',
  income: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', expense: 'M3 7a2 2 0 0 1 2-2h14v4M3 7v10a2 2 0 0 0 2 2h16V9H5a2 2 0 0 1-2-2z',
  loss: 'M22 17l-9-9-4 4-7-7M16 17h6v-6', net: 'M22 7l-9 9-4-4-7 7M16 7h6v6'
};
const ic = k => `<svg class="i" viewBox="0 0 24 24"><path d="${ICON[k] || ICON.decision}"/></svg>`;
const spark = a => {
  if (a.length < 2) return '';
  const mx = Math.max(...a), mn = Math.min(...a), r = mx - mn || 1;
  return `<svg class="sp" viewBox="0 0 90 34" aria-hidden="true"><polyline points="${a.slice(-12).map((v, i, b) => `${i / (b.length - 1) * 90},${30 - (v - mn) / r * 26}`).join(' ')}"/></svg>`;
};
const stat = (l, v, k, a) => `<div class="card stat ${v < 0 ? 'neg' : ''}"><div class="ic">${ic(k)}</div><span>${l}</span><b>${peso(v)}</b>${spark(a)}</div>`;
 
const chart = () => {
  const c = { A: 0, B: 0, C: 0 }, col = { A: 'var(--A)', B: 'var(--B)', C: 'var(--C)' };
  db.get('sales', []).forEach(s => c[s.cls] += s.qty);
  const t = c.A + c.B + c.C; let a = 0;
  const seg = ['A', 'B', 'C'].map(k => { const st = a; a += t ? c[k] / t * 100 : 0; return `${col[k]} ${st}% ${a}%`; }).join(',');
  return `<div class="donut"><div class="ring" style="background:conic-gradient(${t ? seg : 'var(--line) 0 100%'})"><i>${t}</i></div>
    <div class="leg">${['A', 'B', 'C'].map(k => `<div><i style="background:${col[k]}"></i>Class ${k}: <b>${c[k]}</b></div>`).join('')}</div></div>`;
};
 
/* ---------- data + roles ---------- */
const users = () => db.get('users', []);
const cur = () => db.get('currentUser', null) || users().find(u => u.id === db.get('me', null));
const nextId = () => 'EMP-' + String(Math.max(0, ...users().map(u => +u.id.slice(4))) + 1).padStart(4, '0');
if (!users().length) db.set('users', [['Owner', 'Marco', 'Reyes'], ['Buyer', 'Ana', 'Cruz'], ['Checker', 'Ben', 'Santos'], ['Classifier', 'Cara', 'Lim']]
  .map(([role, first, last], i) => ({ id: 'EMP-000' + (i + 1), first, last, contact: '0917000000' + i, email: first.toLowerCase() + '@gmail.com', role, pw: 'Fish@1234' })));
 
const MENU = {
  Owner: [['decision', 'Decision'], ['employee', 'Employee'], ['chat', 'Coordination']],
  Buyer: [['supply', 'Supply'], ['chat', 'Coordination']],
  Checker: [['expenses', 'Expenses'], ['profit', 'Profitability'], ['chat', 'Coordination']],
  Classifier: [['records', 'Records'], ['ai', 'AI checker'], ['unclassified', 'Unclassified'], ['chat', 'Coordination']]
};
const CONTACTS = { Owner: ['Checker'], Buyer: ['Classifier', 'Checker'], Checker: ['Buyer', 'Classifier', 'Owner'], Classifier: ['Checker'] };
let view, peer, stream = null, has = false;
 
/* ---------- login / forgot password ---------- */
const showAuth = n => { $('#login').hidden = n !== 'login'; $('#forgot').hidden = n !== 'forgot'; };
$('#login').onsubmit = async e => {
  e.preventDefault();

  const form = new FormData(e.target);

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        employeeId: form.get('id').trim(),
        password: form.get('pw')
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return toast(result.message);
    }

    db.set('currentUser', result.employee);
    e.target.reset();
    start();
  } catch (error) {
    toast('Cannot connect to the server.');
    console.error(error);
  }
};
$('#forgot').onsubmit = e => {
  e.preventDefault();
  const f = new FormData(e.target), us = users();
  const u = us.find(u => u.id.toLowerCase() === f.get('id').trim().toLowerCase());
  if (!u) return toast('No employee found with that ID.');
  if (f.get('pw') !== f.get('pw2')) return toast('Passwords do not match.');
  u.pw = f.get('pw'); db.set('users', us);
  e.target.reset(); showAuth('login'); toast('Password updated. Log in with your new password.');
};
$('#logout').onclick = () => { db.set('currentUser', null); db.set('me', null); start(); };
 
function start() {
  const u = cur();
  $('#auth').hidden = !!u; $('#app').hidden = !u;
  if (!u) return showAuth('login');
  $('#avatar').textContent = u.first[0] + u.last[0];
  $('#me').innerHTML = `${esc(u.first)} ${esc(u.last)}<br><small>${u.role}, ${u.id}</small>`;
  go(MENU[u.role][0][0]);
}
function go(v) {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  view = v; has = false;
  $('#nav').innerHTML = MENU[cur().role].map(([k, t]) => `<button data-v="${k}" class="${k === v ? 'on' : ''}" ${k === v ? 'aria-current="page"' : ''}>${ic(k)}<span>${t}</span></button>`).join('');
  $('#title').textContent = MENU[cur().role].find(m => m[0] === v)[1];
  render();
  if (v === 'employee') loadEmployees();
  if (v === 'records') loadClassifierRecords();
  if (v === 'expenses') loadClassifierRecords('Submitted');
  if (v === 'supply') loadBuySupply();
  if (v === 'ai') loadAIResult();
  if (v === 'expenses' || v === 'profit') loadCheckerRecords();
  if (v === 'chat') loadChatContacts();
}
async function loadEmployees() {
  try {
    const response = await fetch('/api/employees');
    if (!response.ok) throw new Error('Employee request failed');
    db.set('users', await response.json());
    if (view === 'employee') render();
  } catch (error) {
    console.error(error);
    toast('Could not load employees from MySQL.');
  }
}
async function loadClassifierRecords(status) {
  try {
    const url = status ? `/api/classifier-records?status=${status}` : '/api/classifier-records';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Classifier record request failed');
    db.set(status === 'Submitted' ? 'submittedClassifierRecords' : 'classifierRecords', await response.json());
    if (view === 'records' || (view === 'expenses' && status === 'Submitted')) render();
  } catch (error) {
    console.error(error);
    toast('Could not load classifier records from MySQL.');
  }
}
async function loadBuySupply() {
  try {
    const response = await fetch('/api/buy-supply');
    if (!response.ok) throw new Error('Buyer supply request failed');
    db.set('supplies', await response.json());
    if (view === 'supply') render();
  } catch (error) {
    console.error(error);
    toast('Could not load supplies from MySQL.');
  }
}
async function loadCheckerRecords() {
  try {
    const [expensesResponse, salesResponse, lossesResponse] = await Promise.all([
      fetch('/api/ops-exp'), fetch('/api/sale-rec'), fetch('/api/los-rec')
    ]);
    if (![expensesResponse, salesResponse, lossesResponse].every(response => response.ok)) throw new Error('Checker record request failed');
    db.set('expenses', await expensesResponse.json());
    db.set('sales', await salesResponse.json());
    db.set('losses', await lossesResponse.json());
    if (view === 'expenses' || view === 'profit') render();
  } catch (error) {
    console.error(error);
    toast('Could not load Checker records from MySQL.');
  }
}
async function loadAIResult() {
  try {
    const response = await fetch('/api/ai-check/latest');
    if (!response.ok) throw new Error('AI result request failed');
    db.set('ai', await response.json());
    if (view === 'ai') render();
  } catch (error) {
    console.error(error);
    toast('Could not load AI results from MySQL.');
  }
}
async function loadChatContacts() {
  try {
    const u = cur();
    const response = await fetch(`/api/chat/contacts?employeeId=${encodeURIComponent(u.id)}&role=${encodeURIComponent(u.role)}`);
    if (!response.ok) throw new Error('Chat contacts request failed');
    const contacts = await response.json();
    db.set('chatContacts', contacts);
    if (!contacts.some(contact => contact.id === peer)) peer = contacts[0]?.id || null;
    if (view === 'chat') { render(); await loadChatMessages(); }
  } catch (error) { console.error(error); toast('Could not load chat contacts.'); }
}
async function loadChatMessages() {
  if (view !== 'chat' || !peer) return;
  try {
    const u = cur();
    const response = await fetch(`/api/chat/messages?fromId=${encodeURIComponent(u.id)}&toId=${encodeURIComponent(peer)}`);
    if (!response.ok) throw new Error('Chat messages request failed');
    const messages = await response.json();
    db.set('msgs', messages.map(message => ({ ...message, k: [u.id, peer].sort().join('|') })));
    render();
  } catch (error) { console.error(error); }
}
function render() {
  $('#main').innerHTML = V[view]();
  const m = $('#msgs'); if (m) m.scrollTop = m.scrollHeight;
  countUp();
}
 
/* ---------- views ---------- */
const V = {
  /* OWNER */
  decision() {
    const S = db.get('sales', []), inc = sum(S, s => s.qty * s.price);
    const ex = sum(db.get('expenses', []), e => e.amount) + sum(db.get('supplies', []), s => s.total);
    const loss = sum(db.get('losses', []), l => l.cost), net = inc - ex - loss, mg = inc ? net / inc : 0;
    const q = { A: 0, B: 0, C: 0 }; S.forEach(s => q[s.cls] += s.qty);
    const tq = q.A + q.B + q.C, pc = x => Math.round(x * 100) + '%', tips = [];
    if (!inc) tips.push('No sales yet. Once the Checker records sales, price and import suggestions appear here.');
    else {
      if (loss / inc > .1) tips.push(`Loss is ${pc(loss / inc)} of income. Buy smaller batches, sell older stock first and check ice and storage.`);
      if (mg < .15) tips.push(`Profit margin is only ${pc(mg)}. Raise prices, starting with Class A.`);
      if (tq && q.C / tq > .3) tips.push(`Class C is ${pc(q.C / tq)} of sales. Lower the Class C price to move it quickly and ask suppliers for better fish.`);
      if (mg > .3 && loss / inc < .05) tips.push(`Margin is ${pc(mg)} with low loss. Import more fish to grow income.`);
      if (!tips.length) tips.push('Income, expenses and loss look balanced. Keep current prices and import levels.');
    }
    return `<h2>Decision</h2><div class="cols">${[['Income', inc, 'income', S.map(s => s.qty * s.price)], ['Expenses', ex, 'expense', db.get('expenses', []).map(e => e.amount)], ['Loss', loss, 'loss', db.get('losses', []).map(l => l.cost)], ['Net profit', net, 'net', []]]
      .map(a => stat(...a)).join('')}</div>
      <div class="cols"><div class="card"><h3>Suggestions</h3><ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul></div>
      <div class="card"><h3>Sales by class</h3>${chart()}</div></div>`;
  },
  employee() {
    return `<h2>Employee</h2><form class="card" data-f="employee"><h3>New employee</h3><div class="cols">
      <label>Employee ID (auto)<input value="${nextId()}" readonly></label>
      <label>First name<input name="first" data-cap required></label>
      <label>Last name<input name="last" data-cap required></label>
      <label>Contact number<input name="contact" required pattern="09[0-9]{9}" maxlength="11" inputmode="numeric" title="11 digits, starting with 09"></label>
      <label>Email address<input name="email" type="email" required pattern=".+@gmail\\.com" title="Email must end with @gmail.com"></label>
      <label>User${sel('role', ['Buyer', 'Classifier', 'Checker'])}</label>${pwf('pw', 'Create password')}</div>${GEN}
      <button class="btn wide">Add employee</button></form>
      <div class="card"><h3>All employees</h3>${table(['ID', 'Name', 'Contact', 'Email', 'User'],
        users().map(u => ({ id: u.id, cells: [u.id, esc(u.first + ' ' + u.last), u.contact, esc(u.email), u.role] })), 'users')}</div>`;
  },
 
  /* BUYER */
  supply() {
    const S = db.get('supplies', []), t = sum(S.filter(s => s.date === today()), s => s.total);
    return `<h2>Supply</h2><form class="card" data-f="supply"><h3>New purchase</h3><div class="cols">
      <label>Box size${sel('size', ['Small', 'Medium', 'Big'])}</label>
      <label>Units (boxes)${inp('units', 'type="number" min="1" step="1"')}</label>
      <label>Price per box (₱)${inp('price', 'type="number" min="0" step="0.01"')}</label></div>
      <button class="btn">Add to purchase</button></form>
      <div class="card"><h3>Purchases</h3>${table(['Date', 'Size', 'Units', 'Price per box', 'Total'],
        S.map(s => ({ id: s.id, cells: [s.date, s.size, s.units, peso(s.price), peso(s.total)] })), 'supplies')}
      <p class="total">Total cost today: <b>${peso(t)}</b></p></div>`;
  },
 
  /* CHECKER */
  expenses() {
    const E = db.get('expenses', []), S = db.get('supplies', []), t = today();
    const submitted = db.get('submittedClassifierRecords', []);
    const te = sum(E.filter(e => e.date === t), e => e.amount), ts = sum(S.filter(s => s.date === t), s => s.total);
    return `<h2>Expenses</h2><form class="card" data-f="expense"><h3>Operational expense</h3><div class="cols">
      <label>Type${sel('cat', ['Labor', 'Salt', 'Cellophane', 'Ice', 'Fuel', 'Maintenance'])}</label>
      <label>Amount (₱)${inp('amount', 'type="number" min="0" step="0.01"')}</label>
      <label>Purpose${inp('purpose')}</label></div><button class="btn">Add expense</button></form>
      <div class="card" id="pe"><div class="head"><h3>Operational expenses</h3><button class="btn ghost sm" data-a="print" data-i="pe">Print</button></div>
      ${table(['Date', 'Type', 'Amount', 'Purpose'], E.map(e => ({ id: e.id, cells: [e.date, e.cat, peso(e.amount), esc(e.purpose)] })), 'expenses')}
      <p class="total">Total today: <b>${peso(te)}</b></p></div>
      <div class="card" id="ps"><div class="head"><h3>Supply from the Buyer</h3><button class="btn ghost sm" data-a="print" data-i="ps">Print</button></div>
      ${table(['Date', 'Size', 'Units', 'Price per box', 'Total', 'Status'], S.map(s => ({ id: s.id,
        cells: [s.date, s.size, s.units, peso(s.price), peso(s.total), s.cls ? 'Classified ' + badge(s.cls) : 'Unclassified'] })), 'supplies')}
      <p class="total">Purchases today: <b>${peso(ts)}</b>. All costs today: <b>${peso(te + ts)}</b></p></div>
      <div class="card"><h3>Submitted classifier records</h3>${submitted.length ? `<div class="tw"><table><thead><tr><th>Product</th><th>Box size</th><th>Quantity</th><th>Class</th><th>Record as</th></tr></thead><tbody>${submitted.map(r => `<tr>
        <td>${esc(r.productName)}</td><td>${r.boxSize}</td><td>${r.quantity}</td><td>${r.fishClass}</td><td class="acts">
          <form data-f="recordSale"><input type="hidden" name="recordId" value="${r.id}"><input type="number" name="price" min="0" step="0.01" placeholder="Sale price" required><button class="btn sm">Sale</button></form>
          <form data-f="recordLoss"><input type="hidden" name="recordId" value="${r.id}"><input name="cost" type="number" min="0" step="0.01" placeholder="Loss cost" required><input name="reason" placeholder="Reason" required><button class="btn danger sm">Loss</button></form>
        </td></tr>`).join('')}</tbody></table></div>` : '<p class="mut">No submitted classifier records are waiting for action.</p>'}</div>`;
  },
  profit() {
    const S = db.get('sales', []), L = db.get('losses', []);
    return `<h2>Profitability</h2><div class="cols">
      <form class="card" data-f="sale"><h3>Sales record</h3><label>Product name${inp('name')}</label><label>Class${CLS}</label>
        <label>Quantity${inp('qty', 'type="number" min="1"')}</label><label>Price (₱)${inp('price', 'type="number" min="0" step="0.01"')}</label>
        <button class="btn wide">Add sale</button></form>
      <form class="card" data-f="loss"><h3>Loss record</h3><label>Product name${inp('name')}</label>
        <label>Quantity${inp('qty', 'type="number" min="1"')}</label><label>Est. cost (₱)${inp('cost', 'type="number" min="0" step="0.01"')}</label>
        <label>Reason${inp('reason')}</label><button class="btn wide">Add loss</button></form>
      <div class="card"><h3>Sales by class (live)</h3>${chart()}</div></div>
      <div class="card"><h3>Sales</h3>${table(['Product', 'Class', 'Quantity', 'Price', 'Total'],
        S.map(s => ({ id: s.id, cells: [esc(s.name), badge(s.cls), s.qty, peso(s.price), peso(s.qty * s.price)] })), 'sales')}
        <p class="total">Total sales: <b>${peso(sum(S, s => s.qty * s.price))}</b></p></div>
      <div class="card"><h3>Losses</h3>${table(['Product', 'Quantity', 'Est. cost', 'Reason'],
        L.map(l => ({ id: l.id, cells: [esc(l.name), l.qty, peso(l.cost), esc(l.reason)] })), 'losses')}
        <p class="total">Total loss: <b>${peso(sum(L, l => l.cost))}</b></p></div>`;
  },
 
  /* CLASSIFIER */
  records() {
    const records = db.get('classifierRecords', []);
    return `<h2>Records</h2><div class="cols"><form class="card" data-f="classifierRecord"><h3>Manual fish record</h3>
      <label>Product name${inp('productName')}</label>
      <label>Box size${sel('boxSize', ['Small', 'Medium', 'Big'])}</label>
      <label>Quantity in box${inp('quantity', 'type="number" min="1" step="1"')}</label>
      <label>Class${sel('fishClass', ['A', 'B', 'C', 'Mixed'])}</label>
      <button class="btn wide">Add record</button></form>
      <div class="card"><h3>Record details</h3>${records.length ? `<div class="tw"><table><thead><tr><th>Product</th><th>Box size</th><th>Quantity</th><th>Class</th><th>Status</th><th></th></tr></thead><tbody>${records.map(r => `<tr>
        <td>${esc(r.productName)}</td><td>${r.boxSize}</td><td>${r.quantity}</td><td>${r.fishClass}</td><td>${r.status}</td><td><button class="btn danger sm" data-a="deleteRecord" data-i="${r.id}">Delete</button>${r.status === 'Draft' ? ` <button class="btn sm" data-a="submitRecord" data-i="${r.id}">Submit</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mut">No records yet. Add a manual fish record.</p>'}</div></div>`;
  },
  ai() {
    const r = db.get('ai', null), done = db.get('supplies', []).filter(s => s.status === 'Classified');
    return `<h2>AI quality checker</h2><div class="card">
      <p class="mut">Show a real fish with the camera or a photo. The checker looks at eyes, skin, scales and color, and skips anything that is not a fish.</p>
      <div class="cam"><div class="vf" id="vfv" hidden><video id="vid" autoplay playsinline muted></video></div><div class="vf" id="vf"><canvas id="cv" width="320" height="240"></canvas></div></div>
      <div class="acts"><button class="btn ghost" data-a="cam">Start camera</button><button class="btn ghost" data-a="snap">Capture frame</button>
      <button class="btn ghost" data-a="up">Upload image</button><input type="file" id="file" accept="image/*" hidden>
      <button class="btn" data-a="analyze">Check quality</button></div>
      <div id="res">${r ? resHtml(r) : ''}</div></div>
      <div class="card"><h3>Classified fish</h3>${table(['Date', 'Size', 'Units', 'Total', 'Class'],
        done.map(s => ({ id: s.id, cells: [s.date, s.size, s.units, peso(s.total), badge(s.cls)] })))}</div>`;
  },
  unclassified() {
    const S = db.get('supplies', []).filter(s => s.status === 'Unclassified'), r = db.get('ai', null);
    return `<h2>Unclassified</h2><div class="card"><p>${r ? `Latest AI result: ${badge(r.cls)}. Press Classified on the batch it belongs to.`
      : 'Check a batch in the AI checker first, then come back and press Classified.'}</p>
      ${table(['Date', 'Size', 'Units', 'Price per box', 'Total'],
        S.map(s => ({ id: s.id, cells: [s.date, s.size, s.units, peso(s.price), peso(s.total)] })), '', ['Classified', 'classify'])}</div>`;
  },
 
  /* COORDINATION (messenger style) */
  chat() {
    const u = cur(), contacts = db.get('chatContacts', []), selected = contacts.find(contact => contact.id === peer), ms = db.get('msgs', []).filter(m => m.k === [u.id, peer].sort().join('|'));
    return `<h2>Coordination</h2><div class="card chat"><div class="peers"><button class="btn ghost sm" data-a="refreshChat">Refresh messages</button>${contacts.map(contact => `<button class="${contact.id === peer ? 'on' : ''}" data-a="peer" data-i="${contact.id}"><span class="av">${contact.name[0]}</span>${esc(contact.name)}<small>${contact.role}</small></button>`).join('') || '<p class="mut">No available contacts.</p>'}</div>
      <div><div class="msgs" id="msgs">${ms.map(m => `<div class="m ${m.senderId === u.id ? 'me' : ''}"><small>${esc(m.senderName)}, ${m.senderRole}</small><br>${esc(m.text)}</div>`).join('')
        || `<p class="mut">${selected ? `No messages yet. Say hello to ${esc(selected.name)}.` : 'Select a contact to start a conversation.'}</p>`}</div>
      <form class="send" data-f="msg"><input name="t" placeholder="Message ${selected ? esc(selected.name) : 'a contact'}" required autocomplete="off" ${selected ? '' : 'disabled'}><button class="btn" ${selected ? '' : 'disabled'}>Send</button></form></div></div>`;
  }
};
 
const resHtml = r => `<div>${badge(r.cls)}<div class="meter" style="max-width:320px"><i style="width:${r.conf}%;background:var(--${r.cls})"></i></div><p>Confidence about ${r.conf}%. ${{ A: 'High quality.', B: 'Neither good nor bad.', C: 'Bad but can be cooked.' }[r.cls]}</p>
  ${Object.entries(r.cues).map(([k, v]) => `<div class="row"><span>${k}</span><i class="bar ${r.cls}" style="width:${v}%"></i><b>${v}</b></div>`).join('')}
  <p class="mut">Open Unclassified and press Classified to send this result to the Checker.</p></div>`;
 
/* DEMO ONLY: colour/texture heuristic so the screen works without a model.
   Replace with your trained model (e.g. TensorFlow.js or Teachable Machine) that
   returns { cls:'A'|'B'|'C', conf, cues:{Eyes,Skin,Scales,Color} }, or null if no fish. */
function predict(c) {
  predict.reason = '';
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, values = [];
  let green = 0, saturated = 0;
  for (let i = 0; i < d.length; i += 16) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    values.push(max); saturated += max - min; if (g > r * 1.18 && g > b * 1.18) green++;
  }
  const average = sum(values, value => value) / values.length;
  const contrast = Math.sqrt(sum(values, value => (value - average) ** 2) / values.length);
  const saturation = saturated / values.length;
  const greenRatio = green / values.length;
  if (average < .12) { predict.reason = 'Image is too dark. Use a clear, well-lit fish image.'; return null; }
  if (average > .92) { predict.reason = 'Image is overexposed. Reduce glare and try again.'; return null; }
  if (contrast < .08) { predict.reason = 'Image is too blurry or uniform. Use a sharper image.'; return null; }
  if (saturation < .08) { predict.reason = 'Fish details are not clear enough. Move closer or improve lighting.'; return null; }
  if (greenRatio > .48) { predict.reason = 'No fish confidently detected. Avoid grass, water, or non-fish backgrounds.'; return null; }
  const pct = value => Math.round(Math.max(0, Math.min(1, value)) * 100);
  const cues = {
    Eyes: pct(contrast * 3.2),
    Skin: pct(1 - Math.abs(average - .52) * 1.5),
    Scales: pct(saturation * 1.7),
    Color: pct(1 - greenRatio)
  };
  const score = (cues.Eyes * .3 + cues.Skin * .25 + cues.Scales * .25 + cues.Color * .2) / 100;
  const cls = score >= .78 ? 'A' : score >= .52 ? 'B' : 'C';
  return { cls, conf: Math.round(58 + Math.abs(score - .5) * 55), cues };
}
 
/* ---------- form submits ---------- */
const F = {
  async classifierRecord(f) {
    const response = await fetch('/api/classifier-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productName: f.get('productName'), boxSize: f.get('boxSize'),
        quantity: f.get('quantity'), fishClass: f.get('fishClass')
      })
    });
    const result = await response.json();
    if (!response.ok) { toast(result.message || 'Could not save record.'); return false; }
    db.set('classifierRecords', [result, ...db.get('classifierRecords', [])]);
  },
  async employee(f) {
    const nm = s => s.trim().replace(/(^|\s)\S/g, m => m.toUpperCase());
    const response = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first: nm(f.get('first')), last: nm(f.get('last')), contact: f.get('contact'),
        email: f.get('email'), role: f.get('role'), password: f.get('pw')
      })
    });
    const result = await response.json();
    if (!response.ok) { toast(result.message || 'Could not create employee.'); return false; }
    db.set('users', [...users(), result]);
  },
  async supply(f) {
    const response = await fetch('/api/buy-supply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size: f.get('size'), units: f.get('units'), price: f.get('price') })
    });
    const result = await response.json();
    if (!response.ok) { toast(result.message || 'Could not save buyer supply.'); return false; }
    db.set('supplies', [result, ...db.get('supplies', [])]);
  },
  async expense(f) {
    const response = await fetch('/api/ops-exp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cat: f.get('cat'), amount: f.get('amount'), purpose: f.get('purpose') })
    });
    const result = await response.json();
    if (!response.ok) { toast(result.message || 'Could not save operational expense.'); return false; }
    db.set('expenses', [result, ...db.get('expenses', [])]);
  },
  async sale(f) {
    const response = await fetch('/api/sale-rec', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: f.get('name'), cls: f.get('cls'), qty: f.get('qty'), price: f.get('price') })
    });
    const result = await response.json();
    if (!response.ok) { toast(result.message || 'Could not save sales record.'); return false; }
    db.set('sales', [result, ...db.get('sales', [])]);
  },
  async loss(f) {
    const response = await fetch('/api/los-rec', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: f.get('name'), qty: f.get('qty'), cost: f.get('cost'), reason: f.get('reason') })
    });
    const result = await response.json();
    if (!response.ok) { toast(result.message || 'Could not save loss record.'); return false; }
    db.set('losses', [result, ...db.get('losses', [])]);
  },
  async recordSale(f) {
    const record = db.get('submittedClassifierRecords', []).find(r => r.id === f.get('recordId'));
    if (!record) { toast('Submitted record is no longer available.'); return false; }
    const response = await fetch('/api/sale-rec', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: record.productName, cls: record.fishClass, qty: record.quantity, price: f.get('price') })
    });
    if (!response.ok) { toast('Could not save the submitted record as a sale.'); return false; }
    const sale = await response.json();
    db.set('sales', [sale, ...db.get('sales', [])]);
    return processClassifierRecord(record.id);
  },
  async recordLoss(f) {
    const record = db.get('submittedClassifierRecords', []).find(r => r.id === f.get('recordId'));
    if (!record) { toast('Submitted record is no longer available.'); return false; }
    const response = await fetch('/api/los-rec', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: record.productName, qty: record.quantity, cost: f.get('cost'), reason: f.get('reason') })
    });
    if (!response.ok) { toast('Could not save the submitted record as a loss.'); return false; }
    const loss = await response.json();
    db.set('losses', [loss, ...db.get('losses', [])]);
    return processClassifierRecord(record.id);
  },
  async msg(f) {
    const u = cur();
    if (!peer) { toast('Select a contact first.'); return false; }
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId: u.id, recipientId: peer, text: f.get('t').trim() })
    });
    const result = await response.json();
    if (!response.ok) { toast(result.message || 'Could not send message.'); return false; }
    const key = [u.id, peer].sort().join('|');
    db.set('msgs', [...db.get('msgs', []).filter(message => message.k !== key), { ...result, k: key }]);
    await loadChatMessages();
  }
};
async function processClassifierRecord(id) {
  const response = await fetch(`/api/classifier-records/${encodeURIComponent(id)}/process`, { method: 'POST' });
  if (!response.ok) { toast('Could not mark classifier record as processed.'); return false; }
  db.set('submittedClassifierRecords', db.get('submittedClassifierRecords', []).filter(r => r.id !== id));
  return true;
}
$('#main').onsubmit = async e => {
  e.preventDefault();
  const ok = await F[e.target.dataset.f](new FormData(e.target));
  if (ok !== false) { render(); if (e.target.dataset.f !== 'msg') toast('Saved.'); }
};
 
/* ---------- button actions ---------- */
const A = {
  peer(i) { peer = i; render(); loadChatMessages(); },
  refreshChat() { loadChatContacts(); },
  deleteRecord(i) {
    const d = $('#dlg');
    d.returnValue = '';
    $('#dlgq').textContent = 'Delete this classifier record?';
    d.showModal();
    d.onclose = async () => {
      if (d.returnValue !== 'yes') return;
      const response = await fetch(`/api/classifier-records/${encodeURIComponent(i)}`, { method: 'DELETE' });
      if (!response.ok) return toast('Could not delete classifier record.');
      db.set('classifierRecords', db.get('classifierRecords', []).filter(r => r.id !== i));
      toast('Classifier record deleted.');
      render();
    };
  },
  async submitRecord(i) {
    const response = await fetch(`/api/classifier-records/${encodeURIComponent(i)}/submit`, { method: 'POST' });
    const result = await response.json();
    if (!response.ok) return toast(result.message || 'Could not submit record.');
    db.set('classifierRecords', db.get('classifierRecords', []).map(r => r.id === i ? { ...r, status: 'Submitted' } : r));
    toast('Record sent to the Checker.');
    render();
  },
  async del(i, b) {
    const k = b.dataset.k;
    if (k === 'users' && i === cur().id) return toast("You can't delete your own account.");
    const d = $('#dlg'); d.returnValue = ''; d.showModal();
    d.onclose = async () => {
      if (d.returnValue !== 'yes') return;
      if (k === 'users') {
        const response = await fetch(`/api/employees/${encodeURIComponent(i)}`, { method: 'DELETE' });
        if (!response.ok) return toast('Could not delete employee from MySQL.');
        db.set(k, db.get(k, []).filter(x => x.id !== i));
      } else if (k === 'supplies') {
        const response = await fetch(`/api/buy-supply/${encodeURIComponent(i)}`, { method: 'DELETE' });
        if (!response.ok) return toast('Could not delete buyer supply from MySQL.');
        db.set(k, db.get(k, []).filter(x => x.id !== i));
      } else if (k === 'expenses' || k === 'sales' || k === 'losses') {
        const endpoint = { expenses: 'ops-exp', sales: 'sale-rec', losses: 'los-rec' }[k];
        const response = await fetch(`/api/${endpoint}/${encodeURIComponent(i)}`, { method: 'DELETE' });
        if (!response.ok) return toast('Could not delete Checker record from MySQL.');
        db.set(k, db.get(k, []).filter(x => x.id !== i));
      } else {
        db.set(k, db.get(k, []).filter(x => x.id !== i));
      }
      render(); toast('Deleted.');
    };
  },
  print(i) { $('#' + i).classList.add('pt'); document.body.classList.add('pp'); window.print(); },
  up() { $('#file').click(); },
  async cam() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = $('#vid'); v.srcObject = stream; $('#vfv').hidden = false;
    } catch { toast('Camera not available. Upload an image instead.'); }
  },
  snap() {
    if (!stream) return toast('Start the camera first.');
    $('#cv').getContext('2d').drawImage($('#vid'), 0, 0, 320, 240); has = true;
  },
  async analyze() {
    if (!has) return toast('Add a fish photo or capture a camera frame first.');
    const r = predict($('#cv'));
    if (r) {
      try {
        const response = await fetch('/api/ai-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(r)
        });
        if (!response.ok) throw new Error('AI result save failed');
        db.set('ai', await response.json());
      } catch (error) {
        console.error(error);
        return toast('Could not save AI quality to MySQL.');
      }
    } else {
      db.set('ai', null);
    }
    $('#res').innerHTML = ''; $('#vf').classList.add('scan');
    setTimeout(() => { const v = $('#vf'); if (!v) return; v.classList.remove('scan');
      $('#res').innerHTML = r ? resHtml(r) : `<p class="warn">${predict.reason || 'No fish detected. Show a real fish, live or in a photo.'}</p>`; }, 1000);
  },
  classify(i) {
    const r = db.get('ai', null);
    if (!r) return toast('Run the AI checker on this batch first.');
    const S = db.get('supplies', []), s = S.find(x => x.id === i);
    s.status = 'Classified'; s.cls = r.cls; db.set('supplies', S); db.set('ai', null);
    toast(`Sent to the Checker as Class ${r.cls}.`); render();
  }
};
 
/* ---------- global events ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  let b;
  if ((b = t.closest('[data-a]'))) return A[b.dataset.a](b.dataset.i, b);
  if ((b = t.closest('[data-v]'))) return go(b.dataset.v);
  if ((b = t.closest('[data-go]'))) return showAuth(b.dataset.go);
  if ((b = t.closest('.eye'))) {
    const i = b.parentElement.querySelector('input'), show = i.type === 'password';
    i.type = show ? 'text' : 'password'; b.textContent = show ? '🙈' : '👁'; return;
  }
  if ((b = t.closest('[data-gen]'))) {
    const f = b.closest('form'), p = genPw(b.dataset.gen);
    f.querySelectorAll('[data-pw]').forEach(i => { i.value = p; i.type = 'text'; });
    f.querySelectorAll('.eye').forEach(x => x.textContent = '🙈');
  }
});
document.addEventListener('input', e => {
  const t = e.target;
  if ('cap' in t.dataset) t.value = t.value.replace(/^\s+/, '').replace(/(^|\s)\S/g, m => m.toUpperCase());
  if (t.name === 'contact') t.value = t.value.replace(/\D/g, '').slice(0, 11);
});
$('#main').onchange = e => {
  if (e.target.id !== 'file' || !e.target.files[0]) return;
  const img = new Image();
  img.onload = () => { $('#cv').getContext('2d').drawImage(img, 0, 0, 320, 240); has = true; URL.revokeObjectURL(img.src); };
  img.src = URL.createObjectURL(e.target.files[0]);
};
window.onafterprint = () => {
  document.body.classList.remove('pp');
  document.querySelectorAll('.pt').forEach(x => x.classList.remove('pt'));
};
/* live updates when another browser tab changes the data */
addEventListener('storage', () => {
  if (!cur() || !['chat', 'decision'].includes(view)) return;
  const t = $('[name=t]'), v = t && t.value; render(); if (v) $('[name=t]').value = v;
});
 
/* ---------- UI extras ---------- */
function countUp() {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  document.querySelectorAll('.stat b').forEach(el => {
    const to = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0, t0 = performance.now();
    const tick = t => { const p = Math.min(1, (t - t0) / 700); el.textContent = peso(to * (1 - (1 - p) ** 3)); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
const strength = p => {
  const n = (p.length >= 6) + (p.length >= 10) + (/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)) + /[^\w]/.test(p);
  return [n / 4 * 100, ['#c2412c', '#c2412c', '#c98a0a', '#1f9d68', '#1f9d68'][n]];
};
document.addEventListener('input', e => {
  const t = e.target, m = t.matches && t.matches('[data-pw][name=pw]') && t.closest('form').querySelector('.meter i');
  if (m) { const [w, c] = strength(t.value); m.style.width = w + '%'; m.style.background = c; }
});
document.addEventListener('click', e => {
  let b;
  if ((b = e.target.closest('[data-demo]'))) {
    const f = $('#login'); f.id.value = b.dataset.demo; f.pw.value = 'Fish@1234'; f.pw.focus();
  }
  if ((b = e.target.closest('[data-gen]'))) b.closest('form').querySelector('[name=pw]').dispatchEvent(new Event('input', { bubbles: true }));
});
const root = document.documentElement;
root.dataset.theme = db.get('theme', matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
const clock = $('#clock');
const updateClock = () => {
  clock.textContent = new Intl.DateTimeFormat('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(new Date()).replace(/\//g, '-');
};
updateClock();
setInterval(updateClock, 1000);
$('#theme').onclick = () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; db.set('theme', root.dataset.theme); };
$('#collapse').onclick = () => { const a = $('#app'); a.classList.toggle('min'); db.set('min', a.classList.contains('min')); };
if (db.get('min', false)) $('#app').classList.add('min');
 
start();
 