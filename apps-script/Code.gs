// Kamolon Osh markazi — murojaatlarni Google Sheets'ga saqlash
// O'rnatish: QOLLANMA.md ga qarang.

const PIN = "1234";        // Admin panel PIN kodi — albatta o'zgartiring!
const TG_TOKEN = "";        // Ixtiyoriy: Telegram bot tokeni (@BotFather'dan)
const TG_CHAT_ID = "";      // Ixtiyoriy: xabarlar boradigan chat/guruh ID

const SHEETS = { review: "Fikrlar", idea: "G'oyalar", partner: "Hamkorlik", problem: "Taklif va shikoyatlar", job: "Ishga taklif" };
const OLD_NAMES = { problem: "Rahbariyat" }; // eski nom bo'lsa, o'zi qayta nomlanadi
// Chek surati jadvalning o'zida saqlanadi (Google Drive kerak emas).
// Bitta katakka 50 000 belgigacha sig'adi, shuning uchun surat 4 ta katakka bo'lib yoziladi.
const PHOTO_COLS = ["photo", "photo2", "photo3", "photo4"];
const CHUNK = 45000;
const HEAD = ["id", "time", "lang", "branch", "table", "food", "service", "atmos", "name", "phone", "company", "msg",
              "nps", "when", "speed", "polite", "clean", "manager", "first"].concat(PHOTO_COLS).concat(["age", "position"]);

// ===== Jadval ko'rinishi (brendbuk ranglari) =====
const STYLE_VERSION = "3";
const LABELS = {
  id: "ID", time: "Vaqt", lang: "Til", branch: "Filial", table: "Stol", food: "Ta'm", service: "Xizmat", atmos: "Muhit",
  name: "Ism", phone: "Telefon", company: "Kompaniya", msg: "Xabar", nps: "Tavsiya (0-10)", when: "Yana qachon keladi",
  speed: "Buyurtma tezligi", polite: "Xushmuomalalik", clean: "Tozalik", manager: "Menejer keldimi", first: "Birinchi marta",
  photo: "Chek surati", photo2: "Chek 2", photo3: "Chek 3", photo4: "Chek 4", age: "Yoshi", position: "Lavozim"
};
const LABELS_JOB = { photo: "Rasmi", photo2: "Rasm 2", photo3: "Rasm 3", photo4: "Rasm 4" };
function headLabels(cat) { return HEAD.map(function (h) { return (cat === "job" && LABELS_JOB[h]) || LABELS[h] || h; }); }
const SHEET_COLOR = { review: ["#023181", "#FFFFFF"], problem: ["#FF7C10", "#FFFFFF"], partner: ["#19C0E9", "#023181"], idea: ["#EFBF48", "#023181"], job: ["#0B1A3A", "#39FF14"] };
const BAND = { review: "#EEF3FC", problem: "#FFF3E8", partner: "#E8F8FD", idea: "#FDF6E3", job: "#EFFFEA" };
// Har bir varaqda ko'rinadigan ustunlar (qolganlari yashiriladi, lekin o'chirilmaydi)
const SHOW = {
  review: ["time", "branch", "table", "nps", "food", "speed", "polite", "service", "clean", "when", "first", "photo"],
  problem: ["time", "name", "phone", "msg"],
  partner: ["time", "name", "phone", "company", "msg"],
  idea: ["time", "name", "phone", "msg"],
  job: ["time", "name", "age", "position", "phone", "photo"]
};
const WIDTH = { time: 135, branch: 110, table: 60, name: 140, phone: 135, company: 170, msg: 420, nps: 105, when: 140, first: 115, photo: 95, age: 60, position: 170 };
const RATE5 = ["food", "service", "atmos", "speed", "polite", "clean"];

function colLetter(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; }

