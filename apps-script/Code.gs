// Kamolon Osh markazi — murojaatlarni Google Sheets'ga saqlash
// O'rnatish: QOLLANMA.md ga qarang.

const PIN = "1234";        // Admin panel PIN kodi — albatta o'zgartiring!
const TG_TOKEN = "";        // Ixtiyoriy: Telegram bot tokeni (@BotFather'dan)
const TG_CHAT_ID = "";      // Ixtiyoriy: xabarlar boradigan chat/guruh ID

const SHEETS = { review: "Fikrlar", idea: "G'oyalar", partner: "Hamkorlik", problem: "Rahbariyat" };
const HEAD = ["id", "time", "lang", "branch", "table", "food", "service", "atmos", "name", "phone", "company", "msg",
              "nps", "when", "speed", "polite", "clean", "manager", "first", "photo"];
const PHOTO_FOLDER = "Kamolon Osh — cheklar"; // Chek suratlari Google Drive'dagi shu papkaga saqlanadi

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
    let photo = "";
    if (x.photo && /^data:image\//.test(x.photo)) { try { photo = savePhoto(x.photo); } catch (err) { photo = "XATO: " + String(err.message || err).slice(0, 200); } }
    const row = HEAD.map(function (h) { return h === "id" ? id : h === "time" ? time : h === "photo" ? photo : x[h]; });
    sh.appendRow(row.map(clean));
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

// BIR MARTA ishga tushiring (Выполнить): Google Drive'ga ruxsat berish uchun.
// Shundan keyin chek suratlari Drive'ga saqlana boshlaydi.
function ruxsatBerish() {
  const it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
  Logger.log("Tayyor! Papka: " + folder.getUrl());
}

// Chek suratini Drive'ga saqlab, havolasini qaytaradi
function savePhoto(dataUrl) {
  const m = String(dataUrl).match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!m) return "";
  const it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
  const name = "chek_" + Utilities.formatDate(new Date(), "Asia/Tashkent", "yyyy-MM-dd_HH-mm-ss") + ".jpg";
  const f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name));
  try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) {}
  return "https://drive.google.com/file/d/" + f.getId() + "/view";
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
  if (p.action !== "list") return out({ ok: true });
  if (p.pin !== PIN) return out({ ok: false, error: "pin" });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const res = {};
  Object.keys(SHEETS).forEach(function (cat) {
    res[cat] = [];
    const sh = ss.getSheetByName(SHEETS[cat]);
    if (!sh) return;
    const v = sh.getDataRange().getValues();
    for (let i = 1; i < v.length; i++) {
      const r = { cat: cat };
      HEAD.forEach(function (h, j) { const c = v[i][j]; r[h] = c instanceof Date ? c.toISOString() : c; });
      res[cat].push(r);
    }
    res[cat].reverse();
  });
  return out({ ok: true, entries: res });
}
