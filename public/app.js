// THE MUNDANE MADNESS — standalone frontend. All shared data via /api.
const { ABILITIES, mod, SKILLS, LINEAGES, CLASS_WEAPONS, DECKS, ITEMS, CONDITIONS, sanTier, rollDice, fmtRoll, AVATAR, avatarSVG, MAP_W, MAP_H, baseTerrain, TILE_TYPES, EMOJI_GROUPS } = window.MM;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let S = { characters: [], messages: [], rolls: [], settings: { clock: { day: 1, hour: 8 }, terrain: {}, positions: {} } };
let selId = localStorage.getItem('mm-sel') || null;
let chatTimer = null;

async function api(path, method = 'GET', body) {
  const r = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || r.statusText); }
  return r.json();
}
async function loadState() { S = await api('/api/state'); renderClock(); }
const selChar = () => S.characters.find((c) => c.id === selId) || S.characters[0] || null;
function toast(msg, ms = 3400) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => t.style.display = 'none', ms); }
function renderClock() { const c = S.settings.clock; $('#clockLabel').textContent = `Hari ${c.day} · ${String(c.hour).padStart(2, '0')}:00`; }
$$('[data-advance]').forEach((b) => b.addEventListener('click', async () => {
  const h = +b.dataset.advance; let { day, hour } = S.settings.clock; hour += h; day += Math.floor(hour / 24); hour %= 24;
  await api('/api/settings', 'PUT', { clock: { day, hour } }); await loadState(); renderActive(); toast(`Waktu maju ke Hari ${day} · ${String(hour).padStart(2, '0')}:00`);
}));

// ---------- Roll plumbing (shared feed + floating log) ----------
async function pushRoll({ formula, detail, total, label, characterName, outcome }) {
  const roll = await api('/api/rolls', 'POST', { formula, detail, total, label: label || '', characterName: characterName || '', outcome: outcome || '' });
  S.rolls.unshift(roll); renderRollLog(); if (currentTab === 'dadu') renderDaduFeed();
  return roll;
}
function renderRollLog() {
  $('#rollLog').innerHTML = S.rolls.slice(0, 30).map((r) => `<div><b>${esc(r.formula)}</b> ${esc(r.detail)} = <b>${r.total}</b>${r.label ? ` <span class="muted">${esc(r.label)}</span>` : ''}${r.characterName ? ` <span class="muted">— ${esc(r.characterName)}</span>` : ''}</div>`).join('') || '<div class="muted">Belum ada roll.</div>';
}
function d20Check({ label, abilityMod, profDelta = 0, bonus = 0, character }) {
  const tier = character ? sanTier(character.san) : { penalty: 0, label: '' };
  const d = 1 + Math.floor(Math.random() * 20);
  const total = d + abilityMod + profDelta + bonus + tier.penalty;
  const parts = [`d20[${d}]`, abilityMod ? `mod ${abilityMod > 0 ? '+' : ''}${abilityMod}` : 'mod 0'];
  if (profDelta) parts.push(profDelta > 0 ? `prof +${profDelta}` : `inept ${profDelta}`);
  if (bonus) parts.push(`kelas +${bonus}`);
  if (tier.penalty) parts.push(`SAN ${tier.label} ${tier.penalty}`);
  const outcome = d === 20 ? 'CRITICAL SUCCESS' : d === 1 ? 'CRITICAL FAIL' : '';
  pushRoll({ formula: '1d20', detail: parts.join(' '), total, label, characterName: character?.name, outcome });
  toast(`${label}: ${total}${outcome ? ' — ' + outcome : ''}`);
  return total;
}

