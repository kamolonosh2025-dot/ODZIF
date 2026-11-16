// Kamolon Osh markazi — murojaatlarni Google Sheets'ga saqlash
// O'rnatish: QOLLANMA.md ga qarang.

const PIN = "1234";        // Admin panel PIN kodi — albatta o'zgartiring!
const TG_TOKEN = "";        // Ixtiyoriy: Telegram bot tokeni (@BotFather'dan)
const TG_CHAT_ID = "";      // Ixtiyoriy: xabarlar boradigan chat/guruh ID

const SHEETS = { review: "Fikrlar", idea: "G'oyalar", partner: "Hamkorlik", problem: "Rahbariyat" };
// Chek surati jadvalning o'zida saqlanadi (Google Drive kerak emas).
// Bitta katakka 50 000 belgigacha sig'adi, shuning uchun surat 4 ta katakka bo'lib yoziladi.
const PHOTO_COLS = ["photo", "photo2", "photo3", "photo4"];
const CHUNK = 45000;
const HEAD = ["id", "time", "lang", "branch", "table", "food", "service", "atmos", "name", "phone", "company", "msg",
              "nps", "when", "speed", "polite", "clean", "manager", "first"].concat(PHOTO_COLS);

// Ruxsat berish uchun BIR MARTA ishga tushiring (Выполнить). Faqat shu jadvalga kirish so'raladi.
function tekshirish() {
  Logger.log("Tayyor! Jadval: " + SpreadsheetApp.getActiveSpreadsheet().getName());
}

function sheetFor(cat) {
  const name = SHEETS[cat];
  if (!name) throw new Error("cat");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(HEAD); sh.setFrozenRows(1); }
  else if (sh.getLastColumn() < HEAD.length) sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]); // yangi ustunlar
  return sh;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Jadvalda formula bo'lib qolmasligi uchun
function clean(v) {
  const s = String(v == null ? "" : v).slice(0, 4000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === "delete") return deleteRow(data);
    const x = data.entry || {};
    const sh = sheetFor(x.cat);
    const id = Utilities.getUuid();
    const time = new Date().toISOString();
    const photo = /^data:image\//.test(String(x.photo || "")) ? String(x.photo).slice(0, CHUNK * PHOTO_COLS.length) : "";
    const row = HEAD.map(function (h) {
      const k = PHOTO_COLS.indexOf(h);
      if (k >= 0) return photo.slice(k * CHUNK, (k + 1) * CHUNK);
      return clean(h === "id" ? id : h === "time" ? time : x[h]);
    });
    sh.appendRow(row);
    if (TG_TOKEN && TG_CHAT_ID && data.text) {
      try {
        UrlFetchApp.fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendMessage", {
          method: "post", payload: { chat_id: TG_CHAT_ID, text: String(data.text).slice(0, 4000) }, muteHttpExceptions: true
        });
      } catch (err) {}
    }
    return out({ ok: true, id: id, time: time });
  } catch (err) {
    return out({ ok: false, error: String(err.message || err) });
  }
}

// Admin paneldan murojaatni o'chirish (id bo'yicha)
function deleteRow(data) {
  if (data.pin !== PIN) return out({ ok: false, error: "pin" });
  const sh = sheetFor(data.cat);
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (let i = ids.length - 1; i >= 1; i--) {
    if (String(ids[i][0]) === String(data.id)) { sh.deleteRow(i + 1); return out({ ok: true }); }
  }
  return out({ ok: true, missing: true });
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.action !== "list" && p.action !== "photo") return out({ ok: true });
  if (p.pin !== PIN) return out({ ok: false, error: "pin" });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const p0 = HEAD.indexOf("photo");

  // Bitta chek surati (admin panel kerak bo'lganda so'raydi)
  if (p.action === "photo") {
    const sh = ss.getSheetByName(SHEETS[p.cat] || "");
    if (!sh) return out({ ok: false, error: "cat" });
    const v = sh.getDataRange().getValues();
    for (let i = 1; i < v.length; i++) {
      if (String(v[i][0]) === String(p.id)) {
        return out({ ok: true, data: PHOTO_COLS.map(function (c, k) { return String(v[i][p0 + k] || ""); }).join("") });
      }
    }
    return out({ ok: false, error: "missing" });
  }

  // Ro'yxat: suratning o'zi emas, faqat "bor" belgisi yuboriladi (tez yuklanishi uchun)
  const res = {};
  Object.keys(SHEETS).forEach(function (cat) {
    res[cat] = [];
    const sh = ss.getSheetByName(SHEETS[cat]);
    if (!sh) return;
    const v = sh.getDataRange().getValues();
    for (let i = 1; i < v.length; i++) {
      const r = { cat: cat };
      HEAD.forEach(function (h, j) {
        if (PHOTO_COLS.indexOf(h) >= 0) return;
        const c = v[i][j]; r[h] = c instanceof Date ? c.toISOString() : c;
      });
      const ph = String(v[i][p0] || "");
      r.photo = /^data:image\//.test(ph) ? "db" : ph;
      res[cat].push(r);
    }
    res[cat].reverse();
  });
  return out({ ok: true, entries: res });
}
