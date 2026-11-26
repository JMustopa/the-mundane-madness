// Game data for THE MUNDANE MADNESS — transcribed from J's concept PDF.
window.MM = (() => {
  const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIL', 'CHA'];
  const mod = (score) => Math.floor((score - 10) / 2);
  const SKILLS = [
    ['Acrobatics', 'DEX'], ['Animal Handling', 'CHA'], ['Athletics', 'STR'], ['Deception', 'CHA'],
    ['History', 'INT'], ['Insight', 'INT'], ['Intimidation', 'CHA'], ['Investigation', 'INT'],
    ['Medicine', 'INT'], ['Nature', 'INT'], ['Perception', 'INT'], ['Performance', 'CHA'],
    ['Persuasion', 'CHA'], ['Religion', 'INT'], ['Sleight of Hand', 'DEX'], ['Stealth', 'DEX'],
    ['Survival', 'INT'], ['Occult', 'INT'],
  ];
  const LINEAGES = {
    Human: { desc: 'Indomitable Human Spirit: +1 WIL permanen.', apply: (a) => { a.WIL += 1; } },
    Fishfolk: { desc: 'Scaled Body: -2 slashing/bludgeoning, +2 fire/piercing. Darkvision.', apply: () => {} },
    Ghoul: { desc: 'Corpse Consumption: makan mayat memulihkan HP (default 2d6, bisa diatur GM). Tidak bisa pakai item pemulih HP normal; item SAN normal.', apply: () => {} },
  };
  const CLASS_WEAPONS = {
    Brute: [['Pistol', '1d8'], ['Unarmed / Knuckles', '1d6'], ['Large Blade / Blunt', '1d10'], ['Heavy Weapon', '2d6']],
    Investigator: [['Small Pistol', '1d8'], ['Rifle', '1d10'], ['Magnum', '1d10+1'], ['Magnum (special ammo)', '1d12']],
    'Street Urchin': [['Small Blade', '1d8'], ['Dagger', '1d6'], ['Cleaver', '1d6'], ['Small Blunt', '1d6']],
    Vessel: [['Dagger', '1d6']],
    'Priest of Miarin': [['Spear', '1d8'], ['Dagger', '1d4'], ['Light Crossbow', '1d8']],
  };
  // Skill decks. sanCost/damage are dice formulas rolled when the card is used.
  const DECKS = {
    Brute: [
      { name: 'Leap and Lunge', type: 'Active', sanCost: null, damage: '1d8', text: 'Lompat ke area kecil. Semua makhluk di area: 1d8 + STR. CON Save DC 12 gagal = Stunned 1 ronde.', cooldown: 'Short Rest / 3 ronde' },
      { name: 'Targeted Violence', type: 'Active', sanCost: '1d6', damage: '1d6', text: 'Tandai 1 target 3 giliran: serangan ke target +1d6 damage. Target mati = efek pindah sekali ke musuh terdekat.', cooldown: '-' },
      { name: 'At All Cost', type: 'Passive', sanCost: null, damage: null, text: 'SAN tidak bisa di bawah 30 saat combat. Di <=30 SAN: +1d6 melee, +3 AC. Cek Berserk tiap giliran: d20+WIL vs DC 13.', cooldown: 'Pasif' },
      { name: 'Calming Anger', type: 'Active', sanCost: null, damage: '1d10', text: 'Serangan tunggal brutal 1d10. Setelahnya SAN pulih PENUH, tapi Anti-Help 2 giliran.', cooldown: 'Long Rest', special: 'calming' },
    ],
    Investigator: [
      { name: 'Obsessive Sleuthing', type: 'Passive', sanCost: null, damage: null, text: '+7 Perception, Insight, Investigation. Setelah cek forensik penting: -1d4 SAN (petunjuk sangat disturbing: -1d6).', cooldown: 'Pasif', bonusSkills: ['Perception', 'Insight', 'Investigation'], bonus: 7 },
      { name: 'Quickdraw', type: 'Active', sanCost: '1d6', damage: '1d8', text: 'Dua tembakan presisi (senjata ranged kecil), Advantage, abaikan penalti jarak jauh. Masing-masing 1d8.', cooldown: 'Short Rest' },
      { name: 'CQC Takedown', type: 'Active', sanCost: null, damage: '2d6', text: 'Serangan jarak dekat 2d6. CON Save DC 13: gagal = target 0 HP (downed); sukses = Investigator kena 1d6.', cooldown: '-' },
      { name: 'Trauma Dumping', type: 'Active', sanCost: null, damage: null, text: 'Pulihkan 2d6 SAN, kehilangan 1d6 HP. Target kehilangan 1d4 SAN (Sentient: 1d6).', cooldown: 'Short Rest', special: 'trauma' },
    ],
    'Street Urchin': [
      { name: 'Street Smarts', type: 'Passive', sanCost: null, damage: null, text: '+7 Persuasion, Deception, Sleight of Hand. Gagal cek sosial: CHA Save DC 12 atau kena 1d6 bludgeoning.', cooldown: 'Pasif', bonusSkills: ['Persuasion', 'Deception', 'Sleight of Hand'], bonus: 7 },
      { name: 'Hide Presence', type: 'Active', sanCost: '1d6', damage: '1d8', text: 'Masuk Hidden 3 giliran (tidak bisa ditarget, bisa mencuri/interaksi). Serang dari Hidden: 1d8 sneak damage terjamin, Hide berakhir.', cooldown: '-', special: 'hide' },
      { name: 'Cowardice', type: 'Active', sanCost: null, damage: null, text: 'Movement naik + disengage 1 giliran. Lari melewati sekutu: sekutu kena 1d4.', cooldown: '-' },
      { name: 'Peace Offering', type: 'Active', sanCost: null, damage: null, text: 'Berikan item ke musuh & mohon ampun. SAN pulih sesuai nilai item, maks 2d6.', cooldown: '-', special: 'peace' },
    ],
    Vessel: [
      { name: 'Sanity Blast', type: 'Active', sanCost: '1d6', damage: '1d8', text: 'Bolt supernatural gelap 1d8. Hingga 3 bolt tambahan: masing-masing biaya 1d6 SAN, damage 1d6.', cooldown: '-' },
      { name: 'Collateral Damage', type: 'Active', sanCost: null, damage: null, text: 'Kuras 1d8 SAN target. WIL Save DC 13: sukses = separuh. Vessel memulihkan separuh SAN yang dikuras.', cooldown: '-', special: 'drain' },
      { name: 'Latch', type: 'Active', sanCost: null, damage: null, text: 'Korbankan 50% SAN saat ini untuk menempel ke target: target -3 AC, -2 serangan. Vessel tidak bisa bergerak, masih bisa cast.', cooldown: '-', special: 'latch' },
      { name: 'Live and Die Alone', type: 'Passive', sanCost: null, damage: null, text: 'Tidak bisa menerima pemulihan SAN dari luar. Pulihkan SAN hanya lewat kemampuan/item sendiri.', cooldown: 'Pasif' },
    ],
    'Priest of Miarin': [
      { name: 'Blessed Hands', type: 'Active', sanCost: '1d6', damage: null, text: 'Sembuhkan sekutu: 2d6 + WIL HP.', cooldown: '-', special: 'heal' },
      { name: 'First Warning', type: 'Active', sanCost: '1d6', damage: '1d8', text: 'Api emas area kecil: 1d8 damage. Melawan Abomination: 2d6.', cooldown: '-' },
      { name: 'Emergency Miracle', type: 'Active', sanCost: null, damage: null, text: 'Korbankan 50% SAN saat ini: teleport ke sekutu, keduanya dapat 15 HP Shield.', cooldown: '-', special: 'miracle' },
      { name: "God's Chariot", type: 'Passive', sanCost: null, damage: null, text: '+4 damage vs Abomination, -4 damage vs Sentient/Animal (klasifikasi bisa diruling GM).', cooldown: 'Pasif' },
      { name: 'Pray', type: 'Active', sanCost: null, damage: null, text: 'Berdoa 2 giliran: SAN pulih PENUH. Selama berdoa +6 AC, menarik perhatian musuh, tidak bisa bertindak.', cooldown: 'Long Rest', special: 'pray' },
    ],
  };
  const ITEMS = [
    { name: 'Adrenaline Injector', effect: 'Pulihkan 2d6 HP. Pemakaian berulang: -1d4 SAN.', kind: 'hp', dice: '2d6' },
    { name: 'Cigarette', effect: 'Pulihkan 1d4 SAN (1 giliran).', kind: 'san', dice: '1d4' },
    { name: 'Alcohol', effect: 'Pulihkan 2d6 SAN, kehilangan 1d6 HP.', kind: 'san', dice: '2d6', sideDice: '1d6' },
    { name: 'Aromatic Vial', effect: 'Langka: SAN pulih PENUH.', kind: 'sanfull', dice: null },
  ];
  const CONDITIONS = ['Stunned', 'Hidden', 'Berserk', 'Latched', 'Anti-Help'];
  const SAN_TIERS = [
    { min: 75, label: 'Stable', penalty: 0 }, { min: 50, label: 'Agitated', penalty: -2 },
    { min: 25, label: 'Unstable', penalty: -5 }, { min: 1, label: 'Fractured', penalty: -7 },
    { min: 0, label: 'Insane', penalty: -7 },
  ];
  const sanTier = (san) => SAN_TIERS.find((t) => san >= t.min) || SAN_TIERS.at(-1);

  // ---- Dice helpers ----
  function rollDice(formula) {
    // supports "2d6", "1d10+1", "1d8", "2d6+WIL" not included — numeric only
    const m = String(formula).trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!m) return null;
    const n = +m[1], sides = +m[2], flat = m[3] ? +m[3] : 0;
    const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
    return { formula, rolls, flat, total: rolls.reduce((a, b) => a + b, 0) + flat };
  }
  const fmtRoll = (r) => `${r.formula} [${r.rolls.join(', ')}]${r.flat ? (r.flat > 0 ? ' +' + r.flat : ' ' + r.flat) : ''} = ${r.total}`;

  // ---- Pixel avatars: 12x14 grids generated from palettes ----
  const AVATAR = {
    skins: ['#e8b98a', '#c98d5e', '#8a5a34', '#f0cba8', '#6e4525'],
    hairColors: ['#2b2118', '#6e4525', '#b85c33', '#c9c2b4', '#454052', '#8a1f1f'],
    outfits: ['#3b4c68', '#5e2f1a', '#2e4a34', '#454052', '#71634e'],
    accents: ['#c9a227', '#8a1f1f', '#9fd8e8', '#e8e2d4', '#b85c33'],
    bgs: ['#26324a', '#2e4a34', '#3a2c05', '#33241f', '#241f2e'],
    hairs: ['Rapi', 'Mohawk', 'Botak', 'Panjang', 'Topi'],
  };
  function avatarSVG(av, size = 48) {
    const skin = AVATAR.skins[av.skin] || AVATAR.skins[0];
    const hair = AVATAR.hairColors[av.hairColor] || AVATAR.hairColors[0];
    const outfit = AVATAR.outfits[av.outfit] || AVATAR.outfits[0];
    const accent = AVATAR.accents[av.accent] || AVATAR.accents[0];
    const bg = AVATAR.bgs[av.bg] || AVATAR.bgs[0];
    let hairRects = '';
    if (av.hair === 0) hairRects = `<rect x="3" y="1" width="6" height="2" fill="${hair}"/>`;
    if (av.hair === 1) hairRects = `<rect x="5" y="0" width="2" height="3" fill="${hair}"/>`;
    if (av.hair === 3) hairRects = `<rect x="3" y="1" width="6" height="2" fill="${hair}"/><rect x="2" y="3" width="2" height="6" fill="${hair}"/><rect x="8" y="3" width="2" height="6" fill="${hair}"/>`;
    if (av.hair === 4) hairRects = `<rect x="2" y="1" width="8" height="2" fill="${accent}"/><rect x="4" y="0" width="4" height="1" fill="${accent}"/>`;
    return `<svg width="${size}" height="${size}" viewBox="0 0 12 14" style="image-rendering:pixelated" aria-hidden="true">
      <rect width="12" height="14" fill="${bg}"/>
      <rect x="3" y="2" width="6" height="6" fill="${skin}"/>${hairRects}
      <rect x="4" y="5" width="1" height="1" fill="#14100c"/><rect x="7" y="5" width="1" height="1" fill="#14100c"/>
      <rect x="5" y="7" width="2" height="1" fill="#7a4a34"/>
      <rect x="2" y="9" width="8" height="5" fill="${outfit}"/><rect x="5" y="9" width="2" height="5" fill="${accent}"/>
    </svg>`;
  }

  // ---- Deicity hex map: 9 x 7, layout per approved mockup ----
  const MAP_W = 9, MAP_H = 7;
  // rows y=0..6, each string of 9 type codes
  const LAYOUT = [
    'FFRRRRAFF'.slice(0, 9),
    'F2221222F',
    'F2222222F',
    'F33B C33F'.replace(' ', ''),
    'F3333335F',
    'F4443555F',
    'FF44S55FF',
  ];
  // Fix row strings explicitly (authoritative layout):
  LAYOUT[0] = 'FRFRARFRF'; // forest / empty road / anomaly accents outside top
  LAYOUT[1] = 'F2221222F'; // D2 ring with D1 top-center (row1-2 form D1 block with row below)
  LAYOUT[2] = 'F2211122F';
  LAYOUT[3] = 'F33BC333F'; // B = Border Control, C = Checkpoint (southern crossing)
  LAYOUT[4] = 'F3333335F';
  LAYOUT[5] = 'F4443555F';
  LAYOUT[6] = 'FF44S55FF'; // S = Should-Not-Exist at bottom seam
  const CODE2TYPE = { '1': 'district1', '2': 'district2', B: 'border', C: 'checkpoint', '3': 'district3', '4': 'district4', '5': 'district5', F: 'forest', R: 'road', A: 'anomaly', S: 'anomaly' };
  function baseTerrain(x, y) { const row = LAYOUT[y] || ''; return CODE2TYPE[row[x]] || 'district3'; }
  const TILE_TYPES = {
    district1: { name: 'District 1 — Elite Core', color: '#d8cdb2', icon: 'pillar', locked: true },
    district2: { name: 'District 2 — Luxury Buffer', color: '#4a4438', icon: 'navyhouse' },
    border: { name: 'Border Control', color: '#26324a', icon: 'border' },
    checkpoint: { name: 'Checkpoint D2 → D1', color: '#3a2e20', icon: 'checkpoint' },
    district3: { name: 'District 3 — Kota Padat', color: '#5c5648', icon: 'city' },
    district4: { name: 'District 4 — Reruntuhan', color: '#35322e', icon: 'ruin' },
    district5: { name: 'District 5 — Pabrik & Korporasi', color: '#6e4525', icon: 'factory' },
    forest: { name: 'Hutan (Luar Kota)', color: '#31402f', icon: 'forest' },
    road: { name: 'Jalan Kosong (Luar Kota)', color: '#55534a', icon: 'road' },
    anomaly: { name: 'Should-Not-Exist', color: '#241f2e', icon: 'anomaly' },
  };
  const EMOJI_GROUPS = {
    Reaksi: ['😀', '😂', '😮', '😢', '😡', '🤔', '😱', '🥴', '😴', '🤨', '🫡', '🙏', '👍', '👎', '❤️', '🔥'],
    'Dadu & Permainan': ['🎲', '⚔️', '🛡️', '🏹', '🗡️', '💥', '✨', '🎯', '🏆', '💀', '🩸', '⚡'],
    'Horor & Suasana': ['👁️', '🌑', '🔦', '📖', '🕯️', '🌫️', '🌙', '🦇', '🕷️', '👻', '😈', '🔮', '📷', '🚬', '🥃', '💉'],
    'Chat Umum': ['👋', '🙌', '👏', '🤝', '💪', '🍻', '☕', '🍜', '🚗', '🏠', '📱', '💰', '🗺️', '⏰', '❓', '❗'],
  };

  return { ABILITIES, mod, SKILLS, LINEAGES, CLASS_WEAPONS, DECKS, ITEMS, CONDITIONS, SAN_TIERS, sanTier, rollDice, fmtRoll, AVATAR, avatarSVG, MAP_W, MAP_H, baseTerrain, TILE_TYPES, EMOJI_GROUPS };
})();
