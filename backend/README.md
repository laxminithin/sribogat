# KissanBandi SQL Backend

Node + Express backend for KissanBandi, built for MySQL and simple VPS hosting.

## What it supports

- JWT auth for customer and admin login
- SQL-backed users, categories, products, orders, order items, and wishlist
- Product image uploads to local disk under `/uploads`
- Admin order stats, exports, customer analytics, and product management endpoints
- Frontend-compatible `/api/...` routes for the current React app

## Local setup

1. Copy `.env.example` to `.env`
2. Set a real `DATABASE_URL`
3. Install dependencies with `npm install`
4. Run migrations with `npm run db:migrate`
5. Seed the admin user with `npm run db:seed`
6. Start the API with `npm run dev`

## VPS deployment

1. Install Node 22+ and MySQL 8+ on the server
2. Clone the repo and go to `backend`
3. Create `.env` with production values:
   - `NODE_ENV=production`
   - `HOST=0.0.0.0`
   - `PORT=5001`
   - `DATABASE_URL=mysql://user:password@127.0.0.1:3306/database_name`
   - `CORS_ORIGIN=https://your-frontend-domain.com`
   - `JWT_SECRET=<long-random-secret>`
   - `APP_BASE_URL=https://api.your-domain.com`
4. Run `npm install --omit=dev`
5. Run `npm run db:migrate`
6. Run `npm run db:seed` once if you want the initial admin
7. Start with `npm start`
8. If you are using Apache/Plesk, copy `.htaccess` with the backend files so the domain can proxy to `127.0.0.1:5001`
9. If you are using Nginx or Caddy instead, proxy the domain to `127.0.0.1:5001`

## Notes

- Uploaded product images are stored on the VPS filesystem in `UPLOAD_DIR/products`
- If you redeploy from scratch, keep the uploads directory on persistent storage
- The frontend should point `VITE_API_URL` to `https://api.your-domain.com/api`
- Set `VITE_IMAGE_URL` to `https://api.your-domain.com`
