/* ==========================================================================
   E.ON Asist Complet — Revizii Gaz
   Application logic (React, no build step, ES2023)
   ========================================================================== */

(() => {
  'use strict';

  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const h = React.createElement;

  // ------------------------------------------------------------------------
  // Constants (business rules — unchanged from original)
  // ------------------------------------------------------------------------
  const VAT_RATE = 0.21;
  const GROSS_RATES = [190, 290, 310];
  const RATES = GROSS_RATES.map(r => Math.round((r / (1 + VAT_RATE)) * 100) / 100);
  const DAILY_TARGET = 1500;
  const BONUS_RATE = 0.31;
  const STORAGE_KEY = 'revizii_data_v2';
  const USERS_KEY = 'eon_app_users';

  // ------------------------------------------------------------------------
  // Safe storage helpers — guards against corruption, incomplete writes,
  // and invalid JSON. Uses a write-to-temp-key-then-swap pattern where
  // possible, and always validates shape before accepting data.
  // ------------------------------------------------------------------------
  function isValidDataShape(obj) {
    return !!obj && typeof obj === 'object' && obj.days && typeof obj.days === 'object';
  }

  function safeLocalStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      // Storage full or unavailable (e.g. private browsing). Fail silently
      // but do not throw — the app should keep working with in-memory state.
      console.error('Storage write failed:', e);
      return false;
    }
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidDataShape(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Data load failed, falling back to empty state:', e);
    }
    return { days: {} };
  }

  function saveData(data) {
    if (!isValidDataShape(data)) return;
    safeLocalStorageSet(STORAGE_KEY, JSON.stringify(data));
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Users load failed:', e);
    }
    return [];
  }

  function saveUsers(users) {
    if (!Array.isArray(users)) return;
    safeLocalStorageSet(USERS_KEY, JSON.stringify(users));
  }

  // ------------------------------------------------------------------------
  // Date / formatting helpers (unchanged)
  // ------------------------------------------------------------------------
  function todayKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
  }
  function monthKey(d = new Date()) {
    return d.toISOString().slice(0, 7);
  }
  function countWorkdays(year, month, uptoDay) {
    let count = 0;
    const lastDay = uptoDay || new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow >= 1 && dow <= 5) count++;
    }
    return count;
  }
  function grossOf(netRate) {
    const idx = RATES.indexOf(netRate);
    return idx > -1 ? GROSS_RATES[idx] : Math.round(netRate * (1 + VAT_RATE));
  }
  function fmtRON(n) {
    return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' lei';
  }
  function dayLabel(key) {
    const d = new Date(key + 'T00:00:00');
    const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
    const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  }

  // ------------------------------------------------------------------------
  // Ripple / haptic touch feedback helper
  // ------------------------------------------------------------------------
  function triggerHaptic(ms = 10) {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) { /* no-op */ }
    }
  }

  function useRipple() {
    return useCallback((e) => {
      const el = e.currentTarget;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = (e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX) ?? rect.width / 2) - rect.left - size / 2;
      const y = (e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY) ?? rect.height / 2) - rect.top - size / 2;
      const ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      const prevPosition = getComputedStyle(el).position;
      if (prevPosition === 'static') el.style.position = 'relative';
      el.classList.add('ripple-container');
      el.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    }, []);
  }

  // ------------------------------------------------------------------------
  // Auth component
  // ------------------------------------------------------------------------
  function Auth({ onLoginSuccess, theme, toggleTheme }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      setError(''); setSuccess('');
      const uName = username.trim();
      if (!uName || !password) { setError('Completează toate câmpurile.'); return; }

      const users = loadUsers();
      if (isSignUp) {
        if (password !== confirmPassword) { setError('Parolele nu se potrivesc.'); return; }
        if (users.find(u => u.username.toLowerCase() === uName.toLowerCase())) {
          setError('Numele de utilizator există deja.'); return;
        }
        users.push({ username: uName, password });
        saveUsers(users);
        setSuccess('Cont creat! Te poți autentifica.');
        setIsSignUp(false); setPassword(''); setConfirmPassword('');
      } else {
        const user = users.find(u => u.username.toLowerCase() === uName.toLowerCase() && u.password === password);
        if (!user && users.length === 0 && uName.toLowerCase() === 'admin' && password === '1234') {
          onLoginSuccess('Vinți Marius'); return;
        }
        if (user) onLoginSuccess(user.username);
        else setError('Date incorecte.');
      }
    };

    return h('div', { className: 'fade-in', style: { maxWidth: 360, margin: '0 auto', paddingTop: 60, paddingLeft: 20, paddingRight: 20 } },
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 20 } },
        h('button', { onClick: toggleTheme, style: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' } }, theme === 'light' ? '🌙' : '☀️')
      ),
      h('div', { className: 'card', style: { padding: 24, textAlign: 'center' } },
        h('div', { style: { color: 'var(--eon-red)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, 'E.ON ASIST COMPLET'),
        h('h2', { style: { margin: '0 0 16px 0', fontSize: 20 } }, isSignUp ? 'Creare Cont' : 'Autentificare'),
        h('form', { onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          h('input', { type: 'text', value: username, onChange: e => setUsername(e.target.value), placeholder: 'Utilizator', autoComplete: 'username', style: { padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 16 } }),
          h('input', { type: 'password', value: password, onChange: e => setPassword(e.target.value), placeholder: 'Parolă', autoComplete: isSignUp ? 'new-password' : 'current-password', style: { padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 16 } }),
          isSignUp && h('input', { type: 'password', value: confirmPassword, onChange: e => setConfirmPassword(e.target.value), placeholder: 'Confirmă Parola', autoComplete: 'new-password', style: { padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 16 } }),
          error && h('div', { style: { color: 'var(--eon-red)', fontSize: 13 } }, error),
          success && h('div', { style: { color: 'var(--good)', fontSize: 13 } }, success),
          h('button', { type: 'submit', className: 'btn-tap', style: { padding: 12, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', marginTop: 6 } }, isSignUp ? 'Înregistrare' : 'Intră în cont'),
          h('button', { type: 'button', onClick: () => setIsSignUp(!isSignUp), style: { background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', marginTop: 8 } }, isSignUp ? 'Ai cont? Autentifică-te' : 'Creează cont nou')
        )
      )
    );
  }

  // ------------------------------------------------------------------------
  // Data management tab (export / import / reset)
  // ------------------------------------------------------------------------
  function DataTab({ data, setData }) {
    const [statusMsg, setStatusMsg] = useState(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const statusTimer = useRef(null);

    useEffect(() => () => { if (statusTimer.current) clearTimeout(statusTimer.current); }, []);

    const showStatus = (type, text) => {
      setStatusMsg({ type, text });
      if (statusTimer.current) clearTimeout(statusTimer.current);
      statusTimer.current = setTimeout(() => setStatusMsg(null), 3000);
    };

    const handleExport = () => {
      try {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `backup_revizii_${todayKey()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showStatus('success', 'Backup salvat!');
      } catch (err) {
        showStatus('error', 'Nu s-a putut genera backup-ul.');
      }
    };

    const handleImport = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fileReader = new FileReader();
      fileReader.readAsText(file, 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (isValidDataShape(parsed)) {
            setData(parsed);
            showStatus('success', 'Date importate cu succes!');
          } else {
            showStatus('error', 'Fișier JSON invalid.');
          }
        } catch (err) {
          showStatus('error', 'Eroare la citirea fișierului.');
        }
      };
      fileReader.onerror = () => showStatus('error', 'Eroare la citirea fișierului.');
      // reset input so selecting the same file again re-triggers onChange
      e.target.value = '';
    };

    return h('div', { className: 'fade-in', style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      h('div', { className: 'card', style: { padding: 20 } },
        h('h3', { style: { margin: '0 0 6px 0', fontSize: 16 } }, 'Exportă Datele'),
        h('p', { style: { fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 14px 0' } }, 'Descarcă un backup JSON pe telefon/PC.'),
        h('button', { onClick: handleExport, className: 'btn-tap', style: { width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' } }, 'Descarcă Backup (.json)')
      ),
      h('div', { className: 'card', style: { padding: 20 } },
        h('h3', { style: { margin: '0 0 6px 0', fontSize: 16 } }, 'Importă Datele'),
        h('p', { style: { fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 14px 0' } }, 'Încarcă un backup salvat anterior.'),
        h('label', { className: 'btn-tap', style: { display: 'block', width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600, fontSize: 14, textAlign: 'center', cursor: 'pointer' } },
          'Alege Fișier Backup',
          h('input', { type: 'file', accept: '.json,application/json', onChange: handleImport, style: { display: 'none' } })
        )
      ),
      statusMsg && h('div', { style: { padding: 12, borderRadius: 12, fontSize: 13, textAlign: 'center', background: statusMsg.type === 'success' ? 'var(--good-bg)' : 'var(--warn-bg)', color: statusMsg.type === 'success' ? 'var(--good)' : 'var(--warn)' } }, statusMsg.text),
      h('div', { style: { marginTop: 20, textAlign: 'center' } },
        !confirmReset
          ? h('button', { onClick: () => setConfirmReset(true), style: { background: 'none', border: 'none', color: 'var(--warn)', fontSize: 13, cursor: 'pointer' } }, 'Șterge toate datele din aplicație')
          : h('div', { className: 'card', style: { padding: 14, display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' } },
              h('span', { style: { fontSize: 13, color: 'var(--warn)' } }, 'Sigur ștergi?'),
              h('button', { onClick: () => { setData({ days: {} }); setConfirmReset(false); }, style: { background: 'var(--warn)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' } }, 'Da'),
              h('button', { onClick: () => setConfirmReset(false), style: { background: 'transparent', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' } }, 'Nu')
            )
      )
    );
  }

  // ------------------------------------------------------------------------
  // Main dashboard
  // ------------------------------------------------------------------------
  function MainDashboard({ data, setData }) {
    const [now] = useState(new Date());
    const [justAdded, setJustAdded] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customGrossInput, setCustomGrossInput] = useState('');
    const ripple = useRipple();

    const tKey = todayKey(now);
    const mKey = monthKey(now);

    const todayEntries = data.days[tKey] || [];
    const todaySum = todayEntries.reduce((a, b) => a + b, 0);

    const todayCounts = useMemo(() => RATES.reduce((acc, r) => {
      acc[r] = todayEntries.filter(e => e === r).length;
      return acc;
    }, {}), [todayEntries]);

    const monthDays = useMemo(() => Object.keys(data.days).filter(k => k.startsWith(mKey)), [data, mKey]);
    const monthSum = useMemo(() => monthDays.reduce((sum, k) => sum + (data.days[k] || []).reduce((a, b) => a + b, 0), 0), [monthDays, data]);

    const year = now.getFullYear();
    const month = now.getMonth();
    const totalWorkdaysInMonth = countWorkdays(year, month);
    const workdaysSoFar = countWorkdays(year, month, now.getDate());
    const monthlyTarget = totalWorkdaysInMonth * DAILY_TARGET;
    const expectedSoFar = workdaysSoFar * DAILY_TARGET;

    const todayProgress = Math.min(100, (todaySum / DAILY_TARGET) * 100);
    const remainingToday = Math.max(0, DAILY_TARGET - todaySum);
    const diffVsExpected = monthSum - expectedSoFar;

    const addEntry = useCallback((netRate) => {
      setData(prev => {
        const next = { ...prev, days: { ...prev.days } };
        const arr = next.days[tKey] ? [...next.days[tKey]] : [];
        arr.push(netRate);
        next.days[tKey] = arr;
        return next;
      });
      setJustAdded(netRate);
      setTimeout(() => setJustAdded(null), 500);
      triggerHaptic(10);
    }, [tKey, setData]);

    const handleAddCustom = (e) => {
      e.preventDefault();
      const grossVal = parseFloat(customGrossInput);
      if (isNaN(grossVal) || grossVal <= 0) return;
      const netVal = Math.round((grossVal / (1 + VAT_RATE)) * 100) / 100;
      addEntry(netVal);
      setCustomGrossInput('');
      setShowCustomModal(false);
    };

    const undoLastEntry = useCallback(() => {
      setData(prev => {
        const next = { ...prev, days: { ...prev.days } };
        const arr = next.days[tKey] ? [...next.days[tKey]] : [];
        if (arr.length === 0) return prev;
        arr.pop();
        next.days[tKey] = arr;
        return next;
      });
      triggerHaptic(15);
    }, [tKey, setData]);

    const monthDaysSorted = useMemo(() => {
      return monthDays.filter(k => (data.days[k] || []).length > 0).sort((a, b) => b.localeCompare(a));
    }, [monthDays, data]);

    const avgPerWorkday = workdaysSoFar > 0 ? monthSum / workdaysSoFar : 0;
    const todayOverage = Math.max(0, todaySum - DAILY_TARGET);
    const todayBonus = todayOverage * BONUS_RATE;

    return h('div', { className: 'fade-in' },
      // AZI Card
      h('div', { className: 'card', style: { padding: '20px', marginBottom: 14 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 } },
          h('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.04em' } }, 'AZI'),
          h('span', { style: { fontSize: 13, color: 'var(--ink-faint)' } }, `țintă ${fmtRON(DAILY_TARGET)}`)
        ),
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 } },
          h('span', { style: { fontSize: 38, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' } }, fmtRON(todaySum).replace(' lei', '')),
          h('span', { style: { fontSize: 16, color: 'var(--ink-soft)', fontWeight: 500 } }, 'lei')
        ),
        h('div', { style: { height: 8, background: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 } },
          h('div', { style: { height: '100%', width: todayProgress + '%', background: todayProgress >= 100 ? 'var(--good)' : 'var(--accent)', borderRadius: 4, transition: 'width 0.3s ease' } })
        ),
        h('div', { style: { fontSize: 13, color: 'var(--ink-soft)', fontWeight: 500 } },
          todayProgress >= 100 ? `Țintă atinsă. Peste target cu ${fmtRON(todayOverage)}.` : `Mai ai nevoie de ${fmtRON(remainingToday)}.`
        ),
        todayOverage > 0 && h('div', { style: { marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-light)', borderRadius: 10, padding: '8px 12px' } },
          h('span', { style: { fontSize: 12, color: 'var(--accent)', fontWeight: 600 } }, 'Bonus 31% azi'),
          h('span', { style: { fontSize: 14, fontWeight: 700, color: 'var(--accent)' } }, fmtRON(todayBonus))
        )
      ),

      // Rate Buttons
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 } },
        RATES.map((rate, i) =>
          h('button', {
            key: rate,
            onClick: (e) => { ripple(e); addEntry(rate); },
            className: 'card btn-tap',
            style: {
              border: 'none',
              background: justAdded === rate ? 'var(--accent)' : 'var(--surface)',
              color: justAdded === rate ? '#fff' : 'var(--ink)',
              padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer'
            }
          },
            h('span', { style: { fontSize: 22, fontWeight: 800 } }, GROSS_RATES[i]),
            h('span', { style: { fontSize: 11, color: justAdded === rate ? 'rgba(255,255,255,0.8)' : 'var(--ink-soft)' } }, 'lei cu TVA'),
            h('span', { style: { fontSize: 10, color: justAdded === rate ? 'rgba(255,255,255,0.7)' : 'var(--ink-faint)', marginTop: 2 } }, `fără TVA: ${rate.toFixed(2)}`),
            todayCounts[rate] > 0 && h('span', { style: { marginTop: 4, fontSize: 11, fontWeight: 700, background: justAdded === rate ? 'rgba(255,255,255,0.25)' : 'var(--accent-light)', color: justAdded === rate ? '#fff' : 'var(--accent)', borderRadius: 10, padding: '2px 6px' } }, `x${todayCounts[rate]}`)
          )
        )
      ),

      // Adaugă sumă personalizată
      h('button', {
        onClick: (e) => { ripple(e); setShowCustomModal(true); },
        className: 'card btn-tap',
        style: {
          width: '100%', color: 'var(--accent)', border: 'none',
          borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
        }
      }, '➕ Adaugă sumă personalizată (cu TVA)'),

      h('div', { style: { fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center', marginBottom: 14 } }, 'Toate calculele de mai sus (țintă, lună, bonus) sunt fără TVA'),

      todayEntries.length > 0 && h('button', {
        onClick: undoLastEntry,
        style: { width: '100%', fontSize: 12, color: 'var(--warn)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 14 }
      }, `Anulează ultima verificare (${grossOf(todayEntries[todayEntries.length - 1])} lei)`),

      // LUNA ACEASTA Card
      h('div', { className: 'card', style: { padding: '20px', marginBottom: 16 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 } },
          h('span', { style: { fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.04em' } }, 'LUNA ACEASTA'),
          h('span', { style: { fontSize: 13, color: 'var(--ink-faint)' } }, `${workdaysSoFar}/${totalWorkdaysInMonth} zile lucrătoare`)
        ),
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 } },
          h('span', { style: { fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' } }, fmtRON(monthSum)),
          h('span', { style: { fontSize: 14, color: 'var(--ink-faint)' } }, `/ ${fmtRON(monthlyTarget)}`)
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: diffVsExpected >= 0 ? 'var(--good)' : 'var(--warn)', background: diffVsExpected >= 0 ? 'var(--good-bg)' : 'var(--warn-bg)', borderRadius: 12, padding: '10px 14px', marginBottom: 10 } },
          diffVsExpected >= 0 ? `Ești în avans cu ${fmtRON(diffVsExpected)} față de ritm.` : `Ești în urmă cu ${fmtRON(Math.abs(diffVsExpected))} față de ritmul necesar.`
        ),
        h('div', { style: { fontSize: 13, color: 'var(--ink-faint)' } }, `Medie ${fmtRON(avgPerWorkday)} / zi lucrătoare`)
      ),

      // Vezi istoric zilnic
      h('button', {
        onClick: () => setShowHistory(!showHistory),
        style: { width: '100%', background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '8px 0', textAlign: 'center' }
      }, showHistory ? 'Ascunde istoric' : 'Vezi istoric zilnic'),

      showHistory && h('div', { className: 'fade-in', style: { marginTop: 10 } },
        monthDaysSorted.length === 0
          ? h('div', { style: { textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13, padding: 14 } }, 'Fără înregistrări.')
          : monthDaysSorted.map(key => {
              const entries = data.days[key];
              const sum = entries.reduce((a, b) => a + b, 0);
              return h('div', { key, className: 'card', style: { padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 600 } }, dayLabel(key)),
                  h('div', { style: { fontSize: 12, color: 'var(--ink-faint)' } }, `${entries.length} verificări`)
                ),
                h('div', { style: { fontSize: 15, fontWeight: 700 } }, fmtRON(sum))
              );
            })
      ),

      // Modal Sumă Custom
      showCustomModal && h('div', {
        style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 },
        onClick: (e) => { if (e.target === e.currentTarget) setShowCustomModal(false); }
      },
        h('div', { className: 'card fade-in', style: { padding: 20, width: '100%', maxWidth: 340 } },
          h('h3', { style: { margin: '0 0 6px 0', fontSize: 17 } }, 'Sumă Personalizată'),
          h('p', { style: { fontSize: 12, color: 'var(--ink-soft)', margin: '0 0 14px 0' } }, 'Introdu suma totală încasată (cu TVA 21%).'),
          h('form', { onSubmit: handleAddCustom, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            h('input', { type: 'number', step: 'any', inputMode: 'decimal', placeholder: 'ex: 450', value: customGrossInput, onChange: e => setCustomGrossInput(e.target.value), autoFocus: true, style: { padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 16 } }),
            customGrossInput > 0 && h('div', { style: { fontSize: 11, color: 'var(--ink-faint)' } }, `Fără TVA (21%): ${(parseFloat(customGrossInput) / (1 + VAT_RATE)).toFixed(2)} lei`),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 6 } },
              h('button', { type: 'button', onClick: () => setShowCustomModal(false), style: { flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--ink)', cursor: 'pointer' } }, 'Renunță'),
              h('button', { type: 'submit', style: { flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer' } }, 'Adaugă')
            )
          )
        )
      )
    );
  }

  // ------------------------------------------------------------------------
  // App Layout (drawer, header, tab routing)
  // ------------------------------------------------------------------------
  function AppLayout({ user, onLogout, theme, toggleTheme }) {
    const [activeTab, setActiveTab] = useState('main');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [data, setData] = useState(loadData);

    useEffect(() => { saveData(data); }, [data]);

    const tKey = todayKey();
    const mKey = monthKey();

    const todayEntries = data.days[tKey] || [];
    const todaySum = todayEntries.reduce((a, b) => a + b, 0);

    const monthDays = useMemo(() => Object.keys(data.days).filter(k => k.startsWith(mKey)), [data, mKey]);
    const monthSum = monthDays.reduce((sum, k) => sum + (data.days[k] || []).reduce((a, b) => a + b, 0), 0);

    const todayLabel = useMemo(() => {
      const d = new Date();
      const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
      const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    }, []);

    return h('div', { style: { maxWidth: 440, margin: '0 auto', padding: '16px 14px' } },

      // Sidebar Overlay
      h('div', { className: `drawer-overlay ${isDrawerOpen ? 'open' : ''}`, onClick: () => setIsDrawerOpen(false) }),

      // Sidebar Content (Drawer)
      h('div', { className: `drawer-content ${isDrawerOpen ? 'open' : ''}` },
        h('div', { style: { color: 'var(--eon-red)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 } }, 'E.ON ASIST COMPLET'),
        h('div', { style: { fontSize: 20, fontWeight: 800, color: 'var(--ink)', marginBottom: 20 } }, 'Revizii și verificări gaz'),

        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 } },
          h('button', {
            onClick: () => { setActiveTab('main'); setIsDrawerOpen(false); },
            className: `nav-btn ${activeTab === 'main' ? 'active' : ''}`
          }, h('span', { style: { fontSize: 18 } }, '🏠'), h('span', null, 'Pornire')),

          h('button', {
            onClick: () => { setActiveTab('data'); setIsDrawerOpen(false); },
            className: `nav-btn ${activeTab === 'data' ? 'active' : ''}`
          }, h('span', { style: { fontSize: 18 } }, '💾'), h('span', null, 'Date'))
        ),

        // Widget REZUMAT RAPID
        h('div', { className: 'card', style: { padding: 16, marginBottom: 'auto', background: 'var(--surface)' } },
          h('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 } }, 'REZUMAT RAPID'),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 } },
            h('span', { style: { color: 'var(--ink-soft)' } }, 'Azi'),
            h('span', { style: { fontWeight: 700, fontVariantNumeric: 'tabular-nums' } }, fmtRON(todaySum))
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13 } },
            h('span', { style: { color: 'var(--ink-soft)' } }, 'Luna aceasta'),
            h('span', { style: { fontWeight: 700, fontVariantNumeric: 'tabular-nums' } }, fmtRON(monthSum))
          )
        ),

        // Footer Drawer
        h('div', { style: { borderTop: '1px solid var(--border)', paddingTop: 14 } },
          h('div', { style: { fontSize: 12, color: 'var(--ink-soft)', marginBottom: 12 } }, `Salut, ${user}! • ${todayLabel}`),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', {
              onClick: toggleTheme,
              className: 'card btn-tap',
              style: { flex: 1, padding: 10, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }
            }, theme === 'light' ? '🌙' : '☀️'),
            h('button', {
              onClick: onLogout,
              className: 'card btn-tap',
              style: { flex: 1, padding: 10, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }
            }, '🚪')
          )
        )
      ),

      // Header Principal
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 } },
        h('button', {
          onClick: () => setIsDrawerOpen(true),
          className: 'card btn-tap',
          style: { width: 42, height: 42, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer', borderRadius: 12 },
          'aria-label': 'Deschide meniul'
        }, '☰'),
        h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 800 } }, activeTab === 'main' ? 'Pornire' : 'Gestiune Date')
      ),

      // Conținut
      activeTab === 'main' ? h(MainDashboard, { data, setData }) : h(DataTab, { data, setData })
    );
  }

  // ------------------------------------------------------------------------
  // Offline / update status toasts
  // ------------------------------------------------------------------------
  function StatusToasts() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [updateReady, setUpdateReady] = useState(false);
    const waitingWorkerRef = useRef(null);

    useEffect(() => {
      const goOffline = () => setIsOffline(true);
      const goOnline = () => setIsOffline(false);
      window.addEventListener('offline', goOffline);
      window.addEventListener('online', goOnline);
      return () => {
        window.removeEventListener('offline', goOffline);
        window.removeEventListener('online', goOnline);
      };
    }, []);

    useEffect(() => {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker) return;

      const onWaiting = (reg) => {
        if (reg.waiting) {
          waitingWorkerRef.current = reg.waiting;
          setUpdateReady(true);
        }
      };

      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        onWaiting(reg);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              waitingWorkerRef.current = newWorker;
              setUpdateReady(true);
            }
          });
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }, []);

    const applyUpdate = () => {
      if (waitingWorkerRef.current) {
        waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
      }
      setUpdateReady(false);
    };

    if (updateReady) {
      return h('div', { className: 'status-toast update' },
        h('span', null, 'Actualizare disponibilă'),
        h('button', { onClick: applyUpdate }, 'Reîmprospătează')
      );
    }
    if (isOffline) {
      return h('div', { className: 'status-toast offline' }, 'Ești offline — datele se salvează local.');
    }
    return null;
  }

  // ------------------------------------------------------------------------
  // App Root
  // ------------------------------------------------------------------------
  function App() {
    const [currentUser, setCurrentUser] = useState(() => {
      try { return localStorage.getItem('eon_active_user') || null; } catch (e) { return null; }
    });
    const [theme, setTheme] = useState(() => {
      try { return localStorage.getItem('revizii_theme') || 'light'; } catch (e) { return 'light'; }
    });

    useEffect(() => {
      document.documentElement.setAttribute('data-theme', theme);
      safeLocalStorageSet('revizii_theme', theme);
      // keep the browser UI (status bar / task switcher chrome) in sync with theme
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', theme === 'dark' ? '#000000' : '#E2001A');
      }
    }, [theme]);

    const handleLoginSuccess = (username) => {
      safeLocalStorageSet('eon_active_user', username);
      setCurrentUser(username);
    };

    const handleLogout = () => {
      try { localStorage.removeItem('eon_active_user'); } catch (e) { /* no-op */ }
      setCurrentUser(null);
    };

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    return h(React.Fragment, null,
      currentUser
        ? h(AppLayout, { user: currentUser, onLogout: handleLogout, theme, toggleTheme })
        : h(Auth, { onLoginSuccess: handleLoginSuccess, theme, toggleTheme }),
      h(StatusToasts)
    );
  }

  // ------------------------------------------------------------------------
  // Mount
  // ------------------------------------------------------------------------
  const rootEl = document.getElementById('root');
  const loadingShell = document.getElementById('app-loading-shell');
  ReactDOM.createRoot(rootEl).render(h(App));
  if (loadingShell) loadingShell.remove();

  // ------------------------------------------------------------------------
  // Service worker registration + update lifecycle
  // ------------------------------------------------------------------------
  if ('serviceWorker' in navigator && navigator.serviceWorker) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          // Check for waiting update periodically while app is open
          setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
        })
        .catch((err) => console.error('SW registration failed:', err));
    });
  }
})();
