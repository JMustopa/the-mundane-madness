# THE MUNDANE MADNESS — Standalone (Deployable)

Versi standalone dari app **The Mundane Madness** (modern cosmic horror RPG, setting Deicity) yang sebelumnya jalan sebagai Space di Muse. Isi & aturannya sama, tapi versi ini jalan di luar runtime Muse: satu server Node kecil melayani frontend + API data bersama, jadi bisa di-host publik dan dimainkan bareng teman.

Space Muse yang live **tidak diubah** — ini copy terpisah khusus hosting.

## Fitur

- **Character Creator** wizard 7 langkah (Class → Lineage → Ability → Proficiency/Ineptitude 18 skill → HP/SAN/AC → Equipment → Identitas + avatar pixel)
- **Character Sheet**: HP & SAN bar, tier SAN otomatis (Stable/Agitated −2/Unstable −5/Fractured −7/Insane) yang benar-benar dipakai di roll, klik skill/ability buat cek d20, kondisi, senjata, inventory (termasuk blokir item HP buat Ghoul), Despair roll, catatan & clues
- **Deck Skill** untuk 5 class (Brute, Investigator, Street Urchin, Vessel, Priest of Miarin) — pakai kartu = biaya SAN ke-roll & kepotong, efek spesial (Calming Anger, Pray, Trauma Dumping, Latch, Blessed Hands, dll) diterapkan
- **Simulasi Dadu** d4–d20: animasi tumble (reduced-motion aman), jumlah + modifier, Advantage/Disadvantage d20, Nat 20/1 crit, cek DC, preset sesuai PDF, party roll feed bersama
- **Party Chat** + emoji picker (68 emoji, 4 grup): chat sebagai karakter (avatar pixel), GM, atau nama bebas; pesan tersimpan bersama & auto-refresh
- **Peta Deicity** hex 9×7 gaya pixel Fear & Hunger: District 1–5, Border Control, Checkpoint, hutan, jalan kosong, Should-Not-Exist; **gate District 1 ditegakkan** (wajib lewat District 2 + ID Card status *Punya*; pengajuan ID di Border Control diproses 2 hari in-game pakai jam GM +1 Jam/+6 Jam/+1 Hari, ada override GM), mode cat terrain, posisi token tersimpan

## Cara jalanin lokal

Butuh Node.js >= 18. **Tanpa dependensi** — tidak perlu `npm install`.

```bash
npm start
# atau: node server.js
```

Buka http://localhost:3000

## Environment

| Var | Default | Fungsi |
|---|---|---|
| `PORT` | `3000` | Port listen. Platform hosting biasanya meng-inject ini otomatis. |
| `HOST` | `0.0.0.0` | Bind host. |
| `DATA_FILE` | `./data/db.json` | File penyimpanan data bersama (karakter, chat, roll, peta, jam in-game). |

Salin `.env.example` sebagai referensi. **Penting:** arahkan `DATA_FILE` ke storage persisten (volume/disk) di host — kalau tidak, data party bisa hilang saat redeploy/restart di filesystem ephemeral.

## API (ringkas)

- `GET /api/state` — semua data bersama
- `GET|POST /api/characters`, `PUT|DELETE /api/characters/:id`
- `GET|POST|DELETE /api/messages`
- `GET|POST|DELETE /api/rolls`
- `GET|PUT /api/settings` — jam in-game, terrain hasil cat, posisi token
- `GET /api/health`

Status ID Card (`none` → `processing` → `owned`) otomatis selesai di server saat jam in-game melewati waktu selesainya.

## Deploy ke Altare (langkah berikutnya — belum dilakukan)

Rute paling bersih menurut recon Altare: **via GitHub**.

1. Buat repo GitHub baru (mis. `the-mundane-madness`), push folder ini ke branch `main`.
2. Di Altare: connect GitHub → pilih repo + branch → Altare auto-detect Node.
3. Build/start command:
   - Install/build: *(kosong — zero dependencies)*
   - Start: `npm start` (atau `node server.js`)
4. Env: biarkan `PORT` dari Altare; set `DATA_FILE` ke path di storage persisten app (plan Free punya 40 GiB storage), atau pakai database Altare (Postgres/MySQL) nanti — kode penyimpanan terpusat di `loadDb()`/`saveDb()` di `server.js` supaya gampang diganti.
5. Hasilnya: public URL + subdomain Altare gratis. Domain custom bisa ditempel belakangan dari halaman Network app via CNAME (menu Domains di Altare hanya DNS hosting).
6. Alternatif: deploy via Docker — `Dockerfile` sudah disertakan.

Catatan: saat recon, Altare sedang ada banner "heavy demand" / partial outage yang memengaruhi deployment — kalau deploy gagal, coba lagi beberapa saat kemudian.

## Struktur repo

```
.
├── server.js          # server HTTP + API + storage JSON (zero-dep)
├── package.json       # start script: node server.js
├── Dockerfile         # alternatif deploy via Docker
├── .env.example
├── data/
│   └── .gitkeep       # db.json dibuat otomatis saat runtime (gitignored)
└── public/
    ├── index.html     # shell app + tab
    ├── styles.css
    ├── data.js        # data game dari PDF: class, deck, skill, lineage, peta, emoji
    └── app.js         # semua logika frontend (creator, sheet, deck, dadu, chat, peta)
```

## Verifikasi lokal (sudah dilakukan 2026-11-25)

Server dinyalakan di port uji: `/api/health` OK, halaman & asset 200, karakter/chat/roll dibuat lewat API, jam in-game dimajukan → status ID otomatis jadi `owned`, server di-restart → **semua data tetap ada** (karakter, pesan, roll, jam). Data uji sudah dibersihkan; database produksi mulai kosong.
