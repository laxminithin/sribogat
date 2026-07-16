# Local SQL Setup

This project is currently implemented with MongoDB models and controllers.
The files added in this migration phase create the local PostgreSQL foundation
you can mirror later on your VPS.

## 1. Start PostgreSQL locally

Option A: use Prisma's local development database

```bash
cd backend
npm run db:local
```

Option B: use Docker Postgres

```bash
cd backend
docker compose -f docker-compose.sql.yml up -d
```

## 2. Point the backend to SQL

Copy values from `.env.sql.example` into `backend/.env` and set:

```env
DATABASE_URL="postgresql://kissanbandi:kissanbandi_dev_password@localhost:5432/kissanbandi?schema=public"
DB_PROVIDER=postgresql
```

## 3. Create the schema

```bash
cd backend
npm run db:generate
npm run db:migrate -- --name init_postgres
```

## 4. Inspect the database

```bash
cd backend
npm run db:studio
```

## 5. Copy your current MongoDB data into SQL

Make sure both `MONGODB_URI` and `DATABASE_URL` are present in `backend/.env`, then run:

```bash
cd backend
npm run db:migrate-data
```

## Notes

- The Prisma schema in `prisma/schema.prisma` mirrors the current MongoDB
  collections and relations so you can create a clean SQL database locally.
- The runtime controllers are still Mongoose-based, so the API rewrite to use
  Prisma queries is the next migration step.
- Once the local PostgreSQL flow is working, you can reuse the same schema and
  `DATABASE_URL` format on the VPS.
