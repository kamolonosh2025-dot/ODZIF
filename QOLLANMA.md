# Murojaatlarni saqlashni ulash (Google Sheets, bepul)

Sayt hozir **sinov rejimida**: murojaatlar faqat yuborilgan telefonning o'zida saqlanadi. Hamma mijozlarning murojaatlari sizning admin panelingizga tushishi uchun bir marta quyidagilarni qiling (10 daqiqa):

1. **Google Sheets oching:** https://sheets.new — yangi jadval ochiladi. Nomini "Kamolon Osh murojaatlar" qo'ying.
2. Menyuda **Kengaytmalar → Apps Script** (Расширения → Apps Script) ni bosing.
3. Ochilgan oynadagi hamma yozuvni o'chirib, `apps-script/Code.gs` faylidagi kodni to'liq joylang.
4. Kod tepasidagi `const PIN = "1234";` qatorida **1234** o'rniga o'z PIN kodingizni yozing.
5. **Saqlash** (disk belgisi) ni bosing.
6. O'ng tepada **Joylashtirish → Yangi joylashtirish** (Развертывание → Новое развертывание) ni bosing:
   - Turi: **Veb-ilova** (Веб-приложение)
   - Kim nomidan ishlaydi: **Men**
   - Kimga ruxsat: **Hamma** (Все)
   - **Joylashtirish** ni bosing, Google ruxsat so'rasa **Ruxsat berish** ni bosing.
7. Chiqqan **Veb-ilova havolasini** (`https://script.google.com/macros/s/.../exec`) nusxalab, menga yuboring. Men uni saytga ulayman.

Shundan keyin har bir murojaat jadvalga o'z bo'limiga (Fikrlar, G'oyalar, Hamkorlik, Rahbariyat) vaqti bilan yoziladi va admin panelda ko'rinadi.

## Ixtiyoriy: murojaatlar Telegram'ga ham kelsin
`TG_TOKEN` ga botingiz tokenini (@BotFather), `TG_CHAT_ID` ga xabar keladigan chat ID sini yozing va qaytadan **Joylashtirish → Joylashtirishlarni boshqarish → Tahrirlash → Yangi versiya** qiling. Token saytga emas, faqat Google'ga yoziladi, shuning uchun xavfsiz.
