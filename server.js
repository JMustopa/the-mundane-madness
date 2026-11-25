// THE MUNDANE MADNESS — standalone server (zero dependencies, Node >= 18)
// Serves the web app in /public and a small JSON API for shared party data.
// Storage: a single JSON file (DATA_FILE env, default ./data/db.json).
// Swap note: all persistence goes through loadDb()/saveDb(), so moving to
// Postgres/SQLite later only means replacing those two functions.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const DEFAULT_DB = {
  characters: [],
  messages: [],
  rolls: [],
  settings: {
    clock: { day: 1, hour: 8 },          // in-game time, drives ID Card processing
    terrain: {},                          // "x,y" -> terrain type id (paint overrides)
    positions: {},                        // characterId -> {x, y}
  },
};

function loadDb() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const db = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_DB), ...db, settings: { ...structuredClone(DEFAULT_DB.settings), ...(db.settings || {}) } };
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}
let saveTimer = null;
function saveDb(db) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  }, 30);
}
let db = loadDb();

const id = () => crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');
const now = () => new Date().toISOString();

function send(res, status, body, type = 'application/json') {
  const data = type === 'application/json' ? JSON.stringify(body) : body;
  res.writeHead(status, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (c) => { buf += c; if (buf.length > 1_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// ID Card auto-completion: processing -> owned once in-game time passes readyAt.
function refreshIdStatuses() {
  const { day, hour } = db.settings.clock;
  const cur = day * 24 + hour;
  let changed = false;
  for (const ch of db.characters) {
    if (ch.idStatus === 'processing' && ch.idReadyAt && cur >= ch.idReadyAt.day * 24 + ch.idReadyAt.hour) {
      ch.idStatus = 'owned'; ch.idReadyAt = null; changed = true;
    }
  }
  if (changed) saveDb(db);
}

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  try {
    // ---------- API ----------
    if (p === '/api/health') return send(res, 200, { ok: true, app: 'the-mundane-madness', time: now() });

    if (p === '/api/state' && req.method === 'GET') {
      refreshIdStatuses();
      return send(res, 200, db);
    }

    if (p === '/api/characters' && req.method === 'GET') { refreshIdStatuses(); return send(res, 200, db.characters); }
    if (p === '/api/characters' && req.method === 'POST') {
      const b = await readBody(req);
      if (!b.name || !b.className) return send(res, 400, { error: 'name dan className wajib diisi' });
      const ch = {
        id: id(), createdAt: now(),
        name: String(b.name).slice(0, 60), className: b.className, lineage: b.lineage || 'Human', level: 1,
        abilities: b.abilities || { STR: 10, DEX: 10, CON: 10, INT: 10, WIL: 10, CHA: 10 },
        profs: b.profs || {}, // skill -> 'prof' | 'inept' | 'normal'
        maxHp: b.maxHp || 20, hp: b.maxHp || 20, maxSan: 100, san: 100,
        ac: b.ac || 12, weapons: b.weapons || [], inventory: b.inventory || [],
        conditions: [], notes: b.notes || '', clues: '', background: b.background || '',
        avatar: b.avatar || { hair: 0, skin: 0, hairColor: 0, outfit: 0, accent: 0, bg: 0 },
        idStatus: 'none', idReadyAt: null,
        ghoulHealDice: b.ghoulHealDice || '2d6',
      };
      db.characters.push(ch); saveDb(db);
      return send(res, 201, ch);
    }
    const chMatch = p.match(/^\/api\/characters\/([\w-]+)$/);
    if (chMatch && req.method === 'PUT') {
      const ch = db.characters.find((c) => c.id === chMatch[1]);
      if (!ch) return send(res, 404, { error: 'karakter tidak ditemukan' });
      const b = await readBody(req);
      const allowed = ['hp', 'san', 'ac', 'conditions', 'inventory', 'notes', 'clues', 'level', 'idStatus', 'idReadyAt', 'weapons'];
      for (const k of allowed) if (k in b) ch[k] = b[k];
      refreshIdStatuses(); saveDb(db);
      return send(res, 200, ch);
    }
    if (chMatch && req.method === 'DELETE') {
      db.characters = db.characters.filter((c) => c.id !== chMatch[1]);
      delete db.settings.positions[chMatch[1]];
      saveDb(db); return send(res, 200, { ok: true });
    }

    if (p === '/api/messages' && req.method === 'GET') return send(res, 200, db.messages);
    if (p === '/api/messages' && req.method === 'POST') {
      const b = await readBody(req);
      const text = String(b.text || '').trim().slice(0, 1000);
      if (!text) return send(res, 400, { error: 'pesan kosong' });
      const msg = { id: id(), at: now(), senderName: String(b.senderName || 'Anon').slice(0, 60), senderKind: b.senderKind || 'guest', characterId: b.characterId || null, avatar: b.avatar || null, text };
      db.messages.push(msg); saveDb(db);
      return send(res, 201, msg);
    }
    if (p === '/api/messages' && req.method === 'DELETE') { db.messages = []; saveDb(db); return send(res, 200, { ok: true }); }

    if (p === '/api/rolls' && req.method === 'GET') return send(res, 200, db.rolls);
    if (p === '/api/rolls' && req.method === 'POST') {
      const b = await readBody(req);
      const roll = { id: id(), at: now(), formula: b.formula || '', detail: b.detail || '', total: b.total ?? 0, label: b.label || '', characterName: b.characterName || '', outcome: b.outcome || '' };
      db.rolls.unshift(roll); db.rolls = db.rolls.slice(0, 200); saveDb(db);
      return send(res, 201, roll);
    }
    if (p === '/api/rolls' && req.method === 'DELETE') { db.rolls = []; saveDb(db); return send(res, 200, { ok: true }); }

    if (p === '/api/settings' && req.method === 'GET') { refreshIdStatuses(); return send(res, 200, db.settings); }
    if (p === '/api/settings' && req.method === 'PUT') {
      const b = await readBody(req);
      if (b.clock) db.settings.clock = b.clock;
      if (b.terrain) db.settings.terrain = b.terrain;
      if (b.positions) db.settings.positions = b.positions;
      refreshIdStatuses(); saveDb(db);
      return send(res, 200, db.settings);
    }

    if (p.startsWith('/api/')) return send(res, 404, { error: 'endpoint tidak ditemukan' });

    // ---------- Static ----------
    let file = p === '/' ? '/index.html' : p;
    const full = path.join(PUBLIC_DIR, path.normalize(file));
    if (!full.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
    fs.readFile(full, (err, data) => {
      if (err) { // SPA fallback
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, idx) => e2 ? send(res, 404, 'Not found', 'text/plain') : send(res, 200, idx, 'text/html'));
        return;
      }
      send(res, 200, data, MIME[path.extname(full)] || 'application/octet-stream');
    });
  } catch (e) {
    send(res, 500, { error: String(e && e.message || e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`THE MUNDANE MADNESS running at http://${HOST}:${PORT} (data: ${DATA_FILE})`);
});
