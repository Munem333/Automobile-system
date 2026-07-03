# AutoHub BD — Premium Automotive E-Commerce Platform

Full-stack car & parts marketplace for Bangladesh.

## Stack

| Layer | Tech |
|-------|------|
| Web | HTML, CSS, JavaScript (static storefront) |
| API | Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis, Socket.IO |
| Android | Kotlin, Jetpack Compose (`/android` — upcoming) |
| Data | **PostgreSQL** (source of truth), Redis (sessions/cache), S3/Cloudinary (media) |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL + Redis)

### 1. Install dependencies

```bash
npm install
```

### 2. Start databases

```bash
npm run db:up
```

### 3. Configure API

```bash
cp api/.env.example api/.env
# Edit JWT secrets in api/.env for production
```

### 4. Migrate & seed (50+ products, 3 brands)

```bash
npm run db:migrate
npm run db:seed
```

Save the **admin credentials** printed by the seed script. Password must be changed on first login.

### 5. Run dev servers

```bash
npm run dev
```

Or on Windows:

```powershell
.\start.ps1
```

- Web: http://localhost:3001
- API: http://localhost:4000
- Health: http://localhost:4000/health
- Ready: http://localhost:4000/ready

## Project Structure

```
web/                 Static HTML/CSS/JS storefront
api/                 Express REST API + Socket.IO
packages/types/      Shared TypeScript types
android/             Kotlin Compose app (upcoming)
docker-compose.yml   PostgreSQL + Redis
```

## Build Order (progress)

- [x] Monorepo scaffold (Turborepo workspaces)
- [x] Prisma schema + seed (50+ products, Toyota/Hyundai/Nissan)
- [x] Auth API (register/login/JWT/refresh/RBAC)
- [x] Catalog APIs (brands, cars, parts, products)
- [x] Web: Home, Cars, Parts, Brands (HTML/CSS/JS)
- [x] Live chat (Socket.IO) end-to-end
- [x] Appointment booking flow + admin management
- [x] Customer care / support ticket flow
- [x] Admin panel (dashboard, CRUD, chat inbox, analytics)
- [x] Android app (catalog, cart, chat, appointments)
- [ ] Cart + Checkout + Payment (SSLCommerz/bKash sandbox)
- [ ] 3D viewer + video integration

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Customer registration |
| POST | `/api/auth/login` | Login (JWT) |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/brands` | List brands |
| GET | `/api/cars` | List cars (filterable) |
| GET | `/api/parts` | List parts (filterable) |
| GET | `/api/products/featured` | Featured products |
| GET | `/api/products/:slug` | Product detail |

## Non-Functional

- Currency: BDT (৳)
- Localization: English + Bangla (UI toggle — upcoming)
- SEO: SSR product pages, sitemap (upcoming)
- Security: Rate limiting, bcrypt, JWT, RBAC, env validation, chat session tokens, XSS-safe rendering
