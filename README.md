# Stitch OMR - Imtihon Boshqaruv Tizimi

OMR (Optical Mark Recognition) imtihon boshqaruv tizimi TypeScript va React yordamida qurilgan.

## Deploy

### Render.com da deploy qilish

1. **GitHub repository ni Render.com ga ulang**
2. **Frontend uchun Static Site yarating:**
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment Variables:
     - `VITE_API_URL`: Backend URL manzili

3. **Backend uchun Web Service yarating:**
   - Build Command: `cd server && npm install && npm run build`
   - Start Command: `cd server && npm start`
   - Environment Variables:
     - `NODE_ENV`: production
     - `PORT`: 10000
     - `MONGODB_URI`: MongoDB connection string
     - `JWT_SECRET`: JWT secret key
     - `JWT_EXPIRES_IN`: 7d
     - `FRONTEND_URL`: Frontend URL manzili

4. **MongoDB Atlas database yarating va connection string ni qo'shing**

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.onrender.com/api
```

### Backend (server/.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/omr_system
PORT=10000
NODE_ENV=production
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend-url.onrender.com
```

## Xususiyatlar

- **Admin Boshqaruv Paneli** - asosiy boshqaruv paneli
- **Imtihon Yaratish** - imtihon yaratish interfeysi
- **OMR Varaq Yaratish** - OMR varaqlarini yaratish
- **Skan Yuklash Interfeysi** - skanerlangan varaqlarni yuklash
- **Backend API** - MongoDB bilan to'liq backend server

## Texnologiyalar

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router DOM
- Lucide React (ikonlar)
- jsPDF & html2canvas (PDF/WebP export)

### Backend
- Node.js
- Express.js
- TypeScript
- MongoDB (Mongoose)
- JWT Authentication
- Joi Validation
- Helmet (Security)
- CORS

## O'rnatish

### Frontend
```bash
npm install
```

### Backend
```bash
cd server
npm install
```

## Konfiguratsiya

### Backend Environment Variables
`server/.env` faylini yarating:
```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:5173
```

## Ishga tushirish

### Backend serverni ishga tushirish
```bash
cd server
npm run dev
```
Server `http://localhost:5000` da ishga tushadi.

### Frontend ishga tushirish
```bash
npm run dev
```
Frontend `http://localhost:5173` da ishga tushadi.

## API Endpoints

### Health Check
- `GET /api/health` - Server holatini tekshirish

### Authentication (kelgusida)
- `POST /api/auth/register` - Ro'yxatdan o'tish
- `POST /api/auth/login` - Kirish
- `GET /api/auth/me` - Foydalanuvchi ma'lumotlari

### Subjects (kelgusida)
- `GET /api/subjects` - Mavzular ro'yxati
- `POST /api/subjects` - Yangi mavzu yaratish
- `PUT /api/subjects/:id` - Mavzuni yangilash
- `DELETE /api/subjects/:id` - Mavzuni o'chirish

### Exams (kelgusida)
- `GET /api/exams` - Imtihonlar ro'yxati
- `POST /api/exams` - Yangi imtihon yaratish
- `PUT /api/exams/:id` - Imtihonni yangilash
- `DELETE /api/exams/:id` - Imtihonni o'chirish

## Ma'lumotlar bazasi modellari

### User
- Foydalanuvchi ma'lumotlari (admin, teacher, student)
- JWT authentication

### Subject
- Mavzu va bo'limlar
- Har bir bo'lim uchun savol turlari va baholash

### Exam
- Imtihon ma'lumotlari
- Mavzular bilan bog'lanish
- OMR konfiguratsiyasi

### Student
- O'quvchi ma'lumotlari
- Roll raqami va sinf ma'lumotlari

### OMRSheet
- Yaratilgan OMR varaqlar
- PDF/WebP fayllar

### ExamResult
- Imtihon natijalari
- Javoblar va ballar

## Loyiha strukturasi

```
├── src/                    # Frontend
│   ├── components/
│   │   ├── layout/
│   │   ├── ui/
│   │   └── OMRSheet.tsx
│   ├── pages/
│   ├── types/
│   ├── utils/
│   └── lib/
├── server/                 # Backend
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.ts
│   └── .env
└── README.md
```

## Sahifalar

1. **Boshqaruv Paneli (/)** - asosiy sahifa
2. **Imtihon Yaratish (/exam-creation)** - 3 bosqichli imtihon yaratish
3. **OMR Varaq Yaratish (/omr-generation)** - OMR varaq yaratish va export
4. **Skan Yuklash (/scan-upload)** - skan yuklash

## Export Xususiyatlari

- **PDF Export** - Yuqori sifatli PDF fayllar
- **WebP Export** - Optimallashtirilgan rasm fayllar
- **Ko'p sahifali PDF** - Bir nechta to'plamlar uchun
- **Progress tracking** - Yuklanish jarayoni ko'rsatkichi

## Tillar

Loyiha to'liq o'zbek tilida tayyorlangan va quyidagi xususiyatlarni o'z ichiga oladi:
- O'zbek tilidagi interfeys
- Mahalliy formatlar
- O'zbek tilidagi xabar va bildirishnomalar
- MongoDB ma'lumotlari o'zbek tilida

## Xavfsizlik

- Helmet.js - HTTP headers xavfsizligi
- Rate limiting - So'rovlar cheklash
- CORS - Cross-origin requests boshqaruvi
- JWT - Token-based authentication
- Input validation - Joi bilan ma'lumotlar tekshiruvi

## Development

```bash
# Frontend development
npm run dev

# Backend development
cd server && npm run dev

# Build frontend
npm run build

# Build backend
cd server && npm run build
```