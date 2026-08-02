 // ==========================================
// CONEXIUNE SUPABASE CLOUD
// ==========================================
const SUPABASE_URL = 'https://edvtwbhccnbxdoavgqak.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qC9HEPkNLcd8JqbRyv0msg_IOGlDs8L';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const VAT_RATE = 0.21;
const GROSS_RATES = [190, 290, 310];
const RATES = GROSS_RATES.map(r => Math.round((r / (1 + VAT_RATE)) * 100) / 100);
const DAILY_TARGET = 1500;
const BONUS_RATE = 0.31;
const THEME_KEY = 'revizio_theme';

let db = { users: {} };
let activeUser = null;
let pinInput = "";
let isCreatingProfile = false;
let setupStep = 1;
let tempName = "";
let justAddedRate = null;
let currentTheme = localStorage.getItem(THEME_KEY) || 'dark';

document.body.setAttribute('data-theme', currentTheme);

// Încărcare inițială din Supabase
async function loadDB() {
  try {
    const { data, error } = await supabaseClient
      .from('revizio_data')
      .select('payload')
      .eq('id', 1)
      .single();

    if (data && data.payload) {
      db = data.payload;
    } else {
      // Dacă tabelul e gol, inserăm structura de bază
      await supabaseClient.from('revizio_data').upsert({ id: 1, payload: { users: {} } });
    }
  } catch (e) {
    console.error("Erore la citirea din Supabase:", e);
  }
  render();
}

async function saveDB() {
  try {
    const { error } = await supabaseClient
      .from('revizio_data')
      .upsert({ id: 1, payload: db });

    if (error) console.error("Erore la salvarea în Supabase:", error);
  } catch (e) {
    console.error("Erore rețea:", e);
  }
}

// Sincronizare în timp real între telefoane (Realtime)
function setupRealtimeSync() {
  supabaseClient
    .channel('public:revizio_data')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'revizio_data' }, payload => {
      if (payload.new && payload.new.payload) {
        db = payload.new.payload;
        render(); // Reîmprospătează ecranul automat când un coleg modifică ceva
      }
    })
    .subscribe();
}

function setTheme(theme) {
  triggerHaptic();
  currentTheme = theme;
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  render();
}

function triggerHaptic() {
  if (navigator.vibrate) navigator.vibrate(20);
}

