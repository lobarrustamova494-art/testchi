# Letter Visibility Test Documentation

## Maqsad
Bu test AI ning harf ko'rinishi asosida belgilashni qanchalik to'g'ri aniqlashini tekshiradi.

## Asosiy Qoida
**Agar aylana ichidagi harf (A, B, C, D, E) ko'rinmasa yoki aniq o'qilmasa → FILLED**
**Agar aylana ichidagi harf aniq ko'rinsa va hech qanday belgi bo'lmasa → EMPTY**

## Test Holatlari

### 1. Harf Butunlay Ko'rinmaydi
- **Holat**: Aylana qora bo'yalgan, harf butunlay yashiringan
- **Kutilgan natija**: FILLED
- **Sabab**: Harf ko'rinmaydi, demak belgilangan

### 2. Harf Zaif Ko'rinadi
- **Holat**: Aylana kulrang bo'yalgan, harf aniq emas
- **Kutilgan natija**: FILLED
- **Sabab**: Harf aniq o'qilmaydi

### 3. Harf Qisman Yashiringan
- **Holat**: Belgilash harf ustida, qisman ko'rinadi
- **Kutilgan natija**: FILLED
- **Sabab**: Harf to'liq ko'rinmaydi

### 4. Og'ir Belgilash
- **Holat**: Ko'p marta belgilangan, harf butunlay yashiringan
- **Kutilgan natija**: FILLED
- **Sabab**: Harf ko'rinmaydi

### 5. Engil Belgilash
- **Holat**: Engil belgilash, harf qisman ko'rinadi
- **Kutilgan natija**: FILLED
- **Sabab**: Harf aniq o'qilmaydi

### 6. Harf Aniq Ko'rinadi
- **Holat**: Oq fon, harf aniq va o'qiladi
- **Kutilgan natija**: EMPTY
- **Sabab**: Harf aniq ko'rinadi va belgi yo'q

## Test Natijalari

### Muvaffaqiyat Mezonlari
- **80%+ aniqlik** - Yaxshi
- **90%+ aniqlik** - A'lo
- **100% aniqlik** - Mukammal

### Xato Turlari
1. **False Positive**: EMPTY ni FILLED deb aniqlash
2. **False Negative**: FILLED ni EMPTY deb aniqlash

### Yaxshilash Takliflari
- Agar aniqlik 80% dan past bo'lsa, AI prompt ni yangilash kerak
- Harf ko'rinishi qoidasini yanada aniqroq tushuntirish
- Ko'proq misol va vizual ko'rsatmalar berish

## Texnik Detallari

### AI Model
- **Model**: meta-llama/llama-4-scout-17b-16e-instruct
- **Temperature**: 0.0 (deterministic)
- **Seed**: 42 (fixed)

### Prompt Qismlari
1. **Letter Visibility Rule** - asosiy qoida
2. **Visual Examples** - ko'rgazmali misollar  
3. **Detection Priority** - aniqlash tartibi
4. **Quality Control** - sifat nazorati

### Test Metodologiyasi
1. Turli harf ko'rinishi holatlarini yaratish
2. Har bir holat uchun kutilgan natijani belgilash
3. AI tahlilini ishga tushirish
4. Natijalarni taqqoslash va aniqlikni hisoblash
5. Xatolarni tahlil qilish va yaxshilash takliflarini berish

## Foydalanish

### Test Ishga Tushirish
1. `letter-visibility-test.html` faylini brauzerda oching
2. "Letter Visibility Test" tugmasini bosing
3. Natijalarni kuting va tahlil qiling

### Test Ma'lumotlari
- **Test vaqti**: ~10-15 soniya
- **Test holatlari**: 5 ta
- **Kutilgan aniqlik**: 80%+

## Xulosa
Bu test AI ning harf ko'rinishi asosida belgilashni qanchalik to'g'ri aniqlashini ko'rsatadi. Bu juda muhim, chunki real OMR varaqlarida talabalar turli xil belgilash uslublarini ishlatishadi va ba'zan harf ko'rinmay qolishi mumkin.