// ---------- Tabs ----------
let currentTab = 'party';
$$('#tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
function showTab(name) {
  currentTab = name;
  $$('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab').forEach((s) => s.classList.toggle('active', s.id === 'tab-' + name));
  clearInterval(chatTimer);
  if (name === 'chat') { renderChat(); chatTimer = setInterval(async () => { await loadState(); renderChatMsgs(); }, 4000); }
  renderActive();
}
function renderActive() {
  ({ party: renderParty, creator: renderCreator, sheet: renderSheet, deck: renderDeck, dadu: renderDadu, chat: renderChat, peta: renderPeta })[currentTab]?.();
}

// ---------- Party ----------
function idChip(c) {
  const map = { none: ['Belum Punya ID', ''], processing: ['ID Sedang Diproses', 'gold'], owned: ['Punya ID Card', 'gold'] };
  const [t, cls] = map[c.idStatus] || map.none; return `<span class="chip ${cls}">${t}</span>`;
}
function renderParty() {
  const el = $('#tab-party');
  if (!S.characters.length) { el.innerHTML = `<div class="card"><h2>Belum ada karakter</h2><p class="muted">Party masih kosong. Buat karakter pertama lewat tab <b>+ Karakter</b> — wizard-nya mengikuti Bab 9: Class → Lineage → Ability → Proficiency → HP/SAN → Equipment → Identitas.</p><button class="primary" onclick="showTab('creator')">+ Buat Karakter</button></div>`; return; }
  el.innerHTML = `<h2>Party Deicity</h2><div class="grid">${S.characters.map((c) => {
    const t = sanTier(c.san);
    return `<div class="card party-card" data-open="${c.id}">${avatarSVG(c.avatar, 56)}<div style="flex:1">
      <b>${esc(c.name)}</b> <span class="muted">${esc(c.className)} · ${esc(c.lineage)} · Lv ${c.level}</span><br>${idChip(c)}
      <div class="muted">HP ${c.hp}/${c.maxHp}</div><div class="bar hp"><i style="width:${Math.max(0, c.hp / c.maxHp * 100)}%"></i></div>
      <div class="muted">SAN ${c.san}/100 — ${t.label}${t.penalty ? ` (${t.penalty})` : ''}</div><div class="bar san"><i style="width:${c.san}%"></i></div>
      <div class="muted">AC ${c.ac}</div></div></div>`;
  }).join('')}</div>`;
  $$('[data-open]', el).forEach((d) => d.addEventListener('click', () => { selId = d.dataset.open; localStorage.setItem('mm-sel', selId); showTab('sheet'); }));
}

// ---------- Creator (wizard 7 langkah) ----------
const W = { step: 1, className: 'Brute', lineage: 'Human', abilities: { STR: 15, DEX: 13, CON: 14, INT: 10, WIL: 12, CHA: 8 }, profs: {}, weapons: [], items: [], name: '', background: '', avatar: { hair: 0, skin: 0, hairColor: 0, outfit: 0, accent: 0, bg: 0 } };
function renderCreator() {
  const el = $('#tab-creator'); const step = W.step;
  const stepsBar = `<div class="wizard-steps">${['Class', 'Lineage', 'Ability', 'Proficiency', 'HP / SAN / AC', 'Equipment', 'Identitas'].map((s, i) => `<span class="chip ${i + 1 === step ? 'gold' : ''}">${i + 1}. ${s}</span>`).join('')}</div>`;
  let body = '';
  if (step === 1) body = `<div class="grid">${Object.keys(DECKS).map((c) => `<button class="card ${W.className === c ? 'active' : ''}" data-class="${c}"><b>${c}</b><br><span class="muted">${DECKS[c].map((s) => s.name).join(' · ')}</span></button>`).join('')}</div>`;
  if (step === 2) body = Object.entries(LINEAGES).map(([n, l]) => `<div class="card"><label><input type="radio" name="lin" value="${n}" ${W.lineage === n ? 'checked' : ''}> <b>${n}</b></label><p class="muted">${l.desc}</p></div>`).join('');
  if (step === 3) body = `<div class="card"><p class="muted">Standard array 15, 14, 13, 12, 10, 8 — atur bebas (1–20). Modifier = floor((skor − 10) / 2). Bonus lineage diterapkan saat simpan.</p>${ABILITIES.map((a) => `<label>${a} <input type="number" min="1" max="20" value="${W.abilities[a]}" data-ab="${a}" style="width:80px"> <span class="muted">mod ${mod(W.abilities[a]) >= 0 ? '+' : ''}${mod(W.abilities[a])}</span></label> `).join('')}</div>`;
  if (step === 4) body = `<div class="card"><p class="muted">Proficient +2 · Normal 0 · Inept −2. Saran: 4 proficient, 2 inept (tidak dikunci).</p><table>${SKILLS.map(([n, a]) => `<tr><td>${n} <span class="muted">(${a})</span></td><td><select data-prof="${n}">${['normal', 'prof', 'inept'].map((v) => `<option value="${v}" ${(W.profs[n] || 'normal') === v ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('')}</table></div>`;
  if (step === 5) { const cm = mod(W.abilities.CON); const hp = Math.min(30, Math.max(12, 14 + cm * 2)); body = `<div class="card"><p>Max HP: <b>${hp}</b> <span class="muted">(14 + CON mod × 2, dibatasi 12–30 sesuai saran PDF level 1–3)</span></p><p>SAN: <b>100</b></p><p>AC dasar: <b>${10 + mod(W.abilities.DEX)}</b> <span class="muted">(10 + DEX mod, bisa diubah di sheet)</span></p></div>`; W._hp = hp; W._ac = 10 + mod(W.abilities.DEX); }
  if (step === 6) body = `<div class="card"><h3>Senjata (${esc(W.className)})</h3>${(CLASS_WEAPONS[W.className] || []).map(([n, d]) => `<label style="display:block"><input type="checkbox" data-weapon="${n}|${d}" ${W.weapons.includes(n) ? 'checked' : ''}> ${n} — ${d}</label>`).join('')}<h3>Item awal</h3>${ITEMS.map((it) => `<label style="display:block"><input type="checkbox" data-item="${it.name}" ${W.items.includes(it.name) ? 'checked' : ''}> ${it.name} — <span class="muted">${it.effect}</span></label>`).join('')}</div>`;
  if (step === 7) body = `<div class="card"><label>Nama karakter<br><input id="w-name" value="${esc(W.name)}" style="width:100%"></label><label>Background / kepribadian<br><textarea id="w-bg">${esc(W.background)}</textarea></label>
    <h3>Avatar Pixel</h3><div class="avatarpick"><span id="w-avprev">${avatarSVG(W.avatar, 72)}</span>
    ${[['hair', 'Gaya', AVATAR.hairs], ['skin', 'Kulit', AVATAR.skins], ['hairColor', 'Rambut', AVATAR.hairColors], ['outfit', 'Outfit', AVATAR.outfits], ['accent', 'Aksen', AVATAR.accents], ['bg', 'Latar', AVATAR.bgs]].map(([k, label, arr]) => `<label>${label}<br><select data-av="${k}">${arr.map((_, i) => `<option value="${i}" ${W.avatar[k] === i ? 'selected' : ''}>${label} ${i + 1}</option>`).join('')}</select></label>`).join('')}</div></div>`;
  el.innerHTML = `<h2>Character Creator</h2>${stepsBar}<div id="wbody">${body}</div>
    <div style="display:flex;gap:8px;margin-top:10px">${step > 1 ? '<button id="w-back">← Mundur</button>' : ''}${step < 7 ? '<button class="primary" id="w-next">Lanjut →</button>' : '<button class="primary" id="w-save">Simpan Karakter</button>'}</div>`;
  $$('[data-class]', el).forEach((b) => b.addEventListener('click', () => { W.className = b.dataset.class; W.weapons = []; renderCreator(); }));
  $$('input[name=lin]', el).forEach((r) => r.addEventListener('change', () => W.lineage = r.value));
  $$('[data-ab]', el).forEach((i) => i.addEventListener('change', () => { W.abilities[i.dataset.ab] = Math.min(20, Math.max(1, +i.value || 10)); renderCreator(); }));
  $$('[data-prof]', el).forEach((s) => s.addEventListener('change', () => W.profs[s.dataset.prof] = s.value));
  $$('[data-weapon]', el).forEach((c) => c.addEventListener('change', () => { const n = c.dataset.weapon.split('|')[0]; W.weapons = c.checked ? [...W.weapons, n] : W.weapons.filter((x) => x !== n); }));
  $$('[data-item]', el).forEach((c) => c.addEventListener('change', () => { W.items = c.checked ? [...W.items, c.dataset.item] : W.items.filter((x) => x !== c.dataset.item); }));
  $$('[data-av]', el).forEach((s) => s.addEventListener('change', () => { W.avatar[s.dataset.av] = +s.value; $('#w-avprev').innerHTML = avatarSVG(W.avatar, 72); }));
  $('#w-back')?.addEventListener('click', () => { W.step--; renderCreator(); });
  $('#w-next')?.addEventListener('click', () => { W.step++; renderCreator(); });
  $('#w-save')?.addEventListener('click', async () => {
    W.name = $('#w-name').value.trim(); W.background = $('#w-bg').value;
    if (!W.name) return toast('Isi nama karakter dulu.');
    const abilities = { ...W.abilities }; LINEAGES[W.lineage]?.apply(abilities);
    const weapons = (CLASS_WEAPONS[W.className] || []).filter(([n]) => W.weapons.includes(n)).map(([name, dice]) => ({ name, dice }));
    const ch = await api('/api/characters', 'POST', { name: W.name, className: W.className, lineage: W.lineage, abilities, profs: W.profs, maxHp: W._hp || 20, ac: W._ac || 12, weapons, inventory: W.items.map((name) => ({ name, qty: 1 })), background: W.background, avatar: W.avatar });
    selId = ch.id; localStorage.setItem('mm-sel', selId); await loadState(); toast(`Karakter ${ch.name} dibuat.`); showTab('sheet');
  });
}

// ---------- Sheet ----------
async function saveChar(c, patch) { Object.assign(c, patch); await api('/api/characters/' + c.id, 'PUT', patch); }
function classBonus(c, skill) {
  const deck = DECKS[c.className] || [];
  let b = 0; for (const s of deck) if (s.bonusSkills?.includes(skill)) b += s.bonus;
  return b;
}
function renderSheet() {
  const el = $('#tab-sheet'); const c = selChar();
  if (!c) { el.innerHTML = '<div class="card">Belum ada karakter. Buat dulu di tab + Karakter.</div>'; return; }
  const t = sanTier(c.san);
  el.innerHTML = `
  <div class="card" style="display:flex;gap:14px;flex-wrap:wrap">${avatarSVG(c.avatar, 84)}<div style="flex:1;min-width:220px">
    <h2 style="margin:0">${esc(c.name)}</h2><div class="muted">${esc(c.className)} · ${esc(c.lineage)} · Level ${c.level} · AC ${c.ac}</div>${idChip(c)}
    <div style="margin-top:8px">HP <b>${c.hp}/${c.maxHp}</b> <button data-hp="-5">-5</button> <button data-hp="-1">-1</button> <button data-hp="1">+1</button> <button data-hp="5">+5</button></div>
    <div class="bar hp"><i style="width:${Math.max(0, c.hp / c.maxHp * 100)}%"></i></div>
    <div style="margin-top:8px">SAN <b>${c.san}/100</b> — ${t.label}${t.penalty ? ` (${t.penalty} ke cek)` : ''} <button data-san="-5">-5</button> <button data-san="-1">-1</button> <button data-san="1">+1</button> <button data-san="5">+5</button></div>
    <div class="bar san"><i style="width:${c.san}%"></i></div>
    ${c.san <= 24 && c.san > 0 ? '<button class="danger" id="despairBtn" style="margin-top:8px">Despair Roll (d20+WIL vs DC 13)</button>' : ''}
  </div></div>
  <div class="card"><h3>Ability — klik buat cek d20</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr))">
    ${ABILITIES.map((a) => `<button data-ability="${a}"><b>${a}</b><br><span style="font-size:20px">${c.abilities[a]}</span><br><span class="muted">mod ${mod(c.abilities[a]) >= 0 ? '+' : ''}${mod(c.abilities[a])}</span></button>`).join('')}</div></div>
  <div class="card"><h3>Skills — klik buat roll</h3><table>${SKILLS.map(([n, a]) => {
      const p = c.profs[n] || 'normal'; const pd = p === 'prof' ? 2 : p === 'inept' ? -2 : 0; const bonus = classBonus(c, n);
      return `<tr class="skillrow" data-skill="${n}" data-ab="${a}" data-pd="${pd}" data-bonus="${bonus}"><td>${n}</td><td class="muted">${a}</td><td>${p}${bonus ? ` · kelas +${bonus}` : ''}</td><td><b>${(mod(c.abilities[a]) + pd + bonus + t.penalty) >= 0 ? '+' : ''}${mod(c.abilities[a]) + pd + bonus + t.penalty}</b></td></tr>`;
    }).join('')}</table></div>
  <div class="card"><h3>Kondisi</h3>${CONDITIONS.map((x) => `<button class="chip ${c.conditions.includes(x) ? 'blood' : ''}" data-cond="${x}">${x}</button>`).join('')}</div>
  <div class="card"><h3>Senjata — klik buat roll damage</h3>${c.weapons.length ? c.weapons.map((w) => `<button data-weapon-dice="${w.dice}" data-weapon-name="${esc(w.name)}">${esc(w.name)} · ${w.dice}</button> `).join('') : '<span class="muted">Tidak ada senjata.</span>'}</div>
  <div class="card"><h3>Inventory</h3>${c.inventory.length ? c.inventory.map((it, i) => `<div>${esc(it.name)} ×${it.qty} <button data-use-item="${i}">Pakai</button></div>`).join('') : '<span class="muted">Kosong.</span>'}
    <p class="muted">${ITEMS.map((i) => `${i.name}: ${i.effect}`).join('<br>')}</p></div>
  <div class="card"><h3>Catatan & Clues Investigasi</h3><textarea id="sh-notes" placeholder="Catatan...">${esc(c.notes)}</textarea><textarea id="sh-clues" placeholder="Clues..." style="margin-top:8px">${esc(c.clues)}</textarea>
    <div style="margin-top:8px"><button id="sh-save">Simpan Catatan</button> <button class="danger" id="sh-del">Hapus Karakter</button></div></div>`;
  $$('[data-hp]', el).forEach((b) => b.addEventListener('click', async () => { await saveChar(c, { hp: Math.min(c.maxHp, Math.max(0, c.hp + +b.dataset.hp)) }); renderSheet(); }));
  $$('[data-san]', el).forEach((b) => b.addEventListener('click', async () => { await saveChar(c, { san: Math.min(100, Math.max(0, c.san + +b.dataset.san)) }); renderSheet(); renderParty(); }));
  $$('[data-ability]', el).forEach((b) => b.addEventListener('click', () => d20Check({ label: `${b.dataset.ability} check`, abilityMod: mod(c.abilities[b.dataset.ability]), character: c })));
  $$('[data-skill]', el).forEach((r) => r.addEventListener('click', () => d20Check({ label: r.dataset.skill, abilityMod: mod(c.abilities[r.dataset.ab]), profDelta: +r.dataset.pd, bonus: +r.dataset.bonus, character: c })));
  $$('[data-cond]', el).forEach((b) => b.addEventListener('click', async () => { const x = b.dataset.cond; await saveChar(c, { conditions: c.conditions.includes(x) ? c.conditions.filter((y) => y !== x) : [...c.conditions, x] }); renderSheet(); }));
  $$('[data-weapon-dice]', el).forEach((b) => b.addEventListener('click', () => { const r = rollDice(b.dataset.weaponDice); if (r) pushRoll({ formula: r.formula, detail: `[${r.rolls.join(', ')}]`, total: r.total, label: b.dataset.weaponName, characterName: c.name }); }));
  $$('[data-use-item]', el).forEach((b) => b.addEventListener('click', async () => {
    const it = c.inventory[+b.dataset.useItem]; const def = ITEMS.find((x) => x.name === it.name); if (!def) return;
    if (def.kind === 'hp' && c.lineage === 'Ghoul') return toast('Ghoul tidak bisa memakai item pemulih HP normal.');
    let { hp, san } = c;
    if (def.dice) { const r = rollDice(def.dice); if (def.kind === 'hp') hp = Math.min(c.maxHp, hp + r.total); else san = Math.min(100, san + r.total); pushRoll({ formula: r.formula, detail: `[${r.rolls.join(', ')}]`, total: r.total, label: it.name, characterName: c.name }); }
    if (def.kind === 'sanfull') san = 100;
    if (def.sideDice) { const r2 = rollDice(def.sideDice); hp = Math.max(0, hp - r2.total); }
    const inv = c.inventory.map((x, i) => i === +b.dataset.useItem ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0);
    await saveChar(c, { hp, san, inventory: inv }); renderSheet(); toast(`${it.name} dipakai.`);
  }));
  $('#despairBtn')?.addEventListener('click', () => { const total = d20Check({ label: 'Despair', abilityMod: mod(c.abilities.WIL), character: c }); toast(total >= 13 ? 'Despair: tetap memegang kendali.' : 'Despair: GAGAL — kehilangan kendali (GM menentukan akibatnya).', 5000); });
  $('#sh-save').addEventListener('click', async () => { await saveChar(c, { notes: $('#sh-notes').value, clues: $('#sh-clues').value }); toast('Catatan tersimpan.'); });
  $('#sh-del').addEventListener('click', async () => { if (confirm(`Hapus ${c.name}?`)) { await api('/api/characters/' + c.id, 'DELETE'); selId = null; localStorage.removeItem('mm-sel'); await loadState(); showTab('party'); } });
}

// ---------- Deck Skill ----------
let deckClass = null;
function renderDeck() {
  const el = $('#tab-deck'); const c = selChar();
  if (!deckClass) deckClass = c?.className || 'Brute';
  el.innerHTML = `<h2>Deck Skill per Class</h2><div>${Object.keys(DECKS).map((x) => `<button data-deck="${x}" class="${deckClass === x ? 'active' : ''}">${x}</button> `).join('')}</div>
  <p class="muted">${c ? `Memakai deck sebagai <b>${esc(c.name)}</b> (${esc(c.className)}) — biaya SAN & efek diterapkan ke karakter ini.` : 'Pilih/buat karakter dulu supaya efek skill bisa diterapkan.'}</p>
  <div class="deck" style="margin-top:12px">${(DECKS[deckClass] || []).map((s, i) => `<div class="skill-card"><span class="chip gold">${s.type}</span> ${s.cooldown && s.cooldown !== '-' ? `<span class="chip">${esc(s.cooldown)}</span>` : ''}
    <h4>${esc(s.name)}</h4><p class="muted">${esc(s.text)}</p>
    ${s.sanCost ? `<div>Biaya SAN: <b>${s.sanCost}</b></div>` : ''}${s.damage ? `<div>Damage/efek: <b>${s.damage}</b></div>` : ''}
    <button class="primary" data-use-skill="${i}" style="margin-top:8px">Pakai</button></div>`).join('')}</div>`;
  $$('[data-deck]', el).forEach((b) => b.addEventListener('click', () => { deckClass = b.dataset.deck; renderDeck(); }));
  $$('[data-use-skill]', el).forEach((b) => b.addEventListener('click', async () => {
    const s = (DECKS[deckClass] || [])[+b.dataset.useSkill]; if (!c) return toast('Buat/pilih karakter dulu.');
    let { san, hp } = c; const conds = [...c.conditions];
    if (s.sanCost) { const r = rollDice(s.sanCost); san = Math.max(0, san - r.total); await pushRoll({ formula: r.formula, detail: `[${r.rolls.join(', ')}]`, total: r.total, label: `${s.name} — biaya SAN`, characterName: c.name }); }
    if (s.special === 'latch' || s.special === 'miracle') { const cost = Math.floor(san / 2); san -= cost; toast(`${s.name}: SAN dikorbankan ${cost}.`); }
    if (s.damage) { const r = rollDice(s.damage); await pushRoll({ formula: r.formula, detail: `[${r.rolls.join(', ')}]`, total: r.total, label: `${s.name} — damage`, characterName: c.name }); }
    if (s.special === 'calming' || s.special === 'pray') { san = 100; if (s.special === 'calming' && !conds.includes('Anti-Help')) conds.push('Anti-Help'); toast(`${s.name}: SAN pulih penuh.`); }
    if (s.special === 'hide' && !conds.includes('Hidden')) conds.push('Hidden');
    if (s.special === 'trauma') { const r1 = rollDice('2d6'); san = Math.min(100, san + r1.total); const r2 = rollDice('1d6'); hp = Math.max(0, hp - r2.total); await pushRoll({ formula: '2d6', detail: `[${r1.rolls.join(', ')}]`, total: r1.total, label: 'Trauma Dumping — SAN pulih', characterName: c.name }); }
    if (s.special === 'drain') { const r = rollDice('1d8'); san = Math.min(100, san + Math.floor(r.total / 2)); await pushRoll({ formula: '1d8', detail: `[${r.rolls.join(', ')}]`, total: r.total, label: 'Collateral Damage — SAN dikuras', characterName: c.name }); }
    if (s.special === 'heal') { const r = rollDice('2d6'); const amt = r.total + mod(c.abilities.WIL); hp = Math.min(c.maxHp, hp + amt); await pushRoll({ formula: '2d6', detail: `[${r.rolls.join(', ')}] +WIL`, total: amt, label: 'Blessed Hands — heal', characterName: c.name }); }
    if (s.special === 'peace') { const r = rollDice('2d6'); san = Math.min(100, san + r.total); }
    await saveChar(c, { san, hp, conditions: conds }); await loadState(); renderDeck(); renderRollLog();
  }));
}

// ---------- Dadu (simulasi d4–d20) ----------
const DICE = [4, 6, 8, 10, 12, 20];
let diceSel = 20, diceResultHtml = '';
function renderDadu() {
  const el = $('#tab-dadu'); const c = selChar();
  el.innerHTML = `<h2>Simulasi Dadu</h2>
  <div class="dicepick">${DICE.map((d) => `<button class="diebtn ${diceSel === d ? 'active' : ''}" data-die="${d}">d${d}</button>`).join('')}</div>
  <div class="card" style="margin-top:12px">
    <label>Jumlah <input id="d-qty" type="number" min="1" max="10" value="1" style="width:70px"></label>
    <label>Modifier <input id="d-mod" type="number" min="-10" max="10" value="0" style="width:70px"></label>
    <label>Label <input id="d-label" placeholder="mis. Attack Magnum"></label>
    <label>Roll sebagai <select id="d-char"><option value="">— bebas —</option>${S.characters.map((x) => `<option value="${x.id}" ${c && x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <div id="d-d20opts" style="margin-top:8px;${diceSel === 20 ? '' : 'display:none'}">
      <label>Mode <select id="d-mode"><option value="normal">Normal</option><option value="adv">Advantage</option><option value="dis">Disadvantage</option></select></label>
      <label>DC (opsional) <input id="d-dc" type="number" placeholder="12" style="width:70px"></label>
    </div>
    <div style="margin-top:10px"><button class="primary" id="d-roll" style="font-size:17px;padding:12px 22px">ROLL</button>
    <span class="muted">Preset: </span>${[['1d20 check', '1d20'], ['SAN 1d4', '1d4'], ['SAN 1d6', '1d6'], ['Damage 1d8', '1d8'], ['Damage 1d10', '1d10'], ['2d6 damage/heal', '2d6']].map(([l, f]) => `<button data-preset="${f}">${l}</button>`).join(' ')}</div>
    <div id="d-result">${diceResultHtml}</div>
  </div>
  <div class="card"><h3>Party Roll Feed (bersama)</h3><div id="d-feed"></div><button class="danger" id="d-clear">Bersihkan Feed</button></div>`;
  renderDaduFeed();
  $$('[data-die]', el).forEach((b) => b.addEventListener('click', () => { diceSel = +b.dataset.die; renderDadu(); }));
  $$('[data-preset]', el).forEach((b) => b.addEventListener('click', () => { const f = b.dataset.preset; const m = f.match(/(\d+)d(\d+)/); $('#d-qty').value = m[1]; diceSel = +m[2]; renderDadu(); $('#d-roll').click(); }));
  $('#d-clear').addEventListener('click', async () => { if (confirm('Bersihkan semua roll feed?')) { await api('/api/rolls', 'DELETE'); await loadState(); renderDadu(); renderRollLog(); } });
  $('#d-roll').addEventListener('click', () => {
    const qty = Math.min(10, Math.max(1, +$('#d-qty').value || 1));
    const modv = Math.min(10, Math.max(-10, +$('#d-mod').value || 0));
    const label = $('#d-label').value; const charId = $('#d-char').value;
    const ch = S.characters.find((x) => x.id === charId);
    const mode = diceSel === 20 ? $('#d-mode').value : 'normal';
    const dc = diceSel === 20 && $('#d-dc').value ? +$('#d-dc').value : null;
    const resultBox = $('#d-result');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const settle = () => {
      let rolls, kept, dropped = null, formula;
      if (diceSel === 20 && mode !== 'normal' && qty === 1) {
        rolls = [1 + Math.floor(Math.random() * 20), 1 + Math.floor(Math.random() * 20)];
        kept = mode === 'adv' ? Math.max(...rolls) : Math.min(...rolls); dropped = rolls.find((x) => x !== kept) ?? rolls[0];
        formula = `2d20 (${mode === 'adv' ? 'adv' : 'dis'})`;
      } else { rolls = Array.from({ length: qty }, () => 1 + Math.floor(Math.random() * diceSel)); kept = null; formula = `${qty}d${diceSel}`; }
      const base = kept !== null ? kept : rolls.reduce((a, b) => a + b, 0);
      const total = base + modv;
      const nat = kept !== null ? kept : (qty === 1 && diceSel === 20 ? rolls[0] : null);
      let outcome = '';
      if (nat === 20) outcome = 'CRITICAL SUCCESS'; if (nat === 1) outcome = 'CRITICAL FAIL';
      if (dc !== null) outcome += (outcome ? ' · ' : '') + (total >= dc ? `SUCCESS vs DC ${dc}` : `FAIL vs DC ${dc}`);
      const detail = kept !== null ? `ambil ${kept}, buang ${dropped}` : `[${rolls.join(', ')}]`;
      diceResultHtml = `<div class="bigroll ${nat === 20 ? 'crit-ok' : nat === 1 ? 'crit-bad' : ''}">${total}</div><p style="text-align:center" class="muted">${formula} ${detail}${modv ? ` ${modv > 0 ? '+' : ''}${modv}` : ''} = <b>${total}</b>${outcome ? `<br><b>${outcome}</b>` : ''}</p>`;
      resultBox.innerHTML = diceResultHtml;
      pushRoll({ formula, detail, total, label, characterName: ch?.name, outcome });
    };
    if (reduced) return settle();
    resultBox.innerHTML = `<div class="bigroll tumbling" id="d-tumble">?</div>`;
    const iv = setInterval(() => { const t = $('#d-tumble'); if (t) t.textContent = 1 + Math.floor(Math.random() * diceSel); }, 90);
    setTimeout(() => { clearInterval(iv); settle(); }, 780);
  });
}
function renderDaduFeed() {
  const f = $('#d-feed'); if (!f) return;
  f.innerHTML = S.rolls.slice(0, 50).map((r) => `<div style="border-bottom:1px dashed #333;padding:5px 0"><b>${esc(r.formula)}</b> ${esc(r.detail)} = <b>${r.total}</b> ${r.label ? `<span class="muted">${esc(r.label)}</span>` : ''} ${r.characterName ? `<span class="muted">— ${esc(r.characterName)}</span>` : ''} ${r.outcome ? `<span class="chip gold">${esc(r.outcome)}</span>` : ''} <span class="muted">${new Date(r.at).toLocaleTimeString('id-ID')}</span></div>`).join('') || '<span class="muted">Belum ada roll.</span>';
}

// ---------- Chat Party + emoji picker ----------
let emojiOpen = false;
function chatIdentity() {
  const kind = $('#c-kind')?.value || 'guest';
  if (kind === 'gm') return { senderName: 'GM', senderKind: 'gm', characterId: null, avatar: null };
  if (kind === 'char') { const c = S.characters.find((x) => x.id === $('#c-char').value) || selChar(); if (c) return { senderName: c.name, senderKind: 'char', characterId: c.id, avatar: c.avatar }; }
  return { senderName: $('#c-name')?.value.trim() || 'Anon', senderKind: 'guest', characterId: null, avatar: null };
}
function renderChat() {
  const el = $('#tab-chat');
  el.innerHTML = `<h2>Party Chat</h2>
  <div class="card"><label>Chat sebagai <select id="c-kind"><option value="char">Karakter</option><option value="gm">GM</option><option value="guest">Nama bebas</option></select></label>
  <select id="c-char">${S.characters.map((x) => `<option value="${x.id}">${esc(x.name)} (${esc(x.className)})</option>`).join('')}</select>
  <input id="c-name" placeholder="Nama bebas" style="display:none">
  <button id="c-clear" class="danger" style="float:right">Bersihkan Chat</button></div>
  <div class="chatlog" id="c-log"></div>
  <div id="c-emoji"></div>
  <div style="display:flex;gap:8px;margin-top:8px"><button id="c-emoji-btn" title="Emoji" aria-label="Pilih emoji"><svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="#c9a227" stroke-width="2"/><circle cx="7" cy="8" r="1.3" fill="#c9a227"/><circle cx="13" cy="8" r="1.3" fill="#c9a227"/><path d="M6 12.5 Q10 15.5 14 12.5" stroke="#c9a227" fill="none" stroke-width="2"/></svg></button>
  <textarea id="c-input" placeholder="Tulis pesan ke party... (Enter kirim, Shift+Enter baris baru)" maxlength="1000"></textarea>
  <button class="primary" id="c-send">Kirim</button></div>`;
  renderChatMsgs(); renderEmojiPanel();
  $('#c-kind').addEventListener('change', () => { $('#c-name').style.display = $('#c-kind').value === 'guest' ? '' : 'none'; $('#c-char').style.display = $('#c-kind').value === 'char' ? '' : 'none'; });
  $('#c-emoji-btn').addEventListener('click', () => { emojiOpen = !emojiOpen; renderEmojiPanel(); });
  $('#c-send').addEventListener('click', sendChat);
  $('#c-input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });
  $('#c-clear').addEventListener('click', async () => { if (confirm('Bersihkan semua chat?') && confirm('Yakin? Ini tidak bisa dibatalkan.')) { await api('/api/messages', 'DELETE'); await loadState(); renderChatMsgs(); } });
  async function sendChat() {
    const ta = $('#c-input'); const text = ta.value.trim(); if (!text) return;
    const msg = await api('/api/messages', 'POST', { ...chatIdentity(), text });
    S.messages.push(msg); ta.value = ''; emojiOpen = false; renderEmojiPanel(); renderChatMsgs();
  }
}
function renderEmojiPanel() {
  const box = $('#c-emoji'); if (!box) return;
  if (!emojiOpen) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="emoji-panel">${Object.entries(EMOJI_GROUPS).map(([g, list]) => `<div class="muted" style="margin:6px 0 4px">${g}</div><div class="emoji-grid">${list.map((e) => `<button data-emoji="${e}">${e}</button>`).join('')}</div>`).join('')}</div>`;
  $$('[data-emoji]', box).forEach((b) => b.addEventListener('click', () => {
    const ta = $('#c-input'); const e = b.dataset.emoji; const s = ta.selectionStart ?? ta.value.length, en = ta.selectionEnd ?? ta.value.length;
    ta.value = (ta.value.slice(0, s) + e + ta.value.slice(en)).slice(0, 1000); ta.focus(); const pos = s + e.length; requestAnimationFrame(() => ta.setSelectionRange(pos, pos));
  }));
}
function renderChatMsgs() {
  const log = $('#c-log'); if (!log) return;
  log.innerHTML = S.messages.map((m) => `<div class="msg">${m.avatar ? avatarSVG(m.avatar, 36) : '<div style="width:36px"></div>'}<div class="body"><div class="meta"><b>${esc(m.senderName)}</b>${m.senderKind === 'gm' ? ' <span class="chip gold">GM</span>' : ''} · ${new Date(m.at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>${esc(m.text)}</div></div>`).join('') || '<p class="muted">Belum ada pesan. Kirim pesan pertama ke party.</p>';
  log.scrollTop = log.scrollHeight;
}

// ---------- Peta Deicity (hex + gate District 1) ----------
let mapSelCharId = null, paintMode = false, paintType = 'district3', mapMsg = '';
const isBuffer = (t) => ['district2', 'border', 'checkpoint'].includes(t);
function terrainAt(x, y) { return S.settings.terrain[`${x},${y}`] || baseTerrain(x, y); }
function tileIcon(type) {
  const icons = {
    pillar: '<rect x="6" y="3" width="2" height="9" fill="#8a7a4a"/><rect x="11" y="3" width="2" height="9" fill="#8a7a4a"/><rect x="4" y="2" width="11" height="2" fill="#a08c54"/><rect x="8" y="7" width="3" height="3" fill="#c9a227"/>',
    navyhouse: '<rect x="4" y="7" width="11" height="6" fill="#5e4f38"/><rect x="3" y="5" width="13" height="2" fill="#26324a"/><rect x="8" y="9" width="3" height="4" fill="#2b2118"/>',
    border: '<rect x="4" y="4" width="11" height="9" fill="#31435f"/><rect x="4" y="4" width="11" height="2" fill="#c9a227"/><rect x="12" y="9" width="4" height="4" fill="#e8e4d2"/><rect x="13" y="10" width="2" height="2" fill="#5b7fa6"/>',
    checkpoint: '<rect x="2" y="8" width="14" height="2" fill="#c9a227"/><rect x="3" y="6" width="2" height="7" fill="#4a3520"/><rect x="13" y="6" width="2" height="7" fill="#4a3520"/><rect x="8" y="4" width="2" height="2" fill="#e08a3a"/>',
    city: '<rect x="3" y="6" width="5" height="7" fill="#3d382e"/><rect x="10" y="4" width="5" height="9" fill="#453f33"/><rect x="4" y="8" width="2" height="2" fill="#d8b93a"/><rect x="11" y="6" width="2" height="2" fill="#d8b93a"/>',
    ruin: '<rect x="4" y="4" width="9" height="9" fill="#23211e"/><rect x="6" y="6" width="2" height="3" fill="#0d0c0a"/><rect x="7" y="11" width="5" height="1" fill="#8a1f1f"/>',
    factory: '<rect x="3" y="8" width="12" height="5" fill="#54301c"/><rect x="4" y="4" width="2" height="4" fill="#3d2010"/><rect x="8" y="4" width="2" height="4" fill="#3d2010"/><rect x="4" y="2" width="3" height="2" fill="#9a9284"/>',
    forest: '<rect x="3" y="5" width="4" height="6" fill="#22301f"/><rect x="8" y="3" width="5" height="8" fill="#283a24"/><rect x="12" y="6" width="3" height="5" fill="#22301f"/>',
    road: '<rect x="7" y="1" width="3" height="14" fill="#2e2c28"/><rect x="8" y="3" width="1" height="3" fill="#c9c2a8"/><rect x="8" y="9" width="1" height="3" fill="#c9c2a8"/>',
    anomaly: '<rect x="4" y="6" width="11" height="4" fill="#0d0a14"/><rect x="7" y="7" width="5" height="2" fill="#e6ddff"/><rect x="9" y="7" width="2" height="2" fill="#6a4a9a"/>',
  };
  return `<svg width="26" height="26" viewBox="0 0 19 16" style="image-rendering:pixelated">${icons[TILE_TYPES[type]?.icon] || icons.city}</svg>`;
}
function renderPeta() {
  const el = $('#tab-peta');
  const c = S.characters.find((x) => x.id === mapSelCharId) || selChar(); mapSelCharId = c?.id || null;
  let rows = '';
  for (let y = 0; y < MAP_H; y++) {
    let cells = '';
    for (let x = 0; x < MAP_W; x++) {
      const t = terrainAt(x, y); const def = TILE_TYPES[t];
      const toks = S.characters.filter((ch) => { const p = S.settings.positions[ch.id]; return p && p.x === x && p.y === y; });
      cells += `<button class="hex" data-hex="${x},${y}" title="${def.name} (${x},${y})" style="background:${def.color}">${tileIcon(t)}<span class="lbl">${def.name.split('—')[0].trim()}${t === 'district1' ? ' 🔒' : ''}</span>${toks.length ? `<span class="tok">${toks.map((ch) => avatarSVG(ch.avatar, 20)).join('')}</span>` : ''}</button>`;
    }
    rows += `<div class="hexrow ${y % 2 ? 'offset' : ''}">${cells}</div>`;
  }
  const pos = c ? S.settings.positions[c.id] : null;
  const onBorder = pos && terrainAt(pos.x, pos.y) === 'border';
  el.innerHTML = `<h2>Peta Deicity</h2>
  <div class="card"><label>Token karakter <select id="m-char">${S.characters.map((x) => `<option value="${x.id}" ${c && x.id === c.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
  ${c ? `<span style="margin-left:10px">${idChip(c)} <span class="muted">${pos ? `Posisi: ${TILE_TYPES[terrainAt(pos.x, pos.y)].name} (${pos.x},${pos.y})` : 'Belum ditempatkan — klik hex buat menempatkan.'}</span></span>` : '<span class="muted">Buat karakter dulu.</span>'}
  ${onBorder && c.idStatus === 'none' ? '<button class="primary" id="m-apply" style="margin-left:10px">Ajukan ID Card di Border Control</button>' : ''}
  ${onBorder && c.idStatus === 'processing' ? `<span class="chip gold" style="margin-left:10px">ID diproses — selesai Hari ${c.idReadyAt?.day} · ${String(c.idReadyAt?.hour ?? 0).padStart(2, '0')}:00</span>` : ''}
  <div style="margin-top:8px"><button id="m-paint">${paintMode ? 'Mode Cat: ON' : 'Mode Cat Terrain'}</button>
  ${paintMode ? `<select id="m-paint-type">${Object.entries(TILE_TYPES).map(([k, v]) => `<option value="${k}" ${paintType === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select>` : ''}
  <span class="muted">GM — override ID: </span><select id="m-override"><option value="">(pilih status)</option><option value="none">Belum Punya</option><option value="processing">Sedang Diproses</option><option value="owned">Punya</option></select></div>
  ${mapMsg ? `<p style="margin-top:8px"><b>${esc(mapMsg)}</b></p>` : ''}</div>
  <div class="hexmap">${rows}</div>
  <div class="card"><h3>Legend</h3>${Object.values(TILE_TYPES).map((v) => `<span class="chip">${v.name}</span>`).join('')}
  <p class="muted">Aturan gate: masuk District 1 cuma dari District 2 / Border Control / Checkpoint DAN status ID Card = Punya. Pengajuan ID di Border Control butuh 2 hari in-game (majukan waktu pakai tombol jam di atas).</p></div>`;
  $('#m-char')?.addEventListener('change', (e) => { mapSelCharId = e.target.value; renderPeta(); });
  $('#m-paint')?.addEventListener('click', () => { paintMode = !paintMode; renderPeta(); });
  $('#m-paint-type')?.addEventListener('change', (e) => paintType = e.target.value);
  $('#m-override')?.addEventListener('change', async (e) => { if (!c || !e.target.value) return; await saveChar(c, { idStatus: e.target.value, idReadyAt: e.target.value === 'processing' ? { day: S.settings.clock.day + 2, hour: S.settings.clock.hour } : null }); await loadState(); renderPeta(); toast(`Status ID ${c.name}: ${e.target.value}`); });
  $('#m-apply')?.addEventListener('click', async () => {
    let { day, hour } = S.settings.clock; hour += 48; day += Math.floor(hour / 24); hour %= 24;
    await saveChar(c, { idStatus: 'processing', idReadyAt: { day, hour } }); await loadState(); mapMsg = `Pengajuan ID Card ${c.name} diterima Border Control — selesai Hari ${day} · ${String(hour).padStart(2, '0')}:00.`; renderPeta();
  });
  $$('[data-hex]', el).forEach((h) => h.addEventListener('click', async () => {
    const [x, y] = h.dataset.hex.split(',').map(Number); const target = terrainAt(x, y);
    if (paintMode) { const terrain = { ...S.settings.terrain, [`${x},${y}`]: paintType }; await api('/api/settings', 'PUT', { terrain }); await loadState(); renderPeta(); return; }
    if (!c) return toast('Pilih/buat karakter dulu.');
    const cur = S.settings.positions[c.id];
    if (target === 'district1') {
      const curType = cur ? terrainAt(cur.x, cur.y) : null;
      if (!curType || !isBuffer(curType)) { mapMsg = 'Checkpoint menolak: masuk District 1 hanya bisa lewat District 2.'; renderPeta(); return; }
      if (c.idStatus !== 'owned') { mapMsg = `Checkpoint menolak: ID Card belum dimiliki (status: ${c.idStatus === 'processing' ? 'Sedang Diproses' : 'Belum Punya'}). Ajukan di Border Control.`; renderPeta(); return; }
    }
    const positions = { ...S.settings.positions, [c.id]: { x, y } };
    await api('/api/settings', 'PUT', { positions }); await loadState(); mapMsg = `${c.name} pindah ke ${TILE_TYPES[target].name} (${x},${y}).`; renderPeta();
  }));
}

// ---------- Init ----------
(async () => { try { await loadState(); } catch (e) { toast('Gagal memuat data: ' + e.message); } renderRollLog(); renderActive(); })();