function createRipple(e) {
  const btn = e.currentTarget;
  const circle = document.createElement("span");
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const radius = diameter / 2;
  const rect = btn.getBoundingClientRect();

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - radius}px`;
  circle.style.top = `${e.clientY - rect.top - radius}px`;
  circle.classList.add("ripple-effect");

  const ripple = btn.getElementsByClassName("ripple-effect")[0];
  if (ripple) ripple.remove();

  btn.appendChild(circle);
}

function triggerScreenPulse() {
  const root = document.getElementById('root');
  root.classList.remove('pulse-active');
  void root.offsetWidth;
  root.classList.add('pulse-active');
}

function transitionView(callback) {
  const root = document.getElementById('root');
  root.classList.remove('fade-enter');
  root.classList.add('fade-exit');
  
  setTimeout(() => {
    callback();
    root.classList.remove('fade-exit');
    root.classList.add('fade-enter');
  }, 280);
}

function todayKey(d = new Date()) { return d.toISOString().slice(0, 10); }
function monthKey(d = new Date()) { return d.toISOString().slice(0, 7); }

function getCurrentWeekDays() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);
  
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDays.push(d.toISOString().slice(0, 10));
  }
  return weekDays;
}

function fmtRON(n) {
  return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' lei';
}

function grossOf(netRate) {
  const idx = RATES.indexOf(netRate);
  return idx > -1 ? GROSS_RATES[idx] : Math.round(netRate * (1 + VAT_RATE));
}

function handleKeypress(num) {
  triggerHaptic();
  if (pinInput.length < 4) {
    pinInput += num;
    render();
    if (pinInput.length === 4) {
      setTimeout(processPin, 100);
    }
  }
}

function clearPin() {
  triggerHaptic();
  pinInput = "";
  render();
}

function processPin() {
  if (isCreatingProfile && setupStep === 2) {
    db.users[tempName] = { pin: pinInput, days: {}, shifts: {} };
    saveDB();
    const newUser = tempName;
    isCreatingProfile = false;
    setupStep = 1;
    tempName = "";
    pinInput = "";
    transitionView(() => {
      activeUser = newUser;
      render();
    });
  } else {
    const matchedUser = Object.keys(db.users).find(u => db.users[u].pin === pinInput);
    if (matchedUser) {
      pinInput = "";
      transitionView(() => {
        activeUser = matchedUser;
        render();
      });
    } else {
      triggerHaptic();
      alert("PIN incorect!");
      pinInput = "";
      render();
    }
  }
}

function logout() {
  triggerHaptic();
  transitionView(() => {
    activeUser = null;
    pinInput = "";
    isCreatingProfile = false;
    render();
  });
}

function startNewProfileFlow() {
  const name = prompt("Numele noului operator:");
  if (name && name.trim() !== "") {
    tempName = name.trim();
    isCreatingProfile = true;
    setupStep = 2;
    pinInput = "";
    render();
  }
}

function startShift(e) {
  if(e) createRipple(e);
  triggerHaptic();
  triggerScreenPulse();
  const uData = db.users[activeUser];
  if (!uData.shifts) uData.shifts = {};
  const tKey = todayKey();
  
  uData.shifts[tKey] = {
    start: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
    end: null,
    active: true
  };
  saveDB();
  render();
}

function stopShift(e) {
  if (confirm("Ești sigur că vrei să închei tura de astăzi?")) {
    if(e) createRipple(e);
    triggerHaptic();
    triggerScreenPulse();
    const uData = db.users[activeUser];
    const tKey = todayKey();
    if (uData.shifts && uData.shifts[tKey]) {
      uData.shifts[tKey].end = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
      uData.shifts[tKey].active = false;
      saveDB();
      render();
    }
  }
}

function addEntry(rate, e) {
  if(e) createRipple(e);
  triggerHaptic();
  triggerScreenPulse();
  const uData = db.users[activeUser];
  const tKey = todayKey();
  if (!uData.days[tKey]) uData.days[tKey] = [];
  
  uData.days[tKey].push(rate);
  saveDB();

  justAddedRate = rate;
  render();
  setTimeout(() => { justAddedRate = null; render(); }, 300);
}

function undoLastEntry(e) {
  if(e) createRipple(e);
  triggerHaptic();
  triggerScreenPulse();
  const uData = db.users[activeUser];
  const tKey = todayKey();
  if (uData.days[tKey] && uData.days[tKey].length > 0) {
    uData.days[tKey].pop();
    saveDB();
    render();
  }
}

function exportCSV(e) {
  if(e) createRipple(e);
  triggerHaptic();
  const uData = db.users[activeUser];
  let csv = 'Data,Start Tura,Stop Tura,Tarif Brut (RON),Tarif Net (RON)\n';
  Object.keys(uData.days).sort().forEach(date => {
    const shift = (uData.shifts && uData.shifts[date]) ? uData.shifts[date] : { start: '-', end: '-' };
    uData.days[date].forEach(r => {
      csv += `"${date}","${shift.start || '-'}","${shift.end || '-'} font",${grossOf(r)},${r}\n`;
    });
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Revizio_${activeUser}_${monthKey()}.csv`;
  a.click();
}

function renderThemeToggle() {
  return `
    <div class="theme-toggle">
      <button class="theme-btn ${currentTheme === 'light' ? 'active' : ''}" onclick="setTheme('light')">☀️ Light</button>
      <button class="theme-btn ${currentTheme === 'dark' ? 'active' : ''}" onclick="setTheme('dark')">🌙 Dark</button>
    </div>
  `;
}

