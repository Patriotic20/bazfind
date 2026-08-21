# Bazmly API — to'liq qo'llanma

> Restoran va to'yxonalarni bron qilish platformasi.
> Bu hujjat **barcha 98 ta endpoint**ni tushuntiradi: har biri **nima uchun kerak**,
> **qanday ma'lumot yuboriladi**, **nima qaytadi** va **frontenddan qanday ulanadi**.

---

## Mundarija

1. [Tizim haqida umumiy tasavvur](#1-tizim-haqida-umumiy-tasavvur)
2. [Manzillar, muhit va ishga tushirish](#2-manzillar-muhit-va-ishga-tushirish)
3. [Autentifikatsiya — tokenlar qanday ishlaydi](#3-autentifikatsiya--tokenlar-qanday-ishlaydi)
4. [Xatoliklar — bitta konvert, barqaror kodlar](#4-xatoliklar--bitta-konvert-barqaror-kodlar)
5. [Umumiy qoidalar (hamma endpointga tegishli)](#5-umumiy-qoidalar-hamma-endpointga-tegishli)
6. [Ruxsatlar tizimi — rollar va permission'lar](#6-ruxsatlar-tizimi--rollar-va-permissionlar)
7. [API — modul bo'yicha to'liq ro'yxat](#7-api--modul-boyicha-toliq-royxat)
   - [7.1 Geo — viloyat va tumanlar](#71-geo--viloyat-va-tumanlar)
   - [7.2 Catalog — qulayliklar](#72-catalog--qulayliklar)
   - [7.3 Auth — ro'yxatdan o'tish va kirish](#73-auth--royxatdan-otish-va-kirish)
   - [7.4 Users — profil, qurilma, do'st, manzil](#74-users--profil-qurilma-dost-manzil)
   - [7.5 Venue Groups — tarmoq (brend)](#75-venue-groups--tarmoq-brend)
   - [7.6 Venues (mijoz) — qidiruv va muassasa sahifasi](#76-venues-mijoz--qidiruv-va-muassasa-sahifasi)
   - [7.7 Venue: Venues — filial boshqaruvi](#77-venue-venues--filial-boshqaruvi)
   - [7.8 Venue: Staff — hodimlar](#78-venue-staff--hodimlar)
   - [7.9 Venue: Menu — menyu konstruktori](#79-venue-menu--menyu-konstruktori)
   - [7.10 Services — qo'shimcha xizmatlar](#710-services--qoshimcha-xizmatlar)
   - [7.11 Bookings (mijoz) — bron qilish](#711-bookings-mijoz--bron-qilish)
   - [7.12 Venue: Bookings — kunlik navbat va QR](#712-venue-bookings--kunlik-navbat-va-qr)
   - [7.13 Venue: Orders — stollar, oshxona, cheklar](#713-venue-orders--stollar-oshxona-cheklar)
   - [7.14 Reviews — sharhlar va reyting](#714-reviews--sharhlar-va-reyting)
   - [7.15 Engagement — sevimlilar, chat, bildirishnomalar](#715-engagement--sevimlilar-chat-bildirishnomalar)
   - [7.16 Venue: Analytics — boshqaruv paneli](#716-venue-analytics--boshqaruv-paneli)
   - [7.17 Telegram — bot webhooki](#717-telegram--bot-webhooki)
8. [Frontendga ulash — amaliy qo'llanma](#8-frontendga-ulash--amaliy-qollanma)
9. [Tipik oqimlar (end-to-end senariylar)](#9-tipik-oqimlar-end-to-end-senariylar)
10. [Ma'lumotlar modeli — asosiy tushunchalar](#10-malumotlar-modeli--asosiy-tushunchalar)
11. [Tez-tez uchraydigan muammolar](#11-tez-tez-uchraydigan-muammolar)

---

## 1. Tizim haqida umumiy tasavvur

### Bu API nima uchun kerak

Bazmly — O'zbekistondagi **restoranlar** va **to'yxonalar**ni onlayn bron qilish
platformasi. API bitta backend, lekin **ikki xil foydalanuvchi**ga xizmat qiladi:

| Auditoriya | Kim | Yo'l prefiksi | Nima qiladi |
| --- | --- | --- | --- |
| **Mijoz ilovasi** | Oddiy foydalanuvchi | `/api/v1/<modul>` | Muassasa qidiradi, bron qiladi, sharh yozadi |
| **Boshqaruv paneli** | Muassasa egasi va hodimlar | `/api/v1/venue/...` | Filial, menyu, hodim, buyurtma, hisobot boshqaradi |

Shu sababli Swagger ham ikkiga ajratilgan:
- `/api/docs` — to'liq ro'yxat
- `/api/docs/admin` — faqat boshqaruv paneli yo'llari
- `/api/docs/app` — faqat mijoz ilovasi yo'llari

### Texnologiyalar

```
backend/    FastAPI (Python 3.14) + PostgreSQL/PostGIS + Redis + Alembic
frontend/   Next.js 16 (App Router) + TanStack Query + Tailwind v4
```

Frontend va backend **bitta qator kod ham baham ko'rmaydi** — ular faqat HTTP
orqali gaplashadi. Frontend backendning OpenAPI sxemasidan TypeScript tiplarini
generatsiya qiladi (`npm run gen:api`).

### Arxitektura tamoyillari (nima uchun shunday qilingan)

1. **Ruxsat token ichidagi da'vo (claim) orqali emas, `venue_staff` jadvalidagi
   yozuv orqali tekshiriladi.** Ya'ni hodimning rolini o'zgartirganingizda, u
   **darhol** kuchga kiradi — token muddati tugashini kutish shart emas.

2. **Har qanday xatolik bir xil ko'rinishda qaytadi**: `code`, `message`,
   `details`, `request_id`. Frontend doim `code` bo'yicha shart tuzishi kerak;
   `message` faqat ekranda ko'rsatish uchun.

3. **Pul va koordinatalar JSON'da satr (string) sifatida keladi.** To'yxona
   narxi o'nlab million so'm bo'lishi mumkin, JSON raqamlari esa IEEE double —
   yaxlitlash xatosi kelib chiqadi. Shuning uchun `Decimal` → `"45000000.00"`.

4. **Tarixiy yozuvlar "snapshot" qiladi.** Chekdagi taom nomi va narxi
   (`name_snapshot`, `unit_price`) buyurtma paytida muzlatiladi — menyu keyin
   o'zgarsa ham eski chek o'zgarmaydi.

---

## 2. Manzillar, muhit va ishga tushirish

### Lokal ishga tushirish (Docker)

```sh
cp .env.template .env          # host portlari
docker compose up --build
```

To'rt servis ko'tariladi: PostGIS, Redis, backend (migratsiyalar avval
bajariladi), frontend.

| Nima | Manzil |
| --- | --- |
| Frontend | http://localhost:3000 |
| API | http://localhost:8000/api |
| Swagger (to'liq) | http://localhost:8000/api/docs |
| Swagger (admin) | http://localhost:8000/api/docs/admin |
| Swagger (mijoz) | http://localhost:8000/api/docs/app |
| OpenAPI JSON | http://localhost:8000/api/openapi.json |

> ⚠️ Oddiy `postgres` image ishlamaydi. Birinchi migratsiya `postgis`,
> `btree_gist` va `pg_trgm` kengaytmalarini yaratadi — shuning uchun
> `docker-compose.yml` PostGIS build'iga mahkamlangan.

### Muhim muhit o'zgaruvchilari

**Backend** (`backend/.env`):

| O'zgaruvchi | Nima uchun |
| --- | --- |
| `APP_CONFIG__DATABASE__URL` | PostgreSQL manzili (majburiy, default yo'q) |
| `APP_CONFIG__CORS__ORIGINS` | Brauzer qaysi domendan chaqira olishi. Frontend domenini shu yerga yozing |
| `APP_CONFIG__SECURITY__SECRET_KEY` | Access token imzosi. Production'da default qiymat rad etiladi |
| `APP_CONFIG__SECURITY__ACCESS_TOKEN_TTL_MINUTES` | Default `15` |
| `APP_CONFIG__SECURITY__REFRESH_TOKEN_TTL_DAYS` | Default `30` |
| `APP_CONFIG__SECURITY__AUTH_MODE` | `enforced` (default) yoki `disabled` |
| `APP_CONFIG__TELEGRAM__BOT_TOKEN` | Telegram Mini App uchun. Bo'sh bo'lsa telegram-kirish o'chiq |
| `APP_CONFIG__TELEGRAM__WEBHOOK_SECRET` | Webhook uchun maxfiy kalit |
| `APP_CONFIG__ENV` | `local` / `staging` / `production` |

> 🔴 **`AUTH_MODE=disabled` — tizimdagi eng xavfli sozlama.** U autentifikatsiya
> **va** avtorizatsiyani butunlay o'chiradi. `ENV=local` bo'lmaganda dastur
> **ishga tushmaydi** (`app/core/auth_mode.py` uni lifespan'da tekshiradi).
> Bundan tashqari `SECURITY__DEV_USER_ID` ham berilishi shart, chunki `user.id`
> bronlar/buyurtmalar uchun foreign key.

**Frontend** (`frontend/.env.local`):

```sh
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

> ⚠️ `NEXT_PUBLIC_*` **build vaqtida** bundle ichiga yoziladi, runtime'da
> o'qilmaydi. Noto'g'ri qiymat bilan yig'ilgan konteynerni qayta ishga tushirish
> yordam bermaydi — uni qaytadan **build** qilish kerak.

---

## 3. Autentifikatsiya — tokenlar qanday ishlaydi

### Umumiy sxema

```
┌──────────┐  1. phone-check      ┌──────────┐
│ Frontend │ ───────────────────► │ Backend  │
│          │ ◄─────────────────── │          │  {registered, password_required}
│          │  2. login/register   │          │
│          │ ───────────────────► │          │
│          │ ◄─────────────────── │          │  TokenPair
│          │                      │          │
│          │  3. Authorization:   │          │
│          │     Bearer <access>  │          │
│          │ ───────────────────► │          │
└──────────┘                      └──────────┘
```

| Token | Muddati | Qayerda saqlanadi |
| --- | --- | --- |
| `access_token` (JWT) | 15 daqiqa | **Xotirada** (tab yopilsa yo'qoladi) |
| `refresh_token` (opaque) | 30 kun | `localStorage` |

**Nima uchun access token localStorage'da emas?** Backend cookie o'rnatmaydi va
brauzer cross-origin chaqiradi, shuning uchun httpOnly variant yo'q. Access token
xotirada — o'g'rilangan taqdirda ham tab yopilishi bilan o'ladi. Refresh token
esa har ishlatilganda **rotatsiya** qilinadi.

### 🔑 Eng muhim qoida: refresh **single-flight** bo'lishi shart

Backend refresh tokenni rotatsiya qiladi va **allaqachon ishlatilgan tokenning
qayta ishlatilishini o'g'irlik deb hisoblaydi** — bunda foydalanuvchining
**barcha** tokenlari bekor qilinadi.

Ya'ni: agar 10 ta so'rov bir vaqtda 401 olsa va har biri mustaqil ravishda
refresh qilsa — foydalanuvchi tizimdan **chiqib ketadi**, yangilanmaydi.

Yechim — bitta umumiy Promise (`src/lib/api/auth-tokens.ts`):

```ts
let inFlight: Promise<TokenPair> | null = null;

export function refreshSession(): Promise<TokenPair> {
  if (inFlight) return inFlight;              // ikkinchi chaqiruvchi kutadi
  inFlight = performRefresh().finally(() => { inFlight = null; });
  return inFlight;
}
```

> ⚠️ **Muvaffaqiyatsiz refresh — 403, 401 emas.** Bekor qilingan yoki muddati
> o'tgan refresh tokenga backend `403 permission_denied` javob beradi. 403'ni
> qayta urinish cheksiz sikl hosil qiladi — u "chiqib ketish" degani.

### Kirishning uch yo'li

| Yo'l | Kim uchun | Endpoint |
| --- | --- | --- |
| Telefon + (ixtiyoriy) parol | Oddiy mijoz | `POST /v1/auth/login` |
| Telegram `initData` | Mini App foydalanuvchisi | `POST /v1/auth/telegram` |
| Login + parol | Hodim (ofitsant, oshpaz...) | `POST /v1/auth/staff-login` |

**Nima uchun SMS/OTP yo'q?** Loyihadan ataylab olib tashlangan. Telefon raqamini
tasdiqlash Telegram orqali bo'ladi (`requestContact`), chunki Telegram raqamni
allaqachon tekshirgan.

---

## 4. Xatoliklar — bitta konvert, barqaror kodlar

Har qanday muvaffaqiyatsiz so'rov (shu jumladan 422) **aynan shu shakl**da
qaytadi:

```json
{
  "code": "table_already_booked",
  "message": "Bu stol shu vaqtga allaqachon band",
  "details": { "table_id": 12 },
  "request_id": "0f6f6b6e-..."
}
```

- **`code`** — barqaror inglizcha diskriminator. **Faqat shunga qarab shart tuzing.**
- **`message`** — o'zbekcha, ekranda ko'rsatish uchun. Hech qachon parse qilmang.
- **`request_id`** — `X-Request-ID` javob sarlavhasida ham keladi; server logidagi
  qatorga bog'lash uchun.

> ⚠️ Bu konvert OpenAPI sxemasida **yo'q**. Sxemada faqat muvaffaqiyatli javoblar
> va FastAPI'ning o'z `HTTPValidationError`'i (`{detail: [...]}`) e'lon qilingan —
> bu API hech qachon qaytarmaydigan shakl. Shu sababli frontendda `ApiError`
> **qo'lda** yozilgan (`src/lib/api/types.ts`).

### Barcha xatolik kodlari

| HTTP | `code` | Ma'nosi |
| --- | --- | --- |
| 400 | `bad_request` | So'rov noto'g'ri |
| 401 | `unauthenticated` / `unauthorized` | Token yo'q yoki yaroqsiz → qayta kiring |
| 403 | `permission_denied` / `forbidden` | Kim ekaningiz ma'lum, lekin ruxsat yo'q |
| 404 | `not_found` | Ma'lumot topilmadi |
| 409 | `phone_already_registered` | Bu raqam allaqachon ro'yxatda |
| 409 | `table_already_booked` | Stol shu vaqtga band |
| 409 | `venue_already_booked` | To'yxona o'sha kunga band |
| 409 | `table_has_open_order` | Stolda ochiq chek bor |
| 409 | `receipt_already_issued` | Chek allaqachon chiqarilgan |
| 409 | `already_reviewed` | Bu bronga sharh yozilgan |
| 409 | `group_already_exists` | Sizda allaqachon tarmoq bor |
| 409 | `integrity_error` | DB cheklovi buzildi |
| 422 | `validation_failed` / `validation_error` | So'rov tushunarli, biznes rad etdi |
| 422 | `venue_closed` | Muassasa o'sha vaqtda yopiq |
| 422 | `lead_time_too_short` | Bron juda kech qilinmoqda |
| 422 | `capacity_exceeded` | Mehmonlar soni sig'imdan ortiq |
| 422 | `deposit_required` | Oldindan to'lov talab qilinadi |
| 422 | `payment_incomplete` | Chek to'liq to'lanmagan |
| 422 | `booking_not_check_inable` | Bronni qayd etib bo'lmaydi |
| 429 | `too_many_attempts` | Urinishlar juda ko'p |
| 5xx | `internal_error` | Server xatosi |

**401 va 403 farqi muhim:** 401 — "qayta kiring va urinib ko'ring" (mobil
interceptor shunga qarab ishlaydi). 403 — "sizni bilamiz, baribir rad etamiz";
qayta kirish hech narsani o'zgartirmaydi (masalan, bloklangan akkaunt).

---

## 5. Umumiy qoidalar (hamma endpointga tegishli)

### 5.1 Pul, reyting va koordinatalar — **string**

```json
{ "base_price": "45000000.00", "rating_avg": "4.5", "latitude": "41.311081" }
```

Hech qachon `toFixed()` qilmang yoki `Number()` orqali o'tkazib qaytarmang.
`src/lib/api/money.ts` dagi yordamchilardan foydalaning:

```ts
formatUZS("45000000.00")  // "45 000 000 so'm"
formatRating("5.0")       // "5"
parseMoney("45000.50")    // 45000.5  — faqat hisob-kitob uchun
```

`distance_m` — istisno, u haqiqiy `number`.

### 5.2 Sahifalash konverti

```json
{ "items": [...], "total": 128, "limit": 20, "offset": 0 }
```

`page`, `size`, `has_next` **yo'q**. Parametrlar: `?limit=20&offset=0`
(`limit` maksimum 100).

### 5.3 Query'dagi massivlar — kalit takrorlanadi

```
?statuses=pending&statuses=confirmed     ✅ to'g'ri
?statuses=pending,confirmed              ❌ 422
```

FastAPI `list[BookingStatus] = Query()` ni aynan shunday o'qiydi.

### 5.4 `group_id` va `venue_id` — ruxsat tekshiruvining kaliti

Boshqaruv panelining deyarli har bir yo'li query'da `group_id` yoki `venue_id`
so'raydi. Bu shunchaki filtr emas — **ruxsat aynan shu identifikator bo'yicha
tekshiriladi**:

- `venue_id` — `PermissionRequired` guard'i uni yo'ldan (path) yoki query'dan
  o'qiydi va chaqiruvchining shu filialda tegishli `permission`'i borligini
  tekshiradi.
- `group_id` — `VerifiedGroupId` guard'i chaqiruvchi shu tarmoqda ishlashini
  tekshiradi. Aks holda istalgan foydalanuvchi URL'dan boshqa tarmoq ID'sini
  terib, uning hodimlar ro'yxatini o'qiy olardi.

**Guruh darajasidagi rollar** (`owner`, `admin`) tarmoqning **istalgan filiali**
uchun venue-darajasidagi tekshiruvdan o'tadi.

### 5.5 `PATCH` — bo'sh tana rad etiladi

Profil va shunga o'xshash `PATCH` so'rovlari noma'lum kalitlarni rad etadi
**va** bo'sh tanani ham rad etadi. Faqat o'zgargan maydonlarni yuboring.

### 5.6 `X-Request-ID`

Frontend har so'rovga o'zining `X-Request-ID` sarlavhasini qo'yadi. U javobda va
serverning har bir log qatorida qaytadi — foydalanuvchi shikoyatini log bilan
bog'lash uchun. Backend `expose_headers`da uni ochib qo'ygan, shuning uchun
brauzer JS'i uni o'qiy oladi.

### 5.7 Sxemada "himoyalangan", amalda ixtiyoriy

`GET /v1/venues/search` va `GET /v1/venues/{id}` OpenAPI'da `HTTPBearer` bilan
belgilangan — chunki `OptionalUser` dependency'si sxemani baribir e'lon qiladi.
Amalda ular **token'siz ham ishlaydi**. Frontendda bu `auth: "optional"` bilan
hal qilingan: token bo'lsa yuboriladi, bo'lmasa so'rov baribir jo'natiladi.

---

## 6. Ruxsatlar tizimi — rollar va permission'lar

Rollar `staff_roles` jadvalida, ularning ruxsatlari `staff_role_permissions`
orqali `permissions` bilan bog'langan. Rolning **scope**'i ikki xil:
`group` (butun tarmoq) yoki `venue` (bitta filial).

| Ruxsat | `owner` | `admin` | `manager` | `waiter` | `cook` | `cook_assistant` | `security` |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `branch.manage` | ✅ | ✅ | ✅ | | | | |
| `branch.create` | ✅ | ✅ | | | | | |
| `staff.manage` | ✅ | ✅ | ✅ | | | | |
| `menu.edit` | ✅ | ✅ | ✅ | | | | |
| `menu.publish` | ✅ | ✅ | ✅ | | | | |
| `orders.open` | ✅ | ✅ | ✅ | ✅ | | | |
| `orders.add_items` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| `orders.close` | ✅ | ✅ | ✅ | ✅ | | | |
| `orders.discount` | ✅ | ✅ | ✅ | | | | |
| `bookings.confirm` | ✅ | ✅ | ✅ | ✅ | | | ✅ |
| `bookings.cancel` | ✅ | ✅ | ✅ | | | | |
| `reports.view` | ✅ | ✅ | ✅ | | | | |
| `settings.edit` | ✅ | | | | | | |

**Nima uchun shunday:**
- `branch.create` faqat guruh darajasida — yangi filial ochish shartnoma va
  hisob-kitob masalasi, smena qarori emas.
- `settings.edit` faqat egasida — u logotip va valyutani o'zgartiradi, bular
  brend darajasidagi, butun tarmoqqa taalluqli qiymatlar.

---

## 7. API — modul bo'yicha to'liq ro'yxat

### Belgilar

- 🔓 — token talab qilinmaydi (ochiq)
- 🔑 — `Authorization: Bearer <access_token>` majburiy
- 🟡 — sxemada himoyalangan, amalda ixtiyoriy
- 🛡 — qo'shimcha `permission` tekshiriladi

---

### Holat tekshiruvi

#### 🔓 `GET /api/health`

**Nima uchun kerak:** Load balancer va monitoring uchun. Faqat "protsess tirik"
demaydi — Postgres'ga `SELECT 1` yuboradi. Bazaga yeta olmayotgan pod sog'lom
emas, va unga trafik yuborishda davom etish bitta buzilgan podni butun buzilgan
deploy'ga aylantiradi.

**Javob:**
```json
{ "status": "ok", "version": "1.0.0", "database": "up" }
```
`status` — `ok` yoki `degraded`; `database` — `up` yoki `down`.

---

### Interfeys tili — API da yo'q

Bu yerda ilgari `GET /v1/languages` turardi. U olib tashlandi va `users` dagi
`language_id` ustuni ham u bilan ketdi.

**Nima uchun:** kontent tarjimalar yig'ishtirilganidan beri faqat o'zbek tilida.
Ya'ni endpoint uz/en/ru ni taklif qilar, javob esa baribir o'zbekcha kelaverardi
— API bajara olmaydigan va'da. Ustun `NOT NULL` bo'lgani uchun ro'yxatdan o'tish
avval `uz` qatorini qidirishga majbur edi va u yo'q bo'lsa
"Asosiy til sozlanmagan" bilan yiqilardi: hech kim o'qimaydigan sozlama
tufayli ro'yxatdan o'tish butunlay to'xtardi.

**Endi qayerda:** interfeys tili — mijoz tomonining ishi. Frontend ro'yxatni
o'zida saqlaydi va tanlovni `localStorage` da (`bazmly.language`) yozadi.
Serverga hech narsa yuborilmaydi.

> Migratsiya: `d3c1a7f5e820`. `downgrade` jadvalni va uch qatorni tiklaydi va
> hamma foydalanuvchini `uz` ga qaratadi — lekin shaxsiy tanlovni qaytara
> olmaydi, chunki bu revizyadan keyin u saqlanadigan joy yo'q.

---

### 7.1 Geo — viloyat va tumanlar

Bu ma'lumotlar migratsiya bilan seed qilingan: **14 ta viloyat** va ular ostidagi
**209 ta tuman**. Ular deyarli hech qachon o'zgarmaydi — shuning uchun keshni
soatlar bilan o'lchang.

> Muhim: **tuman va shahar bir darajada** — bitta jadval, bitta sxema. API'da
> ikkalasi ham `district`.

#### 🔓 `GET /api/v1/regions`
**Nima uchun:** Manzil tanlash ekranining birinchi dropdown'i.
**Javob:** `RegionRead[]` — `{id, name, code}` (`code` = `UZ-TK` ko'rinishida).

#### 🔓 `GET /api/v1/regions/{region_id}/districts`
**Nima uchun:** Ikkinchi dropdown — tanlangan viloyatning tumanlari.
**Javob:** `DistrictRead[]` — `{id, region_id, name, latitude, longitude}`.

#### 🔓 `GET /api/v1/districts/nearest?lat={}&lng={}`
**Nima uchun kerak:** "Men qayerdaman?" Telefon bergan koordinatadan tuman va
viloyatni aniqlaydi, shunda mijoz ikkita dropdown'ni qo'lda kovlamaydi. **Ochiq**
— chunki manzil hisobdan oldin ham kerak bo'ladi.

**Parametrlar:** `lat` (−90…90), `lng` (−180…180) — ikkalasi majburiy.

**Javob:** `NearestDistrictRead`
```json
{ "district_id": 15, "district_name": "Chilonzor", "region_id": 1,
  "region_name": "Toshkent", "latitude": "41.27", "longitude": "69.20",
  "distance_m": 842.5 }
```

> ⚠️ Bu endpoint **doim** javob qaytaradi — 209 tadan eng yaqinini. Mamlakatdan
> tashqaridagi koordinata ham natija beradi. Shuning uchun `distance_m`ni
> tekshiring: yuzlab kilometr bo'lsa, mijozga ko'rsatmang.

#### 🔑 Administrator uchun (faqat admin)

| Metod | Yo'l | Tana | Nima qiladi |
| --- | --- | --- | --- |
| `POST` | `/v1/regions` | `{name, code}` | Viloyat qo'shish. `code` `^UZ-[A-Z]{2}$` shablonida |
| `PATCH` | `/v1/regions/{id}` | `{name?, code?}` | Viloyatni tahrirlash |
| `DELETE` | `/v1/regions/{id}` | — | O'chirish. **Tumanlari bor viloyat o'chmaydi** |
| `POST` | `/v1/districts` | `{region_id, name, latitude, longitude}` | Tuman qo'shish |
| `PATCH` | `/v1/districts/{id}` | barcha maydonlar ixtiyoriy | Tahrirlash |
| `DELETE` | `/v1/districts/{id}` | — | **Muassasalari yoki manzillari bor tuman o'chmaydi** |

`latitude` 36…46 oralig'ida, `longitude` 55…74 oralig'ida — O'zbekiston chegarasi.

---

### 7.2 Catalog — qulayliklar

#### 🔓 `GET /api/v1/amenities`

**Nima uchun kerak:** Filial yaratishda "Qulayliklar" checkbox'lari va
qidiruvdagi filtr uchun. Platforma belgilagan **yopiq ro'yxat**: parkovka, ovoz
tizimi, sahna, konditsioner, professional oshxona, Wi-Fi.

**Javob:** `AmenityRead[]` — `{id, slug, name, icon_url, sort_order}`.

Bu `id`'lar `VenueCreate.amenity_ids` massivida ishlatiladi.

---

### 7.3 Auth — ro'yxatdan o'tish va kirish

#### 🔓 `POST /api/v1/auth/phone-check`

**Nima uchun kerak:** Kirishning **birinchi qadami**. Foydalanuvchi raqamini bir
marta kiritadi va undan "sizda akkaunt bormi?" deb so'ralmaydi — server javob
beradi. Bu **autentifikatsiya emas**, faqat yo'nalish: token ham, foydalanuvchi
ma'lumoti ham qaytmaydi.

**Yuboriladi:** `{ "phone": "+998901234567" }`
Raqamni istalgan ko'rinishda yuboring — server normalizatsiya qiladi.

**Javob:** `PhoneCheckResult`
```json
{ "phone": "+998901234567", "registered": true, "password_required": false }
```

**Frontend mantiq:**
```
registered === false            → ro'yxatdan o'tish ekrani
registered && password_required → parol so'rash
registered && !password_required→ parolsiz kirish
```

#### 🔓 `POST /api/v1/auth/register`

**Nima uchun:** Telefondan keyingi qadam — ism va qolgan ma'lumot.

**Yuboriladi:** `PhoneRegister`
| Maydon | Tur | Majburiy | Izoh |
| --- | --- | :-: | --- |
| `phone` | string | ✅ | |
| `first_name` | string (1–100) | ✅ | |
| `last_name` | string (1–100) | ✅ | |
| `password` | string \| null | | **Ixtiyoriy.** Berilsa, keyingi kirishlarda talab qilinadi |
| `district_id` | int \| null | | |

**Javob (201):** `TokenPair` — pastga qarang.

#### 🔓 `POST /api/v1/auth/login`

**Yuboriladi:** `{ "phone": "...", "password": "..." | null }`
Akkauntda parol o'rnatilgan bo'lsa `password` majburiy.

**Javob:** `TokenPair`
```json
{
  "access_token": "eyJ...",
  "refresh_token": "8f3a...",
  "token_type": "bearer",
  "expires_in_seconds": 900,
  "user_id": 42,
  "must_change_password": false,
  "profile_completed": true
}
```
- `must_change_password: true` → hodim vaqtinchalik parol bilan kirdi, parolni
  almashtirish ekraniga yo'naltiring.
- `profile_completed: false` → `POST /v1/auth/complete-profile` ga yo'naltiring.

#### 🔓 `POST /api/v1/auth/telegram`

**Nima uchun kerak:** Telegram Mini App uchun yagona kirish yo'li. Parol ham,
tasdiqlash kodi ham talab qilinmaydi — noma'lum Telegram akkaunti birinchi
kelishida yangi foydalanuvchiga aylanadi.

**Yuboriladi:** `{ "init_data": "<Telegram bergan satr>" }` (maks. 4096 belgi)

> ⚠️ `initData`ni **o'zgartirmasdan**, aynan Telegram bergan holda yuboring.
> Imzo aynan shu satr uchun hisoblangan — uni qismlarga ajratib yoki qayta
> kodlab yuborish backend tomonidan rad etiladi.

Backend imzoni bot token'idan olingan kalit bilan tekshiradi va `auth_date`
yoshini `init_data_max_age_seconds` (default 24 soat) bilan cheklaydi — takroriy
hujumni to'xtatish uchun.

**Javob:** `TokenPair`.

Frontendda:
```ts
import { getInitData, isInsideTelegram } from "@/lib/telegram/webapp";
import { telegramLogin } from "@/lib/api/endpoints/auth";

if (isInsideTelegram()) {
  const initData = getInitData();
  if (initData) await telegramLogin(initData);
}
```

#### 🔑 `POST /api/v1/auth/telegram/contact`

**Nima uchun kerak:** Telegram orqali kirgan foydalanuvchining raqami dastlab
noma'lum. `Telegram.WebApp.requestContact()` javobini shu yerga uzatasiz —
imzo tekshirilgach raqam akkauntga biriktiriladi. **SMS yuborilmaydi**, chunki
raqamni Telegram allaqachon tekshirgan.

**Yuboriladi:** `{ "contact_data": "<requestContact javobi>" }` (o'zgartirilmagan)

**Javob:** yangilangan `UserRead` — ekranda saqlangan raqamni ko'rsatish uchun.

#### 🔑 `POST /api/v1/auth/complete-profile`

**Nima uchun:** Ismsiz yaratilgan akkauntlar (masalan Telegram orqali kelganlar)
uchun. Ism kiritilgach akkaunt `pending_profile` → `active` ga o'tadi.

Bu **yagona** endpoint `pending_profile` holatidagi tokenni qabul qiladi —
aks holda deadlock bo'lardi: aktiv bo'lmasdan ism qo'ya olmaysiz, ism
qo'ymasdan aktiv bo'la olmaysiz.

**Yuboriladi:** `UserProfileUpdate` — `{first_name, last_name, district_id?}`

#### 🔓 `POST /api/v1/auth/staff-login`

**Nima uchun:** Hodimlar telefon raqami bilan emas, egasi bergan **login** bilan
kiradi.

**Yuboriladi:** `{ "login": "ofitsant01", "password": "..." }`
**Javob:** `TokenPair` (odatda `must_change_password: true`).

#### 🔑 `POST /api/v1/auth/password`

**Yuboriladi:** `{ "current_password": "..." | null, "new_password": "..." }`
Parol allaqachon bor bo'lsa `current_password` majburiy.

**Javob:** `204`.

> Parol o'zgargach **boshqa barcha qurilmalardagi sessiyalar bekor qilinadi**.

#### 🔓 `POST /api/v1/auth/refresh`

**Yuboriladi:** `{ "refresh_token": "..." }`
**Javob:** yangi `TokenPair` (refresh ham yangilanadi — rotatsiya).

> ⚠️ Bekor qilingan token qayta ishlatilsa, o'sha foydalanuvchining **barcha**
> tokenlari bekor qilinadi. Shuning uchun refresh single-flight bo'lishi shart.

#### 🔑 `POST /api/v1/auth/logout`
**Yuboriladi:** `{ "refresh_token": "..." }` → `204`. Faqat shu qurilma.

Lokal tokenni o'chirishning o'zi yetarli emas — bazada 30 kunlik ishlaydigan
credential qolib ketadi.

#### 🔑 `POST /api/v1/auth/logout-all`
Tana yo'q → `204`. Akkauntning **barcha** refresh tokenlari bekor qilinadi.

---

### 7.4 Users — profil, qurilma, do'st, manzil

#### 🔑 `GET /api/v1/users/me`
**Nima uchun:** Sozlamalar ekranidagi profil kartasi.
**Javob:** `UserRead`
```json
{ "id": 42, "first_name": "Ali", "last_name": "Valiyev", "phone": "+998...",
  "email": null, "avatar_url": null, "district_id": 15,
  "role": "customer", "status": "active", "theme": "system",
  "created_at": "2026-01-01T10:00:00Z" }
```
`password_hash` va `login` **hech qachon** qaytmaydi.

`role`: `customer` | `venue_owner` | `venue_staff` | `moderator` | `admin`
`status`: `pending_profile` | `active` | `blocked` | `deleted`
`theme`: `system` | `light` | `dark`

#### 🔑 `PATCH /api/v1/users/me`
**Yuboriladi:** faqat o'zgarganlari — `first_name`, `last_name`, `email`,
`avatar_url`, `district_id`, `theme`.
Noma'lum kalit va **bo'sh tana** rad etiladi.

#### 🔑 `DELETE /api/v1/users/me`
Yumshoq o'chirish (`status: deleted`). Bronlar va to'lovlar hisobot uchun
saqlanib qoladi. → `204`.

#### 🔑 `GET /api/v1/users/me/devices` · `POST /api/v1/users/me/devices`
**Nima uchun:** Push bildirishnoma yuborish mumkin bo'lgan qurilmalar ro'yxati.

**POST tanasi:** `DeviceCreate`
```json
{ "device_uuid": "…", "platform": "ios", "app_version": "1.0.3",
  "push_token": "…" }
```
`platform`: `ios` | `android`. Bir xil `device_uuid` qayta yuborilsa, yangi qator
yaratilmaydi — push token **o'rnida yangilanadi** (idempotent).

`push_token` ro'yxatlarda qaytarilmaydi.

#### 🔑 Do'stlar

| Metod | Yo'l | Tana | Nima qiladi |
| --- | --- | --- | --- |
| `GET` | `/v1/users/me/friends` | — | Qabul qilingan do'stliklarning ikkinchi tomoni (`UserListItem[]`) |
| `POST` | `/v1/users/me/friends` | `{addressee_id}` | So'rov yuborish |
| `GET` | `/v1/users/me/friend-requests` | — | Sizdan javob kutayotgan so'rovlar |
| `POST` | `/v1/users/me/friends/{friendship_id}/accept` | `{accept: true\|false}` | Javob berish |

Faqat **so'rov yuborilgan** foydalanuvchi javob bera oladi.
`FriendshipStatus`: `pending` | `accepted` | `blocked`.

#### 🔑 Oxirgi manzillar

| Metod | Yo'l | Tana |
| --- | --- | --- |
| `GET` | `/v1/users/me/recent-locations` | — (eng yangisidan, ko'pi bilan 10 ta) |
| `POST` | `/v1/users/me/recent-locations` | `{district_id, label, latitude, longitude}` |

Bir tuman qayta tanlansa, mavjud yozuv **nusxalanmaydi** — u ro'yxatning tepasiga
ko'chadi.

---

### 7.5 Venue Groups — tarmoq (brend)

**Tarmoq (`venue_group`)** — bu brend; **filial (`venue`)** — uning bir nuqtasi.
Logotip va asosiy valyuta **tarmoqda** saqlanadi, filialda emas.

#### 🔑 `POST /api/v1/venue/groups`

**Nima uchun kerak:** Hamkor bo'lishning birinchi qadami. Tarmoq, uning
**birinchi filiali** va chaqiruvchining egalik yozuvi — **bitta tranzaksiyada**.

**Nima uchun ajratilmagan?** `venues.venue_group_id` — `NOT NULL`. Ikki so'rov
oralig'ida "filialsiz tarmoq" holati paydo bo'lardi va uni tozalash kimningdir
ishiga aylanardi.

**Yuboriladi:** `VenueGroupWithBranchCreate`
```json
{
  "group": {
    "primary_venue_type": "restoran",
    "name": "Osh Markazi",
    "description": null,
    "logo_url": null,
    "default_currency": "UZS"
  },
  "branch": {
    "district_id": 15,
    "street": "Bunyodkor",
    "house_number": "12A",
    "latitude": "41.285",
    "longitude": "69.204",
    "phone": "+998712000000",
    "name": "Osh Markazi — Chilonzor",
    "venue_type": "restoran",
    "amenity_ids": [1, 3, 5],
    "total_seats": 80,
    "capacity_min": 2,
    "capacity_max": 200,
    "base_price": "150000",
    "currency": "UZS",
    "min_advance_booking_days": 1,
    "late_grace_minutes": 40,
    "requires_deposit": false,
    "deposit_percent": null
  }
}
```

`venue_type`: **`restoran`** yoki **`toyxona`** — boshqa qiymat yo'q.

**Qo'shimcha nima bo'ladi:** filialda `ichkari` va `tashqari` zonalari avtomatik
ochiladi; joylashuv koordinatalardan PostGIS nuqtasi sifatida hisoblanadi.

**Javob (201):** `VenueGroupWithBranchesRead` — `{group, branches[]}`.

> ⚠️ **Bir egaga bitta tarmoq.** Takroriy so'rov `409 group_already_exists`.

#### 🔑 `GET /api/v1/venue/groups/me`
**Nima uchun:** "Bu foydalanuvchi hamkormi?" degan savolga javob. Hamkor emasligi
— **404**. Bu xato emas, javob. Frontendda `useSession()` shuni shunday
o'qiydi (`retry: false`).

#### 🔑 `GET /api/v1/venue/groups/{group_id}/branches`
**Javob:** `{group: VenueGroupRead, branches: BranchListItem[]}` —
`BranchListItem` = `{id, name, tagline, status}`.

#### 🔑🛡 `PATCH /api/v1/venue/groups/{group_id}?venue_id={}`
`settings.edit` ruxsati kerak (faqat `owner`).
**Yuboriladi:** `{name?, description?, primary_venue_type?, logo_url?, default_currency?, status?}`

`venue_id` query'da — ruxsatni tekshirish uchun. Tarmoq darajasidagi egasi
tarmoqning istalgan filiali bilan bu tekshiruvdan o'tadi.

---

### 7.6 Venues (mijoz) — qidiruv va muassasa sahifasi

#### 🟡 `GET /api/v1/venues/search`

**Nima uchun kerak:** **Bosh ekran.** Har bir karta uchun `distance_m` va
`is_open_now` bazada hisoblanadi.

**Parametrlar** (barchasi query, hammasi ixtiyoriy):

| Parametr | Tur | Izoh |
| --- | --- | --- |
| `query` | string | Nom bo'yicha qidiruv (`pg_trgm`) |
| `venue_type` | `restoran` \| `toyxona` | |
| `district_id` | int | |
| `guest_count` | int | Sig'im bo'yicha filtr |
| `min_rating` | 0…5 | |
| `requires_deposit` | bool | |
| `only_open_now` | bool | Default `false` |
| `sort` | `rating` \| `distance` \| `price` | Default `rating` |
| `limit` | 1…100 | Default `20` |
| `offset` | ≥0 | Default `0` |
| `lat`, `lng` | number | **Ikkalasi birga** yoki hech biri. Bittasi — 422 |
| `radius_m` | number | |

> ⚠️ **Sxemadagi tuzoq.** OpenAPI'da `VenueSearchParams` bitta obyekt-tipli
> `params` parametri sifatida ko'rinadi (FastAPI `Annotated[Model, Query()]`ni
> shunday chizadi), lekin runtime'da model **yassilanadi** va har maydon alohida
> parametr sifatida o'qiladi. Sxemaga ishongan klient `?params={...}` yuboradi va
> 422 oladi. Shuning uchun frontendda mapping **qo'lda** yozilgan.
>
> Shuningdek `lat`/`lng` — modeldagi `latitude`/`longitude`dan **alohida**
> parametrlar, va route ikkinchisini birinchisidan qayta yozadi. Ya'ni faqat
> `lat`/`lng` ta'sir qiladi.

**Javob:** `Page<VenueListItem>`
```json
{ "items": [{
    "id": 7, "name": "Osh Markazi", "tagline": "Milliy taomlar",
    "status": "active", "rating_avg": "4.6", "reviews_count": 128,
    "base_price": "150000.00", "currency": "UZS", "discount_percent": null,
    "requires_deposit": false, "distance_m": 1240.5, "is_open_now": true
  }], "total": 42, "limit": 20, "offset": 0 }
```

> `is_open_now` — **soat bo'yicha** holat (hozir ochiqmi). `status` — **ma'muriy**
> holat (`draft` | `pending` | `active` | `blocked` | `closed`). Kartada ikkalasi
> ham kerak.

#### 🟡 `GET /api/v1/venues/{venue_id}`

**Nima uchun:** Muassasa sahifasi. Server bir nechta so'rovdan yig'ib beradi,
shunda frontend 5 ta chaqiruv qilmaydi.

**Javob:** `VenueDetailRead`
```json
{ "venue": { ...VenueRead },
  "photos": [{"id":1,"url":"...","sort_order":0,"is_cover":true}],
  "amenities": [{...AmenityRead}],
  "venue_type": "restoran",
  "working_hours": [{"weekday":0,"opens_at":"09:00","closes_at":"23:00","is_closed":false}],
  "is_open_now": true }
```
`weekday`: 0 = dushanba … 6 = yakshanba.

#### 🔓 `GET /api/v1/venues/{venue_id}/availability?date_from={}&date_to={}`
**Nima uchun:** Sana tanlashda **kulrang** ko'rinadigan kunlar — to'yxona tadbiri
allaqachon egallagan sanalar.
**Javob:** `{venue_id, dates: ["2026-09-12", ...]}`

#### 🔓 `GET /api/v1/venues/{venue_id}/tables`
**Nima uchun:** Restoran bron qilishdagi "Bo'sh stollar" ro'yxati. Vaqti
to'qnashadigan broni yoki yopilgan oralig'i bor stollar **ro'yxatga kirmaydi**.

**Parametrlar:** `booking_date` (date), `start_time` (time), `end_time` (time)
— majburiy; `min_seats` (default 1).

**Javob:** `AvailableTableRead[]` — `{id, number, seats, zone_id}`.

#### 🔓 `GET /api/v1/venues/{venue_id}/zones`
`VenueZoneRead[]` — `{id, slug, name, sort_order}`. Odatda `ichkari` va
`tashqari`. **"Umumiy"** — bu filtrsiz ko'rinish, alohida zona emas, shuning
uchun ro'yxatda yo'q.

#### 🔓 `GET /api/v1/venues/{venue_id}/menu?category_id={}`
Faqat **shu filial** taqdim etadigan taomlar, **filial narxi** bilan.
**Javob:** `MenuItemListItem[]`
```json
[{ "id": 3, "name": "Osh", "photo_url": "...", "effective_price": "45000.00",
   "currency": "UZS", "discount_percent": null, "has_variants": false,
   "is_available": true, "status": "active" }]
```
`effective_price` — filial override'i hisobga olingan narx.

#### 🔓 `GET /api/v1/venues/{venue_id}/services?group_id={}`
To'yxona uchun qo'shimcha xizmatlar: dasturxon tuzash, raqqoslar, kartej, video,
qo'shiqchi, sahna.
**Javob:** `VenueServiceRead[]` — `items[]` bilan (masalan "Dasturxon tuzash"
ostidagi taom qatorlari).

#### 🔓 `GET /api/v1/venues/{venue_id}/reviews?limit={}&offset={}`
`Page<ReviewListItem>` — faqat **tasdiqlangan** (yakunlangan bronga bog'langan)
sharhlar.

---

### 7.7 Venue: Venues — filial boshqaruvi

#### 🔑🛡 `POST /api/v1/venue/venues?group_id={}`
`branch.create` ruxsati kerak.

**Nima uchun `group_id` query'da, `venue_id` emas?** Yaratilayotgan filialning
`venue_id`'si hali mavjud emas — shuning uchun ruxsat tarmoq bo'yicha
tekshiriladi.

**Yuboriladi:** `VenueCreate` (yuqorida `POST /venue/groups`da ko'rsatilgan
`branch` bloki bilan bir xil).

Egasi tarmoqdan meros qoladi, joylashuv koordinatalardan hisoblanadi, `ichkari`
va `tashqari` zonalari avtomatik ochiladi.

#### 🔑 `GET /api/v1/venue/venues?group_id={}&status={}`
Kirgan egasining tarmog'idagi filiallar. **Javob:** `VenueRead[]`.

#### 🔑 `GET /api/v1/venue/venues/counts?group_id={}`
**Nima uchun:** "Filiallar" sarlavhasidagi **Jami / Aktiv / Yopiq** raqamlari —
bitta guruhlangan so'rovda, uch marta so'rash o'rniga.
**Javob:** `{total, active, closed}`

#### 🔑 `GET /api/v1/venue/venues/{venue_id}` → `VenueRead`

`VenueRead` ichida nima bor (muhimlari):

| Maydon | Izoh |
| --- | --- |
| `venue_group_id` | Qaysi tarmoqqa tegishli |
| `district_id`, `street`, `house_number` | Manzil |
| `latitude`, `longitude` | String — `Numeric(9,6)` |
| `total_seats`, `capacity_min`, `capacity_max` | Sig'im |
| `base_price`, `currency` | Boshlang'ich narx |
| `min_advance_booking_days` | 0…30. Bron necha kun oldin qilinishi kerak |
| `late_grace_minutes` | 0…240. Kechikishga beriladigan vaqt |
| `requires_deposit`, `deposit_percent` | Oldindan to'lov sharti |
| `rating_avg`, `reviews_count` | Sharhlardan qayta hisoblanadi |
| `status` | `draft` \| `pending` \| `active` \| `blocked` \| `closed` |
| `onboarding_step`, `onboarded_at` | Boshlang'ich sozlash bosqichi |

#### 🔑🛡 `PATCH /api/v1/venue/venues/{venue_id}`
`branch.manage`. **Yuboriladi:** `VenueUpdate` — barcha maydonlar ixtiyoriy.
Manzil, sig'im, oldindan to'lov shartlari va bron uchun oldindan xabar muddati.

#### 🔑🛡 `PUT /api/v1/venue/venues/{venue_id}/working-hours?total_seats={}`

**Nima uchun `PUT`, `PATCH` emas:** **yettala kun bir yo'la qayta yoziladi.**
Kunlarni taqqoslash o'rniga hammasi qayta yoziladi — shunda olib tashlangan kun
eski qator bo'lib qolib ketmaydi.

**Yuboriladi:**
```json
{ "days": [
  {"weekday": 0, "opens_at": "09:00", "closes_at": "23:00", "is_closed": false},
  {"weekday": 1, "opens_at": "09:00", "closes_at": "23:00", "is_closed": false},
  ...
  {"weekday": 6, "opens_at": null, "closes_at": null, "is_closed": true}
]}
```
`weekday` 0…6. Ixtiyoriy `total_seats` query parametri bir vaqtda umumiy
o'rindiqlar sonini ham yangilaydi.

#### 🔑 Stollar va zonalar

| Metod | Yo'l | Tana / parametr |
| --- | --- | --- |
| `GET` | `/v1/venue/venues/{venue_id}/tables?zone_id=` | → `VenueTableRead[]` |
| `POST`🛡 | `/v1/venue/venues/{venue_id}/tables/bulk` | `{counts: {"2": 4, "4": 6, "8": 2}, zone_id?}` |
| `GET` | `/v1/venue/venues/{venue_id}/zones` | → `VenueZoneRead[]` |

**`tables/bulk` nima uchun kerak:** boshlang'ich sozlashdagi "2 kishilik — 4 ta,
4 kishilik — 6 ta" guruhlari raqamlangan stollarga yoyiladi. `counts` — bu
**kiritiladigan ma'lumot**, saqlanadigan holat emas: guruhlarning o'zi bazada
saqlanmaydi.

#### 🔑🛡 Boshlang'ich sozlash (onboarding)

Filial `draft` holatida yaratiladi va bosqichma-bosqich to'ldiriladi.
`onboarding_step` oshib boradi — shunda tugallanmagan sozlash davom ettiriladi.

| Metod | Yo'l | Tana | Bosqich |
| --- | --- | --- | --- |
| `PATCH` | `.../onboarding/address` | `VenueUpdate` | Manzil |
| `PATCH` | `.../onboarding/tables-done` | — | Stollar tugadi |
| `PATCH` | `.../onboarding/services-done` | — | Xizmatlar tugadi |
| `PATCH` | `.../onboarding/media-done` | — | Media tugadi |
| `POST` | `.../onboarding/finish` | — | **Nashr qilish** |

`finish` filialni ishga tushiradi: `status = active` va `onboarded_at` yoziladi.

---

### 7.8 Venue: Staff — hodimlar

#### 🔑 `GET /api/v1/venue/staff?group_id={}&venue_id={}&role_id={}&is_active={}`
**Javob:** `VenueStaffListItem[]`
```json
[{ "id": 5, "venue_id": 7, "staff_role_id": 4, "role_name": "Ofitsant",
   "is_active": true,
   "user": {"id": 88, "first_name": "Sardor", "last_name": "T.", "avatar_url": null} }]
```
Parol va login **hech qachon** qaytmaydi.

#### 🔑 `GET /api/v1/venue/staff/counts?group_id={}` → `{total, active, inactive}`

#### 🔑 `GET /api/v1/venue/staff/roles?scope={}`
`StaffRoleRead[]` — `{id, slug, scope, name, sort_order}`.
`scope`: `group` yoki `venue`. Rollar: Egasi, Admin, Menejer, Ofitsant, Oshpaz,
Oshpaz yordamchisi, Qo'riqchi.

#### 🔑🛡 `POST /api/v1/venue/staff/invitations?group_id={}&venue_id={}`
`staff.manage` ruxsati kerak.

**Yuboriladi:** `StaffInvitationCreate`
```json
{ "full_name": "Sardor Toshmatov", "phone": "+998901112233",
  "staff_role_id": 4, "venue_id": 7 }
```
Tanadagi `venue_id` — hodim biriktiriladigan **filial** (`null` = butun tarmoq).
Query'dagi `venue_id` — **ruxsat tekshiruvi** uchun. Bular boshqa-boshqa narsa.

**Javob (201):** `StaffInvitationCreated`
```json
{ "id": 9, "venue_group_id": 2, "venue_id": 7, "full_name": "...",
  "phone": "...", "staff_role_id": 4, "accepted_at": null,
  "expires_at": "2026-09-01T00:00:00Z",
  "login": "sardor01", "temporary_password": "Xk7ptR2m" }
```

> 🔴 **`login` va `temporary_password` faqat shu javobda qaytadi.** Boshqa hech
> qayerdan qayta o'qib bo'lmaydi. SMS yo'q — ya'ni hisob ma'lumotlarini hodimga
> yetkazadigan kanal ham yo'q, shuning uchun ularni egasining o'zi yetkazadi.
> Frontend bu qiymatlarni **ekranda ko'rsatishi va nusxa olish imkonini berishi
> shart**, aks holda ular butunlay yo'qoladi.

#### 🔓 `POST /api/v1/venue/staff/invitations/accept?phone={}`
**Yuboriladi:** `{login, temporary_password, new_password}` (`new_password` ≥ 8 belgi)
Vaqtinchalik parol shu bosqichda yangisiga almashtiriladi.

#### 🔑🛡 `PATCH /api/v1/venue/staff/{staff_id}/active?venue_id={}&is_active={}`
Hodimlar kartasidagi faollik tugmasi. `staff.manage`.

---

### 7.9 Venue: Menu — menyu konstruktori

**Asosiy g'oya:** kategoriya va taom **tarmoqqa** tegishli, lekin **narx va
mavjudlik filial bo'yicha**. Taom `menu_item_branches` orqali filialga
biriktiriladi.

#### 🔑 `GET /api/v1/venue/menu/categories?group_id={}&venue_id={}`
`MenuCategoryRead[]` — `{id, name, sort_order, is_active, item_count}`.
`item_count` **jonli hisoblanadi**, saqlanmaydi.

#### 🔑🛡 `POST /api/v1/venue/menu/categories?group_id={}&venue_id={}`
`menu.edit`. **Yuboriladi:** `{name, sort_order?}`

#### 🔑 `GET /api/v1/venue/menu/items?venue_id={}&category_id={}`
Faqat shu filial taqdim etadigan taomlar, amaldagi narxi bilan.

#### 🔑🛡 `POST /api/v1/venue/menu/items?venue_id={}`
Konstruktorning **1–2 bosqichi**. `menu.edit`.

**Yuboriladi:** `Body_venue_menu_create_item`
```json
{
  "payload": {
    "menu_category_id": 3,
    "name": "Osh",
    "description": "Toshkent oshi",
    "base_price": "45000",
    "currency": "UZS",
    "photo_url": "https://...",
    "has_variants": false,
    "discount_percent": null,
    "sort_order": 0
  },
  "variants": [
    { "name": "Kichik", "price": "35000", "sort_order": 0 },
    { "name": "Katta",  "price": "55000", "sort_order": 1 }
  ]
}
```

> ⚠️ **Variantlar `base_price` o'rnini egallaydi, u bilan birga turmaydi.**
> Variantlar berilsa, asosiy narx ishlatilmaydi.

#### 🔑 `GET /api/v1/venue/menu/items/{item_id}?venue_id={}`
**Nima uchun `venue_id` majburiy:** taom taqdim etilmaydigan filialda umuman
ko'rinmasligi va **katalog narxi bilan sotilmasligi** kerak.

**Javob:** `MenuItemRead` — `variants[]` bilan, har birida `price` va
`effective_price`.

#### 🔑🛡 `PUT /api/v1/venue/menu/items/{item_id}/branches?venue_id={}`
Konstruktorning **3-bosqichi**. `menu.publish`.

**Yuboriladi:** `BranchAvailabilityUpdate`
```json
{ "venue_ids": [7, 9, 11],
  "price_overrides": { "9": "48000", "11": "52000" } }
```

> ⚠️ **`venue_ids`ga kirmagan filialdan taom butunlay o'chiriladi** — u yerda
> "mavjud emas" holatida qolmaydi. Bu ataylab: yarim-o'chirilgan qator menyuni
> tushunarsiz qiladi.

---

### 7.10 Services — qo'shimcha xizmatlar

#### 🔓 `GET /api/v1/service-catalog?venue_type={}`
Platforma belgilagan **yopiq ro'yxat**: Dasturxon tuzash, Raqqoslar, Kartej,
Video, Qo'shiqchi, Sahna.
**Javob:** `ServiceCatalogRead[]` — `{id, slug, name, icon_url, applies_to_venue_type, sort_order}`

Hamkor bu ro'yxatdan xizmat tanlaydi, o'zi yangi tur o'ylab topa olmaydi.

#### 🔑🛡 `POST /api/v1/venue/services?venue_id={}&group_id={}`
**Nima uchun:** Katalogdagi xizmatga **o'z narxingizni** belgilash.

**Yuboriladi:** `VenueServiceCreate`
```json
{ "service_catalog_id": 2, "price": "3000000", "currency": "UZS",
  "price_unit": "flat", "venue_id": 7, "sort_order": 0,
  "items": [ {"name": "Yengil dasturxon", "price": "50000", "sort_order": 0} ] }
```
`price_unit`: `flat` (bir martalik) | `per_guest` (mehmon boshiga) | `per_hour`.

> Tanadagi `venue_id` bo'sh bo'lsa — narx **butun tarmoq** uchun amal qiladi.
> Filial narxi shu xizmat uchun tarmoq narxidan **ustun turadi**.

---

### 7.11 Bookings (mijoz) — bron qilish

Ikki xil bron bor va ular jiddiy farq qiladi:

| | Restoran (`table_reservation`) | To'yxona (`hall_event`) |
| --- | --- | --- |
| Nima band qilinadi | **Bitta stol**, vaqt oralig'iga | **Butun kun**, muassasa |
| `table_id` | Majburiy | Yo'q |
| Narx | Menyu buyurtmasi (ixtiyoriy) | Mehmonlar soniga qarab **bosqich** |
| Ziddiyat | `table_already_booked` (409) | `venue_already_booked` (409) |

#### 🔑 `POST /api/v1/bookings/table`

**Yuboriladi:** `TableReservationCreate`
```json
{
  "venue_id": 7,
  "table_id": 12,
  "booking_date": "2026-09-15",
  "start_time": "19:00",
  "end_time": "21:00",
  "guests_count": 4,
  "contact_name": "Ali Valiyev",
  "contact_phone": "+998901234567",
  "note": "Deraza yonida",
  "items": [ {"menu_item_id": 3, "quantity": 2} ],
  "services": [ {"venue_service_id": 5, "quantity": 1} ]
}
```

**Oldin nima qilish kerak:** `GET /v1/venues/{id}/tables` bilan bo'sh stolni
toping. Aks holda `409 table_already_booked`.

#### 🔑 `POST /api/v1/bookings/hall`

**Yuboriladi:** `HallEventCreate`
```json
{
  "venue_id": 7,
  "booking_date": "2026-10-02",
  "start_time": "18:00",
  "end_time": "23:00",
  "guests_count": 250,
  "contact_name": "Ali Valiyev",
  "contact_phone": "+998901234567",
  "note": null,
  "venue_service_ids": [2, 5, 8]
}
```

> ⚠️ **Narx bosqichi (`guest_tier`) klient tomonidan tanlanmaydi.** Server uni
> `guests_count`dan o'zi aniqlaydi. Klientda tier tanlagich bo'lsa, u narxni
> **taxmin qilgan** bo'lardi.

**Javob (201, ikkalasi uchun ham):** `BookingOwnerDetail`
```json
{
  "booking": { ...BookingRead },
  "qr_token": "a1b2c3d4e5f6...",
  "venue_name": "Osh Markazi",
  "items": [ {..., "name_snapshot": "Osh", "unit_price": "45000.00"} ],
  "services": [...],
  "price_lines": [
    {"line_type": "hall_rental", "label_snapshot": "Zal ijarasi",
     "unit_price": "5000000.00", "quantity": 1, "amount": "5000000.00"},
    {"line_type": "catering", "label_snapshot": "Dasturxon", ...},
    {"line_type": "deposit", "label_snapshot": "Oldindan to'lov", ...}
  ]
}
```

`PriceLineType`: `hall_rental` | `catering` | `service_logistics` | `deposit`.

> 🔐 **`qr_token` faqat shu javobda va `GET /v1/bookings/{id}`da qaytadi.**
> Ro'yxatlarda (`GET /v1/bookings`) va muassasa tomonidagi javoblarda **hech
> qachon** ko'rinmaydi — ro'yxatni skrinshot qilish juda oson, token esa kelishni
> qayd etish kaliti.

#### 🔑 `GET /api/v1/bookings?statuses=pending&statuses=confirmed`
**Nima uchun:** Mijoz ilovasidagi **"Joylar"** bo'limi.
**Javob:** `BookingListItem[]` — `qr_token`siz.

`BookingStatus`: `pending` | `confirmed` | `checked_in` | `completed` |
`cancelled` | `no_show` | `expired`.

#### 🔑 `GET /api/v1/bookings/{booking_id}` → `BookingOwnerDetail`
Faqat o'z broni. QR kodni shu yerdan chizasiz.

#### 🔑 `POST /api/v1/bookings/{booking_id}/cancel`
**Yuboriladi:** `{ "reason": "Rejam o'zgardi" }` (ixtiyoriy, maks. 500 belgi)

Belgilangan muddat ichida oldindan to'lov qaytarilmaydi; sabab **har holatda**
yozib qo'yiladi (`booking_status_history`).

---

### 7.12 Venue: Bookings — kunlik navbat va QR

#### 🔑🛡 `GET /api/v1/venue/bookings?venue_id={}&day={}&statuses=...`
**Nima uchun:** "Kutilayotgan mijozlar" ekrani — bitta filialning bitta kundagi
bronlari.
**Javob:** `BookingRead[]` (`qr_token`siz).

#### 🔑🛡 `POST /api/v1/venue/bookings/{booking_id}/confirm?venue_id={}`
`bookings.confirm`. Faqat `pending` bron o'zgaradi. **Faqat tasdiqlangan
bronning chiptasini skanerlash mumkin.**

#### 🔑🛡 `POST /api/v1/venue/bookings/{booking_id}/reject?venue_id={}`
`bookings.cancel`. **Yuboriladi:** `{reason?}`
Bron mijoz o'zi bekor qilgandagi kabi `cancelled` holatiga o'tadi; **kim rad
etgani** holat tarixida qoladi.

#### 🔑🛡 `POST /api/v1/venue/bookings/check-in`
**Nima uchun:** QR kodni skanerlab mijozni qayd etish.

**Yuboriladi:** `CheckInRequest`
```json
{ "qr_token": "a1b2c3d4e5f6...", "venue_id": 7 }
```

> ⚠️ **Token bir marta ishlaydi** — ikkinchi skan rad etiladi
> (`booking_not_check_inable`). Skanerlovchi **shu filialda ishlashi** shart.

#### 🔑🛡 `POST /api/v1/venue/bookings/{booking_id}/check-out?venue_id={}`
**Javob:** `SeatedSummary` — `{booking_id, checked_in_at, checked_out_at, seated_minutes}`
`seated_minutes` haqiqiy vaqt oralig'idan **bir marta** hisoblanadi va yoziladi.

#### 🔑🛡 `GET /api/v1/venue/bookings/blocked-dates?venue_id={}&date_from={}&date_to={}`
Shu filialda to'yxona tadbiri egallagan kunlar → `{venue_id, dates[]}`.

---

### 7.13 Venue: Orders — stollar, oshxona, cheklar

Bu — restoran ichidagi POS qismi. **Bron** (`booking`) va **chek** (`order`) —
boshqa-boshqa narsa: bron kelishdan oldin, chek stolda o'tirganda.

#### 🔑🛡 `GET /api/v1/venue/orders/table-board?venue_id={}&zone_id={}`
**Nima uchun:** **"Stollar"** taxtasi. Har bir aktiv stol va uning ochiq cheki.
Bo'sh stollar ham qaytariladi (`order: null`).

**Javob:** `TableBoardRow[]`
```json
[{ "table_id": 12, "number": 5, "seats": 4, "zone_id": 1,
   "order": { "id": 88, "order_number": 14, "status": "in_progress",
              "total_amount": "180000.00", "elapsed_seconds": 1820, ... } },
 { "table_id": 13, "number": 6, "seats": 2, "zone_id": 1, "order": null }]
```

> `venue_tables`da holat ustuni **yo'q** — taxta buyurtmalardan hisoblanadi,
> shuning uchun ikki manba bir-biriga zid kelmaydi.

#### 🔑🛡 `GET /api/v1/venue/orders/kitchen-queue?venue_id={}`
**Nima uchun:** Oshpaz ekrani. Navbat **chek bo'yicha emas, taom bo'yicha**
tuziladi — chunki Oshpaz alohida rol va har bir taomning o'z holati bor.

**Javob:** `KitchenQueueItem[]` — eng eskisidan, stol raqami bilan.
`OrderItemStatus`: `new` | `sent_to_kitchen` | `cooking` | `ready` | `served` | `cancelled`.

#### 🔑🛡 `GET /api/v1/venue/orders?venue_id={}&statuses=...`
Bugungi ish kuni uchun cheklar. `OrderStatus`: `open` | `in_progress` | `served` |
`awaiting_payment` | `completed` | `cancelled`.

#### 🔑🛡 `POST /api/v1/venue/orders?venue_id={}`
`orders.open`. **Yuboriladi:** `{ "table_id": 12, "guests_count": 4, "kind": "dine_in" }`
`kind`: `dine_in` | `takeaway`.

> Bir stolni ikki ofitsant ochsa — **bitta chek va bitta 409**
> (`table_has_open_order`) hosil bo'ladi.

#### 🔑🛡 `GET /api/v1/venue/orders/{order_id}?venue_id={}`
**Javob:** `OrderDetailRead` — `{order, items[], payments[], paid_amount, elapsed_seconds}`
`elapsed_seconds` **o'qish paytida** hisoblanadi — kartadagi taymer hech qachon
bazada saqlanmaydi.

#### 🔑🛡 `POST /api/v1/venue/orders/{order_id}/items?venue_id={}`
`orders.add_items`. **Yuboriladi — massiv:**
```json
[ { "menu_item_id": 3, "variant_id": null, "quantity": 2, "note": "achchiq emas" },
  { "menu_item_id": 7, "variant_id": 2, "quantity": 1, "note": null } ]
```
Narx va nom qo'shilgan paytda **snapshot** qilinadi.

#### 🔑🛡 `POST /api/v1/venue/orders/{order_id}/payments?venue_id={}`
**Yuboriladi:** `OrderPaymentCreate`
```json
{ "method": "cash", "amount": "200000", "provider_transaction_id": null,
  "change_amount": "20000" }
```
`method`: `cash` | `card` | `transfer` | `click` | `payme` | `other`.
Bo'lib to'lash — bir necha qator (`payments[]`).

#### 🔑🛡 `POST /api/v1/venue/orders/{order_id}/close?venue_id={}`
`orders.close`. **Javob:** `ReceiptRead`.

> ⚠️ To'lovlar summani **qoplamaguncha** `422 payment_incomplete` qaytadi.

#### 🔑🛡 `POST /api/v1/venue/orders/{order_id}/cancel?venue_id={}`
**Yuboriladi:** `{reason?}`. Kim bekor qilgani yozib qo'yiladi.

#### 🔑 `GET /api/v1/venue/orders/{order_id}/receipt` → `ReceiptRead`
```json
{ "id": 5, "order_id": 88, "receipt_number": "R-2026-000088",
  "printed_at": "...", "fiscal_sign": null, "fiscal_serial": null,
  "payload": { ...chop etilgan qatorlar... }, "reprinted_count": 0 }
```

**Nima uchun `payload`:** chek **bir marta yoziladi va hech qachon
o'zgartirilmaydi**. `payload` chop etilgan qatorlarni muzlatadi — ikki oydan
keyin qayta chiqarilgan chek menyudagi o'zgarishlardan qat'i nazar **aynan
o'sha** bo'ladi.

#### 🔑🛡 `POST /api/v1/venue/orders/{order_id}/receipt/reprint?venue_id={}`
Faqat `reprinted_count` hisoblagichini oshiradi, boshqa hech narsani
o'zgartirmaydi.

---

### 7.14 Reviews — sharhlar va reyting

#### 🔑 `POST /api/v1/reviews`

**Nima uchun bunday cheklangan:** sharh **muassasaga emas, bronga** bog'lanadi.
Ya'ni sharh — istalgan odam istalgan joy haqida yozadigan narsa emas; u
**haqiqatan kelgan mehmon** bir marta aytadigan gap.

**Yuboriladi:** `ReviewCreate`
```json
{ "booking_id": 55, "rating": 5, "comment": "Ajoyib!",
  "photo_urls": ["https://...", "https://..."] }
```
`rating` — 1…5. `comment` — maks. 2000 belgi.

**Xatoliklar:** `409 already_reviewed` — bu bronga sharh yozilgan.

> Frontend formani ko'rsatishdan oldin **mos bron topishi** kerak (yakunlangan
> va hali sharhlanmagan).

#### 🔓 `GET /api/v1/reviews/venue/{venue_id}?limit={}&offset={}`
`Page<ReviewListItem>` — muallif (`UserListItem`) va suratlar bilan.
`is_verified: true` — sharh bronga bog'langan.

#### 🔓 `GET /api/v1/reviews/venue/{venue_id}/aggregate`
`{venue_id, average, count}` — muassasa kartasidagi reyting shu yerdan.

---

### 7.15 Engagement — sevimlilar, chat, bildirishnomalar

#### Sevimlilar

| Metod | Yo'l | Tana | Javob |
| --- | --- | --- | --- |
| 🔑 `GET` | `/v1/favorites` | — | `FavoriteRead[]` (`{id, venue}`) |
| 🔑 `POST` | `/v1/favorites` | `{venue_id}` | `{venue_id, is_favorite}` |
| 🔑 `DELETE` | `/v1/favorites/{venue_id}` | — | `{venue_id, is_favorite}` |

`POST` — **idempotent toggle**: bitta yo'l, shuning uchun qo'shish va olib
tashlash ziddiyatga tushmaydi. Ikkalasi ham **natijaviy holat**ni qaytaradi —
frontend taxmin qilmaydi.

#### Suhbatlar (chat)

| Metod | Yo'l | Tana |
| --- | --- | --- |
| 🔑 `GET` | `/v1/conversations` | → `ConversationListItem[]` (oxirgi xabar + o'qilmaganlar soni) |
| 🔑 `POST` | `/v1/conversations` | `{venue_id, booking_id?}` |
| 🔑 `GET` | `/v1/conversations/{id}/messages?limit=&offset=` | → `MessageRead[]`, eng yangisidan |
| 🔑 `POST` | `/v1/conversations/{id}/messages` | `{body}` (1–4000 belgi) |
| 🔑 `POST` | `/v1/conversations/{id}/read` | — → belgilangan ID'lar massivi |

> **Har bir mijoz + muassasa juftligi uchun bitta suhbat**, har bron uchun emas.
> `booking_id` faqat kontekst.
>
> `read` — faqat **qarshi tomon** xabarlarini belgilaydi; yuboruvchi o'z
> xabarini o'qilgan deb belgilamaydi.

`MessageSenderType`: `user` | `venue`.

#### Bildirishnomalar

| Metod | Yo'l | Javob |
| --- | --- | --- |
| 🔑 `GET` | `/v1/notifications?limit=&offset=` | `Page<NotificationRead>` |
| 🔑 `GET` | `/v1/notifications/unread-count` | `{unread: 3}` |
| 🔑 `POST` | `/v1/notifications/{id}/read` | `NotificationRead` |
| 🔑 `POST` | `/v1/notifications/read-all` | `number[]` — o'zgarganlar ID'si |

`NotificationRead` = `{id, type, title, body, payload, read_at, sent_at}`.
Mijoz ilovasi `sent_at` bo'yicha **Bugun / Shu hafta / Shu oy** ga ajratadi.

> Allaqachon o'qilgan bildirishnomani qayta belgilash — `404`.

---

### 7.16 Venue: Analytics — boshqaruv paneli

#### 🔑🛡 `GET /api/v1/venue/analytics/dashboard?group_id={}&venue_id={}`
`reports.view`.

**Nima uchun ikkala ID ham kerak:** `group_name` **tarmoq**qa tegishli;
`is_open_now` va `queue_count` esa panel ko'rsatayotgan **filial**ga. Shuning
uchun ikkalasining identifikatori ham alohida uzatiladi.

**Javob:** `DashboardRead`
```json
{
  "group_id": 2, "group_name": "Osh Markazi",
  "venue_id": 7, "venue_name": "Chilonzor", "is_open_now": true,
  "branches_total": 3, "branches_active": 2, "branches_closed": 1,
  "staff_total": 12, "staff_active": 10,
  "queue_count": 4,
  "month_revenue": "184500000.00", "month_bookings": 320,
  "avg_check": "576562.50", "occupancy_percent": "78.4", "currency": "UZS",
  "comparison": {
    "current":  { "bookings_count": 320, "guests_count": 1180, "no_show_count": 12,
                  "cancelled_count": 8, "orders_count": 410, "revenue": "184500000.00" },
    "previous": { ... },
    "revenue_delta_percent": "12.4",
    "bookings_delta_percent": "-3.1"
  },
  "week": [ {"weekday": 0, "bookings_count": 41, "revenue": "22000000.00"}, ... ],
  "today": { ...VenueDailyStatsRead... }
}
```

#### 🔑🛡 `GET /api/v1/venue/analytics/daily?venue_id={}&date_from={}&date_to={}`
`VenueDailyStatsRead[]` — filialning har bir ish kuni uchun bitta qator.

#### 🔑🛡 `GET /api/v1/venue/analytics/revenue?venue_id={}&current_from={}&current_to={}&previous_from={}&previous_to={}`
Ikkala davr jami va farq.

> **Foiz hech qachon saqlanmaydi.** U o'qish paytida hisoblanadi, chunki kechikib
> kelgan bekor qilish saqlangan qiymatni noto'g'ri qilib qo'yadi.

---

### 7.17 Telegram — bot webhooki

#### `POST /api/v1/telegram/webhook`

**Brauzer uchun emas.** Telegram yangilanishlarni shu manzilga yuboradi.

**Himoya:** har bir so'rov `X-Telegram-Bot-Api-Secret-Token` sarlavhasi bilan
tekshiriladi. Webhook URL'i taxmin qilinishi mumkin — bu kalitsiz istalgan odam
soxta update yuborib, botga istalgan chatda istalgan gapni aytdira olardi.

**Javob doim `200`** (`{ok: true}`) — aks holda Telegram qayta yuborishni
boshlaydi.

Sxema ataylab **tor**: Telegram o'nlab turdagi update yuboradi va vaqt o'tishi
bilan yangilarini qo'shadi, shuning uchun notanish maydonlar e'tiborsiz
qoldiriladi.

---

## 8. Frontendga ulash — amaliy qo'llanma

### 8.1 Qatlamlar

```
src/lib/api/
├── schema.d.ts       ← /api/openapi.json dan generatsiya. QO'LDA TAHRIRLAMANG
├── types.ts          ← ApiError, kodlar union'i, Page<T>, domen tiplari
├── config.ts         ← API_BASE_URL, query-string yasash
├── client.ts         ← apiFetch — so'rov ilovadan chiqadigan YAGONA joy
├── auth-tokens.ts    ← sessiya saqlash va single-flight refresh
├── money.ts          ← Decimal-as-string yordamchilari
└── endpoints/        ← har backend moduli uchun bitta fayl + query key'lar
    ├── auth.ts
    ├── bookings.ts
    ├── geo.ts
    ├── partner.ts
    ├── reviews.ts
    └── venues.ts
```

**Qoida:** `fetch`ni faqat `client.ts` chaqiradi. Boshqa hamma joyda domen
tiplari va `ApiError` bilan ishlanadi.

### 8.2 Tiplarni generatsiya qilish

```sh
# Backend ISHLAB TURGAN holda:
npm run gen:api
```

Bu `openapi-typescript` orqali `/api/openapi.json`dan `src/lib/api/schema.d.ts`
yasaydi. Fayl **commit qilinadi**, shunda build uchun tirik backend kerak
bo'lmaydi. API o'zgarganda qayta generatsiya qiling va natijani commit qiling.

### 8.3 `apiFetch` — nima qiladi

```ts
export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  auth?: "required" | "optional" | "none";
}
```

Ichida:
1. `X-Request-ID` qo'yadi (o'z UUID'i — javobda va logda qaytadi).
2. Token bo'lsa `Authorization: Bearer …` qo'yadi (`auth !== "none"` bo'lsa).
3. `401` kelsa — **bir marta** `refreshSession()` qilib qayta uradi.
4. `!response.ok` bo'lsa — `ApiError` **throw** qiladi.
5. `204` bo'lsa — `undefined` qaytaradi.

`auth` rejimlari:
- `"required"` — token kerak (masalan bronlar)
- `"optional"` — bo'lsa yuboriladi, bo'lmasa ham so'rov ketadi (qidiruv, muassasa)
- `"none"` — token umuman yuborilmaydi (login, ochiq ma'lumotlar)

### 8.4 Yangi endpoint qo'shish — namuna

```ts
// src/lib/api/endpoints/notifications.ts
import { apiFetch } from "../client";
import type { components } from "../schema";
import type { Page } from "../types";

export type Notification = components["schemas"]["NotificationRead"];

export const notificationKeys = {
  list: (limit: number, offset: number) => ["notifications", limit, offset] as const,
  unread: () => ["notifications", "unread"] as const,
};

export function listNotifications(
  limit = 20,
  offset = 0,
  signal?: AbortSignal,
): Promise<Page<Notification>> {
  return apiFetch<Page<Notification>>("/v1/notifications", {
    auth: "required",
    signal,
    query: { limit, offset },
  });
}

export function markAllRead(): Promise<number[]> {
  return apiFetch<number[]>("/v1/notifications/read-all", {
    method: "POST",
    auth: "required",
  });
}
```

### 8.5 TanStack Query bilan ishlatish

```tsx
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAllRead, notificationKeys } from "@/lib/api/endpoints/notifications";
import { ApiError } from "@/lib/api/types";

export function Notifications() {
  const qc = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: notificationKeys.list(20, 0),
    queryFn: ({ signal }) => listNotifications(20, 0, signal),
    staleTime: 60_000,
  });

  const readAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isPending) return <Skeleton />;
  if (error instanceof ApiError) {
    // `code` bo'yicha shart tuzing, `message`ni ko'rsating
    if (error.code === "unauthenticated") return <SignInPrompt />;
    return <ErrorBox text={error.message} requestId={error.requestId} />;
  }

  return (
    <>
      <button onClick={() => readAll.mutate()}>Hammasini o'qildi</button>
      {data.items.map((n) => <Row key={n.id} item={n} />)}
    </>
  );
}
```

### 8.6 Sessiyani o'qish

```tsx
const { signedIn, user, group, isPartner, isLoading, signOut } = useSession();
```

`isPartner` — saqlangan bayroq emas, **tarmoq egalik qilishi**, ya'ni faqat
server javob bera oladigan savol (`GET /v1/venue/groups/me`). 404 — "hamkor
emas" degani, qayta urinilmaydi.

### 8.7 Telegram Mini App

```ts
import { announceReady, isInsideTelegram, getInitData } from "@/lib/telegram/webapp";
import { telegramLogin, shareTelegramContact } from "@/lib/api/endpoints/auth";

useEffect(() => {
  announceReady();                    // Telegram loader'ini olib tashlaydi + expand
  if (!isInsideTelegram()) return;    // oddiy brauzerda telefon+parol oqimi qoladi
  const initData = getInitData();
  if (initData) telegramLogin(initData);
}, []);
```

Raqamni olish:
```ts
const contactData = await requestContactFromTelegram(); // WebApp.requestContact
const user = await shareTelegramContact(contactData);   // imzo backendda tekshiriladi
```

> `initData` va `contact_data` — ikkalasi ham **o'zgartirilmasdan** uzatiladi.
> Qayta kodlash yoki qismlarga ajratish imzoni buzadi.

### 8.8 Pulni ko'rsatish

```tsx
import { formatUZS, formatRating } from "@/lib/api/money";

<span>{formatUZS(venue.base_price)}</span>   {/* "150 000 so'm" */}
<span>{formatRating(venue.rating_avg)}</span> {/* "4.6" */}
```

### 8.9 CORS

Brauzer backendni **to'g'ridan-to'g'ri** chaqiradi — hech qanday proxy yoki
rewrite yo'q. Ikki qiymat mos kelishi shart:

```
frontend/.env.local:  NEXT_PUBLIC_API_URL=https://api.example.com/api
backend/.env:         APP_CONFIG__CORS__ORIGINS=["https://app.example.com"]
```

> Sahifa yuklanadi-yu, **har bir so'rov yiqiladi**, `curl` esa ishlaydi — bu
> aynan shu ikki qiymat bir-biridan uzoqlashganini bildiradi. `curl` CORS'ga
> bo'ysunmaydi.

---

## 9. Tipik oqimlar (end-to-end senariylar)

### 9.1 Mijoz: restoranda stol bron qilish

```
1. GET  /v1/districts/nearest?lat=&lng=      → qayerdaman
2. GET  /v1/venues/search?district_id=&venue_type=restoran&lat=&lng=&sort=distance
3. GET  /v1/venues/{id}                      → muassasa sahifasi
4. GET  /v1/venues/{id}/menu                 → menyu
5. GET  /v1/venues/{id}/tables?booking_date=&start_time=&end_time=&min_seats=
                                             → bo'sh stollar
6. POST /v1/auth/phone-check                 ┐
   POST /v1/auth/register | /v1/auth/login   ┘ kirish (agar hali kirmagan bo'lsa)
7. POST /v1/bookings/table                   → BookingOwnerDetail + qr_token
8. GET  /v1/bookings                         → "Joylar" ro'yxati
9. GET  /v1/bookings/{id}                    → QR kod ekrani
```

### 9.2 Mijoz: to'yxona bron qilish

```
1. GET  /v1/venues/search?venue_type=toyxona&guest_count=250
2. GET  /v1/venues/{id}
3. GET  /v1/venues/{id}/availability?date_from=&date_to=   → band kunlar (kulrang)
4. GET  /v1/venues/{id}/services?group_id=                 → qo'shimcha xizmatlar
5. POST /v1/bookings/hall  { guests_count, venue_service_ids: [...] }
                                                  → price_lines bilan hisob-kitob
```

### 9.3 Hamkor: nolga teng holatdan ishlaydigan filialgacha

```
1.  POST  /v1/auth/register | /v1/auth/telegram
2.  POST  /v1/venue/groups         { group, branch }   → tarmoq + 1-filial (409 = bor)
3.  GET   /v1/venue/groups/me                          → group_id
4.  PATCH /v1/venue/venues/{id}/onboarding/address     → manzil
5.  POST  /v1/venue/venues/{id}/tables/bulk            → stollar
    PATCH /v1/venue/venues/{id}/onboarding/tables-done
6.  GET   /v1/service-catalog?venue_type=toyxona
    POST  /v1/venue/services?venue_id=&group_id=       → narxlar
    PATCH /v1/venue/venues/{id}/onboarding/services-done
7.  PUT   /v1/venue/venues/{id}/working-hours          → 7 kun
8.  PATCH /v1/venue/venues/{id}/onboarding/media-done
9.  POST  /v1/venue/venues/{id}/onboarding/finish      → status: active
```

### 9.4 Hamkor: menyu yaratish

```
1. GET  /v1/venue/menu/categories?group_id=
2. POST /v1/venue/menu/categories?group_id=&venue_id=   → kategoriya
3. POST /v1/venue/menu/items?venue_id=                  → taom (+variantlar)
4. PUT  /v1/venue/menu/items/{id}/branches?venue_id=    → qaysi filiallarda, qaysi narxda
```

### 9.5 Hamkor: hodim qo'shish

```
1. GET  /v1/venue/staff/roles                            → rol ID'lari
2. POST /v1/venue/staff/invitations?group_id=&venue_id=
        → login + temporary_password  ← EKRANDA KO'RSATING, boshqa joydan olinmaydi
3. (hodim) POST /v1/auth/staff-login  yoki
           POST /v1/venue/staff/invitations/accept?phone=
4. PATCH /v1/venue/staff/{id}/active?venue_id=&is_active=
```

### 9.6 Ofitsant: smena davomida

```
1. GET  /v1/venue/orders/table-board?venue_id=           → stollar taxtasi
2. POST /v1/venue/orders?venue_id=  {table_id, guests_count}   → stol ochish
3. POST /v1/venue/orders/{id}/items?venue_id=  [ {...}, {...} ]
4. GET  /v1/venue/orders/{id}?venue_id=                  → chek + taymer
5. POST /v1/venue/orders/{id}/payments?venue_id=         → to'lov(lar)
6. POST /v1/venue/orders/{id}/close?venue_id=            → ReceiptRead
```

### 9.7 Qo'riqchi / administrator: QR skanerlash

```
1. GET  /v1/venue/bookings?venue_id=&day=2026-09-15      → kunlik navbat
2. POST /v1/venue/bookings/{id}/confirm?venue_id=        → pending → confirmed
3. POST /v1/venue/bookings/check-in  {qr_token, venue_id}  → bir martalik
4. POST /v1/venue/bookings/{id}/check-out?venue_id=      → seated_minutes
```

### 9.8 Sharh yozish

```
1. GET  /v1/bookings?statuses=completed     → sharh yozish mumkin bo'lgan bronlar
2. POST /v1/reviews  {booking_id, rating, comment, photo_urls}
   (409 already_reviewed → tugmani yashiring)
```

---

## 10. Ma'lumotlar modeli — asosiy tushunchalar

### Ierarxiya

```
venue_group (tarmoq / brend)
│  logo_url, default_currency, primary_venue_type, owner_id
│
├── venue (filial)
│   │  manzil, koordinata, sig'im, narx, ish vaqti, status, onboarding_step
│   │
│   ├── venue_zone      → ichkari / tashqari
│   ├── venue_table     → raqamlangan stollar (zone_id bilan)
│   ├── venue_photo     → suratlar (is_cover)
│   ├── venue_amenity   → qulayliklar (M2M)
│   ├── venue_working_hours → 7 qator
│   └── venue_guest_tier    → to'yxona narx bosqichlari
│
├── menu_category  → tarmoq darajasida
│   └── menu_item
│       ├── menu_item_variant          (Kichik / O'rtacha / Katta)
│       ├── menu_item_branch           ← qaysi filialda, qanday narxda
│       └── menu_item_variant_branch
│
├── venue_service   → katalogdagi xizmatga narx (venue_id null = butun tarmoq)
│   └── venue_service_item
│
└── venue_staff     → kim, qaysi filialda, qaysi rolda
    └── staff_role → staff_role_permission → permission
```

### Bron va buyurtma

```
booking (bron — kelishdan oldin)
├── booking_item          → oldindan tanlangan taomlar (snapshot bilan)
├── booking_service       → tanlangan xizmatlar (snapshot bilan)
├── booking_price_line    → batafsil hisob-kitob qatorlari
└── booking_status_history→ kim, qachon, nima uchun o'zgartirdi

order (chek — stolda o'tirganda)
├── order_item            → har birining o'z statusi (oshxona navbati uchun)
├── order_payment         → bo'lib to'lash → bir necha qator
├── order_status_history
└── receipt               → bir marta yoziladi, payload muzlatiladi
```

### Foydalanuvchi

```
user
├── device            → push tokenlar
├── refresh_token     → rotatsiya qilinadigan sessiyalar
├── friendship        → do'stlik (requester / addressee)
├── user_recent_location → oxirgi 10 manzil
├── favorite          → sevimli muassasalar
├── conversation → message
├── notification
└── review → review_photo, review_reply
```

### Snapshot qoidasi

Quyidagi maydonlar **ataylab nusxalanadi**, jonli jadvaldan o'qilmaydi:

| Maydon | Qayerda | Nima uchun |
| --- | --- | --- |
| `name_snapshot`, `unit_price` | `booking_item`, `order_item`, `booking_service` | Menyu narxi o'zgarsa, eski chek o'zgarmasligi kerak |
| `label_snapshot` | `booking_price_line` | Xizmat nomi o'zgarsa, kelishuv o'zgarmasligi kerak |
| `receipt.payload` | `receipt` | Chop etilgan chek — o'zgarmas hujjat |
| `seated_minutes` | `booking` | Haqiqiy o'tirish vaqti bir marta yoziladi |

### Hech qachon saqlanmaydigan (o'qish paytida hisoblanadi)

- `elapsed_seconds` — chekdagi taymer
- `is_open_now` — hozir ochiqmi
- `distance_m` — mijozgacha masofa
- `item_count` — kategoriyadagi taomlar soni
- `revenue_delta_percent`, `bookings_delta_percent` — o'zgarish foizi
- `unread_count` — o'qilmagan xabarlar

---

## 11. Tez-tez uchraydigan muammolar

| Alomat | Sabab | Yechim |
| --- | --- | --- |
| Sahifa ochiladi, har bir so'rov yiqiladi, `curl` ishlaydi | CORS | `NEXT_PUBLIC_API_URL` va `APP_CONFIG__CORS__ORIGINS`ni moslashtiring |
| Konteynerni qayta ishga tushirdim, API URL baribir eski | `NEXT_PUBLIC_*` **build**da inline bo'ladi | Qayta **build** qiling |
| Foydalanuvchi kutilmaganda chiqib ketadi | Parallel refresh → token oilasi bekor qilindi | Refresh **single-flight** bo'lishi shart |
| Refresh cheksiz sikl | 403'ni qayta urinmoqda | 403 = terminal. `clearSession()` va login ekrani |
| `?statuses=a,b` → 422 | FastAPI massivni takrorlangan kalitdan o'qiydi | `?statuses=a&statuses=b` |
| `/v1/venues/search` → 422 | Sxemaga ishonib `?params={...}` yuborilgan | Har maydonni alohida query parametr qiling |
| `lat` berdim, natija tartibi o'zgarmadi | `lng` berilmagan → 422 | Ikkalasini birga yuboring |
| `422` "venue_id talab qilinadi" | `PermissionRequired` guard'i `venue_id` topmadi | Query'ga `venue_id` qo'shing |
| `403` "Siz bu tarmoqda ishlamaysiz" | `group_id` boshqa tarmoqniki | To'g'ri `group_id` yuboring |
| Hodim loginini yo'qotdim | `temporary_password` faqat yaratish javobida | Yangi taklifnoma yarating |
| `409 group_already_exists` | Bir egaga bitta tarmoq | `GET /v1/venue/groups/me` bilan mavjudini oling |
| `409 table_already_booked` | Stol band | `GET /v1/venues/{id}/tables` bilan bo'shini oling |
| `422 payment_incomplete` | To'lovlar summani qoplamagan | Yana `payments` qo'shing |
| Narxda `.00000000001` chiqdi | String `Number()`dan o'tkazilgan | `money.ts` yordamchilaridan foydalaning |
| Migratsiya `postgis` kengaytmasida yiqildi | Oddiy `postgres` image | PostGIS image ishlatilsin |
| Backend startda yiqildi: "AUTH_MODE 'disabled' requires ENV 'local'" | Xavfsizlik guard'i | `AUTH_MODE=enforced` qiling |

---

## Qo'shimcha havolalar

| Fayl | Nima bor |
| --- | --- |
| `backend/API_PLAN.md` | API rejasi |
| `backend/MODEL_PLAN.md`, `backend/SCHEMA_PLAN.md` | Model va sxema rejalari |
| `backend/CONVENTIONS.md` | Kod konvensiyalari |
| `backend/DECISIONS.md` | Qabul qilingan arxitektura qarorlari |
| `backend/docs/bazmly-db-schema.md` | Baza sxemasi (mijoz qismi) |
| `backend/docs/db-schema-part2-venue-app.md` | Baza sxemasi (muassasa qismi) |
| `frontend/AGENTS.md`, `frontend/CLAUDE.md` | Frontend qoidalari |
| `frontend/README.md` | Frontend qo'llanmasi |

**Jonli hujjat:** `http://localhost:8000/api/docs` — bu markdown emas, aynan
ishlab turgan API'dan generatsiya qilinadi va har doim to'g'ri bo'ladi.