function bezash(sh, cat) {
  const n = HEAD.length, max = Math.max(sh.getMaxRows(), 1000);
  if (sh.getMaxRows() < max) sh.insertRowsAfter(sh.getMaxRows(), max - sh.getMaxRows());
  if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());
  const c = SHEET_COLOR[cat] || SHEET_COLOR.review;
  sh.getRange(1, 1, 1, n).setValues([headLabels(cat)])
    .setBackground(c[0]).setFontColor(c[1]).setFontWeight("bold").setFontSize(11)
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sh.setRowHeight(1, 42);
  sh.setFrozenRows(1);
  const body = sh.getRange(2, 1, max - 1, n);
  body.setVerticalAlignment("middle").setFontSize(10).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  sh.getBandings().forEach(function (b) { b.remove(); });
  const band = sh.getRange(1, 1, max, n).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  band.setHeaderRowColor(c[0]).setFirstRowColor("#FFFFFF").setSecondRowColor(BAND[cat] || "#F5F7FB");
  const show = SHOW[cat] || HEAD;
  HEAD.forEach(function (h, i) {
    const col = i + 1;
    if (show.indexOf(h) >= 0) { sh.showColumns(col); sh.setColumnWidth(col, WIDTH[h] || 110); }
    else sh.hideColumns(col);
  });
  const ix = function (h) { return HEAD.indexOf(h) + 1; };
  sh.getRange(2, ix("time"), max - 1, 1).setNumberFormat("dd.mm.yyyy hh:mm").setHorizontalAlignment("center");
  sh.getRange(2, ix("msg"), max - 1, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sh.getRange(2, ix("branch"), max - 1, 1).setFontWeight("bold").setFontColor("#023181");
  ["table", "age", "nps", "when", "first", "food", "service", "atmos", "speed", "polite", "clean", "manager"].forEach(function (h) {
    sh.getRange(2, ix(h), max - 1, 1).setHorizontalAlignment("center");
  });
  RATE5.forEach(function (h) { sh.getRange(2, ix(h), max - 1, 1).setNumberFormat('0" ★"').setFontWeight("bold"); });
  // Baholar rangi: 1-2 qizil, 3 sariq, 4-5 yashil; tavsiya: 0-6 qizil, 7-8 sariq, 9-10 yashil
  const rules = [];
  function add(h, f, bg, fg) {
    const L = colLetter(ix(h));
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied("=AND(" + L + "2<>\"\"," + f.replace(/X/g, "VALUE(" + L + "2)") + ")")
      .setBackground(bg).setFontColor(fg).setRanges([sh.getRange(2, ix(h), max - 1, 1)]).build());
  }
  RATE5.forEach(function (h) {
    add(h, "X<=2", "#FDE2E1", "#B3261E"); add(h, "X=3", "#FFF4CC", "#8A5A00"); add(h, "X>=4", "#DDF5E4", "#1B6B3A");
  });
  add("nps", "X<=6", "#FDE2E1", "#B3261E"); add("nps", "AND(X>=7,X<=8)", "#FFF4CC", "#8A5A00"); add("nps", "X>=9", "#DDF5E4", "#1B6B3A");
  sh.setConditionalFormatRules(rules);
  // Chek surati bor-yo'qligi: katakdagi uzun matn ko'rinmaydi, faqat yashil belgi
  const P = colLetter(ix("photo"));
  sh.getRange(2, ix("photo"), max - 1, 1).setFontColor("#FFFFFF").setFontSize(6);
  sh.setConditionalFormatRules(sh.getConditionalFormatRules().concat([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied("=LEN(" + P + "2)>0").setBackground("#DDF5E4")
      .setRanges([sh.getRange(2, ix("photo"), max - 1, 1)]).build()
  ]));
  sh.setTabColor(c[0]);
}

// Hamma varaqlarni bir marta bezash (menyudan ham ishga tushirish mumkin)
function jadvalniBezash() {
  Object.keys(SHEETS).forEach(function (cat) {
    const sh = findSheet(cat);
    if (sh) bezash(sh, cat);
  });
  PropertiesService.getScriptProperties().setProperty("style", STYLE_VERSION);
}

function findSheet(cat) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEETS[cat]);
  if (!sh && OLD_NAMES[cat]) { sh = ss.getSheetByName(OLD_NAMES[cat]); if (sh) sh.setName(SHEETS[cat]); }
  return sh;
}

// Ruxsat berish uchun BIR MARTA ishga tushiring (Выполнить). Faqat shu jadvalga kirish so'raladi.
function tekshirish() {
  const name = SpreadsheetApp.getActiveSpreadsheet().getName();
  Logger.log("Tayyor! Jadval: " + name);
  try { SpreadsheetApp.getUi().alert("Tayyor! Ruxsat berildi. Endi Apps Script'da Новая версия bilan qayta joylang."); } catch (e) {}
}