function renderKeypad() {
  return `
    <div class="pin-container">
      <div class="pin-dots">
        ${[0,1,2,3].map(i => `<div class="pin-dot ${i < pinInput.length ? 'active' : ''}"></div>`).join('')}
      </div>
      <div class="keypad">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="keypad-btn ios-btn" onclick="handleKeypress('${n}')">${n}</button>`).join('')}
        <button class="keypad-btn action-btn ios-btn" style="color:var(--danger)" onclick="clearPin()">Șterge</button>
        <button class="keypad-btn ios-btn" onclick="handleKeypress('0')">0</button>
        <button class="keypad-btn action-btn" style="opacity:0" disabled></button>
      </div>
    </div>
  `;
}

function renderLeaderboard() {
  const weekDays = getCurrentWeekDays();
  const rankings = [];

  Object.keys(db.users).forEach(userName => {
    const u = db.users[userName];
    let totalWeekNet = 0;
    if (u.days) {
      weekDays.forEach(day => {
        if (u.days[day]) {
          totalWeekNet += u.days[day].reduce((a, b) => a + b, 0);
        }
      });
    }
    rankings.push({ name: userName, total: totalWeekNet });
  });

  rankings.sort((a, b) => b.total - a.total);
  const top5 = rankings.slice(0, 5);

  return `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 12px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.5px;">🏆 Top 5 Săptămânal (Cloud)</span>
        <span style="font-size: 11px; color: var(--ink-faint);">Live Sync</span>
      </div>
      <div>
        ${top5.map((item, index) => {
          const isRank1 = index === 0;
          const isMe = item.name === activeUser;
          return `
            <div class="leader-item ${isRank1 ? 'rank-1' : ''} ${isMe ? 'is-me' : ''}">
              <div style="display: flex; align-items: center;">
                <div class="rank-badge">${isRank1 ? '👑' : index + 1}</div>
                <div style="font-size: 14px; font-weight: ${isMe ? '700' : '500'}; color: var(--ink);">
                  ${item.name} ${isMe ? '<span style="font-size: 11px; color: var(--accent);">(Tu)</span>' : ''}
                </div>
              </div>
              <div style="font-size: 14px; font-weight: 700; color: ${isRank1 ? '#ffd700' : 'var(--ink)'}">
                ${fmtRON(item.total)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function render() {
  const root = document.getElementById('root');
  const userCount = Object.keys(db.users).length;

  if (userCount === 0 && !activeUser && !isCreatingProfile) {
    isCreatingProfile = true;
    setupStep = 1;
  }

  if (isCreatingProfile && setupStep === 1) {
    root.innerHTML = `
      <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">${renderThemeToggle()}</div>
      <div style="padding-top: 20px; text-align: center;">
        <div style="font-size: 32px; font-weight: 800; color: var(--ink); margin-bottom: 6px; letter-spacing: -0.5px;">REVIZIO</div>
        <p style="color: var(--ink-soft); font-size: 15px; margin-bottom: 32px;">Configurare profil nou</p>
        <div class="card">
          <input type="text" id="nameInput" class="input-field" placeholder="Numele tău (ex: Marius)" />
          <button class="btn-main ios-btn" onclick="
            const val = document.getElementById('nameInput').value.trim();
            if(val) { tempName = val; setupStep = 2; render(); }
            else { alert('Introdu un nume valid'); }
          ">Pasul Următor</button>
        </div>
      </div>
    `;
    return;
  }

  if (isCreatingProfile && setupStep === 2) {
    root.innerHTML = `
      <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">${renderThemeToggle()}</div>
      <div style="padding-top: 10px; text-align: center; display:flex; flex-direction:column; flex:1;">
        <div style="font-size: 24px; font-weight: 700; color: var(--ink); margin-bottom: 6px; letter-spacing: -0.3px;">Setează un PIN (4 cifre)</div>
        <p style="color: var(--ink-soft); font-size: 15px;">Profil: <b style="color:var(--ink);">${tempName}</b></p>
        ${renderKeypad()}
      </div>
    `;
    return;
  }

  if (!activeUser) {
    root.innerHTML = `
      <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">${renderThemeToggle()}</div>
      <div style="padding-top: 20px; text-align: center; display:flex; flex-direction:column; flex:1;">
        <div style="font-size: 34px; font-weight: 800; color: var(--ink); margin-bottom: 6px; letter-spacing: -0.5px;">REVIZIO</div>
        <p style="color: var(--ink-soft); font-size: 15px; margin-bottom: 10px;">Introdu codul PIN</p>
        
        ${renderKeypad()}

        <div style="margin-top: 14px; margin-bottom: 10px;">
          <button class="ios-btn" onclick="startNewProfileFlow()" style="background:none; border:none; color:var(--accent); font-size:15px; font-weight:600; cursor:pointer;">
            + Adaugă alt profil
          </button>
        </div>
      </div>
    `;
    return;
  }

  const uData = db.users[activeUser] || { days: {}, shifts: {} };
  const tKey = todayKey();
  const mKey = monthKey();

  if (!uData.shifts) uData.shifts = {};
  const currentShift = uData.shifts[tKey] || { active: false, start: null, end: null };

  const todayEntries = uData.days[tKey] || [];
  const todaySum = todayEntries.reduce((a, b) => a + b, 0);
  const todayProgress = Math.min(100, (todaySum / DAILY_TARGET) * 100);
  const todayOverage = Math.max(0, todaySum - DAILY_TARGET);
  const todayBonus = todayOverage * BONUS_RATE;

  let monthSum = 0;
  let monthCount = 0;
  Object.keys(uData.days).filter(k => k.startsWith(mKey)).forEach(k => {
    (uData.days[k] || []).forEach(r => {
      monthSum += r;
      monthCount++;
    });
  });

  root.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <div>
        <div style="font-size: 22px; font-weight: 800; color: var(--ink); letter-spacing: -0.5px;">REVIZIO</div>
        <div style="font-size: 13px; color: var(--ink-soft);">Operator: <b style="color:var(--ink);">${activeUser}</b></div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        ${renderThemeToggle()}
        <button class="ios-btn" onclick="logout()" style="background: var(--glass-bg); backdrop-filter: blur(15px); border: 1px solid var(--glass-border); color: var(--warn); border-radius: 12px; padding: 8px 12px; font-size: 12px; font-weight: 600; cursor:pointer;">
          Ieșire
        </button>
      </div>
    </div>

    <div class="card" style="text-align: center;">
      ${!currentShift.start && !currentShift.active ? `
        <div style="font-size: 14px; color: var(--ink-soft); margin-bottom: 14px;">Tura ta nu a început încă pentru astăzi.</div>
        <button class="btn-good ios-btn" onclick="startShift(event)">▶️ ÎNCEPE TURA</button>
      ` : currentShift.active ? `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 13px; color: var(--good); font-weight: 700; display:flex; align-items:center; gap:6px;">
            <span style="width:8px; height:8px; border-radius:50%; background:var(--good); display:inline-block; box-shadow:0 0 8px var(--good);"></span> TURĂ ACTIVĂ
          </span>
          <span style="font-size: 13px; color: var(--ink-soft);">Start la ora: <b style="color:var(--ink);">${currentShift.start}</b></span>
        </div>
        <button class="btn-danger ios-btn" onclick="stopShift(event)">⏹️ ÎNCHEIE TURA DE AZI</button>
      ` : `
        <div style="font-size: 14px; color: var(--warn); font-weight: 600;">TURĂ ÎNCHEIATĂ PE AZI (${currentShift.start} - ${currentShift.end})</div>
        <div style="font-size: 12px; color: var(--ink-faint); margin-top: 4px;">Tura se va reseta automat mâine dimineață.</div>
      `}
    </div>

    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
        <span style="font-size: 12px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.5px;">Astăzi</span>
        <span style="font-size: 12px; color: var(--ink-faint);">țintă ${fmtRON(DAILY_TARGET)}</span>
      </div>
      <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: -1px; color: var(--ink);">${fmtRON(todaySum).replace(' lei','')}</span>
        <span style="font-size: 15px; color: var(--ink-soft);">lei net</span>
      </div>
      <div class="progress-bg" style="margin-bottom: 12px;">
        <div class="progress-bar" style="width: ${todayProgress}%; background: ${todayProgress >= 100 ? 'linear-gradient(90deg, #30d158, #34c759)' : 'linear-gradient(90deg, var(--accent), #5e5ce6)'};"></div>
      </div>
      ${todayOverage > 0 ? `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--good-bg); border: 1px solid rgba(48, 209, 88, 0.3); border-radius: 12px; padding: 10px 14px;">
          <span style="font-size: 13px; color: var(--good); font-weight: 600;">Bonus azi (+31%)</span>
          <span style="font-size: 15px; font-weight: 700; color: var(--good);">+${fmtRON(todayBonus)}</span>
        </div>
      ` : `
        <div style="font-size: 13px; color: var(--ink-soft);">Rămas de realizat: <b style="color:var(--ink);">${fmtRON(Math.max(0, DAILY_TARGET - todaySum))}</b></div>
      `}
    </div>

    <div class="btn-grid">
      ${RATES.map((rate, i) => `
        <button onclick="addEntry(${rate}, event)" ${!currentShift.active ? 'disabled' : ''} class="btn-rate ios-btn ${justAddedRate === rate ? 'just-added' : ''}">
          <span style="font-size: 24px; font-weight: 800; letter-spacing:-0.5px;">${GROSS_RATES[i]}</span>
          <span style="font-size: 11px; opacity: 0.7;">lei cu TVA</span>
          <span style="font-size: 11px; color: var(--accent); margin-top: 2px; font-weight:600;">${rate.toFixed(1)} net</span>
        </button>
      `).join('')}
    </div>

    ${todayEntries.length > 0 && currentShift.active ? `
      <button class="ios-btn" onclick="undoLastEntry(event)" style="width: 100%; font-size: 13px; font-weight: 600; color: var(--warn); background: var(--warn-bg); border: 1px solid rgba(255, 159, 10, 0.3); border-radius: 14px; padding: 12px; margin-bottom: 16px; cursor:pointer;">
        Anulează ultima adăugare (${grossOf(todayEntries[todayEntries.length - 1])} lei)
      </button>
    ` : ''}

    ${renderLeaderboard()}

    <div class="card">
      <div style="font-size: 12px; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Luna Curentă (${mKey})</div>
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="font-size: 24px; font-weight: 800; color: var(--good); letter-spacing:-0.5px;">${fmtRON(monthSum)}</span>
        <span style="font-size: 13px; color: var(--ink-soft);">${monthCount} verificări</span>
      </div>
    </div>

    <button class="ios-btn" onclick="exportCSV(event)" style="width: 100%; background: var(--glass-bg); backdrop-filter: blur(15px); border: 1px solid var(--glass-border); color: var(--ink); border-radius: 16px; padding: 14px; font-size: 13px; font-weight: 600; cursor:pointer;">
      📥 Export Excel / CSV
    </button>
  `;
}

// Pornirea aplicației și activarea ascultării live
loadDB();
setupRealtimeSync();
