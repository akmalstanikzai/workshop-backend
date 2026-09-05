# Workshop backend

Express API backed by local PostgreSQL with local JWT authentication.

## Configuration

Copy `.env.example` to `.env`, set the local PostgreSQL connection and use a random `JWT_SECRET` of at least 32 characters. Run `npm run migrate:up` to create the database tables.

## API

All routes except health and login require `Authorization: Bearer <access token>`.

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET|POST /api/users` (admin)
- `GET|POST /api/customers`, `GET|PATCH|DELETE /api/customers/:id`
- `POST /api/customers/:id/items`, `POST /api/customers/:id/parts`
- `GET|POST /api/workshop-jobs`, `GET|PATCH|DELETE /api/workshop-jobs/:id`
- `GET|POST /api/parts`, `GET|PATCH|DELETE /api/parts/:id`
- `GET|POST /api/part-sales`
- `GET|POST /api/payments`

The local schema mirrors the supplied design. User references point to the existing local `users` table, and a read-only `profiles` view provides the corresponding profile shape.