// Jadval ochilganda tepada "Kamolon Osh" menyusi chiqadi: ruxsatni jadvalning o'zidan berish mumkin
function onOpen() {
  SpreadsheetApp.getUi().createMenu("Kamolon Osh").addItem("Ruxsat berish", "tekshirish").addItem("Jadvalni bezash", "jadvalniBezash").addToUi();
}

function sheetFor(cat) {
  const name = SHEETS[cat];
  if (!name) throw new Error("cat");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = findSheet(cat);
  if (!sh) { sh = ss.insertSheet(name); bezash(sh, cat); }
  else if (sh.getLastColumn() < HEAD.length) sh.getRange(1, 1, 1, HEAD.length).setValues([headLabels(cat)]); // yangi ustunlar
  return sh;
}

// Admin panel yangi ma'lumotni darhol bilishi uchun "o'zgarish belgisi"
function bump() { try { PropertiesService.getScriptProperties().setProperty("stamp", String(Date.now())); } catch (e) {} }

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
    if (data.action === "delete") return withLock(function () { return deleteRow(data); });
    if (data.action === "deleteMany") return withLock(function () { return deleteMany(data); });
    const x = data.entry || {};
    const sh = sheetFor(x.cat);
    const id = Utilities.getUuid();
    const time = new Date().toISOString();
    const photo = /^data:image\//.test(String(x.photo || "")) ? String(x.photo).slice(0, CHUNK * PHOTO_COLS.length) : "";
    const row = HEAD.map(function (h) {
      const k = PHOTO_COLS.indexOf(h);
      if (k >= 0) return photo.slice(k * CHUNK, (k + 1) * CHUNK);
      if (h === "time") return new Date(time);
      if ((RATE5.indexOf(h) >= 0 || h === "nps" || h === "table" || h === "age") && /^\d{1,3}$/.test(String(x[h]))) return Number(x[h]);
      return clean(h === "id" ? id : x[h]);
    });
    if (PropertiesService.getScriptProperties().getProperty("style") !== STYLE_VERSION) { try { jadvalniBezash(); } catch (er) {} }
    sh.appendRow(row);
    bump();
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

// O'chirishlar navbat bilan bajariladi (bir vaqtda ikkita o'chirish qatorlarni chalkashtirmasin)
function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// Admin paneldan bir nechta murojaatni bittada o'chirish (kun / hafta / oy)
function deleteMany(data) {
  if (data.pin !== PIN) return out({ ok: false, error: "pin" });
  const sh = sheetFor(data.cat);
  const want = {};
  (data.ids || []).forEach(function (id) { want[String(id)] = true; });
  const last = sh.getLastRow();
  if (last < 2) return out({ ok: true, deleted: 0 });
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  if (sh.getMaxRows() <= last) sh.insertRowsAfter(last, 1); // hamma qatorni o'chirganda ham jadval buzilmasin
  let n = 0, i = ids.length - 1;
  // pastdan yuqoriga, ketma-ket qatorlarni bitta amal bilan o'chiramiz (tez)
  while (i >= 0) {
    if (!want[String(ids[i][0])]) { i--; continue; }
    let j = i;
    while (j - 1 >= 0 && want[String(ids[j - 1][0])]) j--;
    sh.deleteRows(j + 2, i - j + 1);
    n += i - j + 1;
    i = j - 1;
  }
  if (n) bump();
  return out({ ok: true, deleted: n });
}

// Admin paneldan murojaatni o'chirish (id bo'yicha)
function deleteRow(data) {
  if (data.pin !== PIN) return out({ ok: false, error: "pin" });
  const sh = sheetFor(data.cat);
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (let i = ids.length - 1; i >= 1; i--) {
    if (String(ids[i][0]) === String(data.id)) { sh.deleteRow(i + 1); bump(); return out({ ok: true }); }
  }
  return out({ ok: true, missing: true });
}

function doGet(e) {
  const p = e.parameter || {};
  if (p.action === "stamp") return out({ ok: true, s: PropertiesService.getScriptProperties().getProperty("stamp") || "0" });
  if (p.action !== "list" && p.action !== "photo") return out({ ok: true });
  if (p.pin !== PIN) return out({ ok: false, error: "pin" });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const p0 = HEAD.indexOf("photo");

  // Bitta chek surati (admin panel kerak bo'lganda so'raydi)
  if (p.action === "photo") {
    const sh = SHEETS[p.cat] ? findSheet(p.cat) : null;
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
    const sh = findSheet(cat);
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
