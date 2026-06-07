# SifaloPay Mini E-Commerce (Payment Testing Harness)

A complete, production-ready **full-stack mini e-commerce application** built to
test the [SifaloPay](https://sifalopay.com/) payment gateway end to end before
integrating it into a larger production system.

It is intentionally small (two `$0.10` test products) but follows real-world
architecture: a secure, modular Express + Prisma backend and a polished React +
Vite + Tailwind frontend. A built-in **TEST MODE** lets you exercise the whole
order → payment → webhook → status flow with **no real charges and no real
credentials**, then swap in live SifaloPay keys later **without touching any
source code**.

> ⚠️ **TEST ENVIRONMENT - NO REAL PRODUCTS.** This app is for payment
> integration testing only.

---

## Tech Stack

| Layer     | Technologies                                                        |
| --------- | ------------------------------------------------------------------- |
| Frontend  | React.js, Vite, Tailwind CSS, Axios, React Router                    |
| Backend   | Node.js, Express.js, Axios, dotenv, cors                             |
| Database  | PostgreSQL + Prisma ORM                                              |
| Security  | Helmet, express-rate-limit, Zod validation, CORS, env-based secrets  |
| Logging   | Winston (app/payment/webhook/error) + Morgan (HTTP request logging)  |

---

## Project Structure

```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Product, Order, Payment, WebhookEvent models
│   │   ├── migrations/            # Database migrations
│   │   └── seed.js                # Seeds the 2 test products
│   ├── src/
│   │   ├── config/                # env config, logger, prisma client
│   │   ├── controllers/           # product, payment, webhook, admin
│   │   ├── middleware/            # validation, rate limiting, errors, logging
│   │   ├── routes/                # API route definitions
│   │   ├── services/              # sifalopay.service.js (gateway client + TEST MODE)
│   │   ├── utils/                 # ApiError, asyncHandler, Zod validators
│   │   ├── app.js                 # Express app (security, middleware, routes)
│   │   └── server.js              # HTTP server + graceful shutdown
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/                   # axios client + typed service calls
    │   ├── components/            # Navbar, ProductCard, CheckoutModal, etc.
    │   ├── pages/                 # Home, Status, Admin
    │   ├── lib/                   # formatting helpers
    │   ├── App.jsx                # routes + layout
    │   └── main.jsx
    └── .env.example
```

---

## Quick Start

### Prerequisites

- Node.js 18+ (tested on Node 22)
- PostgreSQL 14+ running locally (or a connection string to a remote instance)

### 1. Backend

```bash
cd backend
cp .env.example .env          # then edit DATABASE_URL (and SifaloPay keys if going live)
npm install
npm run prisma:generate
npm run prisma:migrate        # creates tables (use prisma:deploy in production)
npm run seed                  # inserts the 2 test products
npm run dev                   # http://localhost:4000
```

A one-shot helper for non-dev environments:

```bash
npm run db:setup              # prisma migrate deploy + seed
npm start
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env          # VITE_API_URL defaults to /api (proxied to the backend)
npm install
npm run dev                   # http://localhost:5173
```

Open <http://localhost:5173>, click **Buy Now**, fill in the checkout form and
**Proceed To Payment**. In TEST MODE you'll get an in-app payment prompt; click
**Approve Payment** to drive a (simulated) webhook and land on the success page.

---

## Environment Configuration

All SifaloPay settings are read from environment variables, so keys/endpoints
can be rotated **without code changes**. See `backend/.env.example` for the full,
commented list. Key variables:

| Variable                | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                                  |
| `SIFALO_API_KEY`        | SifaloPay API key (from the merchant dashboard)               |
| `SIFALO_SECRET_KEY`     | SifaloPay secret key                                          |
| `SIFALO_BASE_URL`       | API base URL                                                  |
| `SIFALO_MERCHANT_ID`    | Merchant identifier                                           |
| `SIFALO_CREATE_PATH`    | Create-payment endpoint path (override-able)                  |
| `SIFALO_VERIFY_PATH`    | Verify-payment endpoint path (override-able)                  |
| `SIFALO_WEBHOOK_SECRET` | Secret used to validate inbound webhook signatures (HMAC)     |
| `SIFALO_CALLBACK_URL`   | Public URL SifaloPay calls back with payment events           |
| `SIFALO_RETURN_URL`     | Where the customer is redirected after paying                 |
| `TEST_MODE`             | `true` = fully simulated payments (no network, no charges)    |
| `TEST_AMOUNT`           | The safe test amount (`0.10`)                                 |
| `CORS_ORIGIN`           | Comma-separated allowed frontend origins                      |

> **Security:** secret keys live only in the backend `.env`. They are **never**
> sent to or exposed in the frontend. The frontend only ever knows the public
> `VITE_API_URL`.

### Going live (real SifaloPay)

1. Set `TEST_MODE=false`.
2. Fill in `SIFALO_API_KEY`, `SIFALO_SECRET_KEY`, `SIFALO_MERCHANT_ID`,
   `SIFALO_WEBHOOK_SECRET` and confirm `SIFALO_BASE_URL` / endpoint paths.
3. Point `SIFALO_CALLBACK_URL` at a publicly reachable URL
   (`/api/webhooks/sifalopay`).

No source code changes are required — the client in
`backend/src/services/sifalopay.service.js` reads everything from config.

---

## API Reference

Base path: `/api`

| Method | Endpoint                     | Description                                        |
| ------ | ---------------------------- | -------------------------------------------------- |
| GET    | `/health`                    | Health check + test-mode flag                      |
| GET    | `/config`                    | Public, non-sensitive config (test mode, amount)   |
| GET    | `/products`                  | List products                                      |
| GET    | `/products/:id`              | Get one product                                    |
| POST   | `/payment/create`            | Create order + initiate SifaloPay payment          |
| POST   | `/payment/verify`            | Poll SifaloPay and reconcile order status          |
| GET    | `/payment/status/:id`        | Get order/payment status (by order or txn id)      |
| POST   | `/webhooks/sifalopay`        | Secure webhook receiver (signature + idempotency)  |
| POST   | `/payment/simulate`          | **TEST MODE** helper: build a sample webhook payload|
| GET    | `/admin/stats`               | Dashboard totals                                   |
| GET    | `/admin/orders`              | Paginated, searchable, status-filterable orders    |

### Example: create a payment

```bash
curl -X POST http://localhost:4000/api/payment/create \
  -H 'Content-Type: application/json' \
  -d '{
    "productId": 1,
    "customerName": "Jane Doe",
    "customerEmail": "jane@example.com",
    "customerPhone": "252612345678"
  }'
```

---

## Order Workflow

1. User selects a product on the homepage.
2. The checkout modal opens and collects name, phone, email.
3. User submits the payment request (`POST /api/payment/create`).
4. Backend creates a `PENDING` order + payment record.
5. Backend asks SifaloPay to create a payment intent and stores the transaction id.
6. User receives a payment prompt (real EVC/Zaad/card prompt in live mode; an
   in-app prompt in TEST MODE).
7. User approves the payment.
8. SifaloPay fires a webhook to `/api/webhooks/sifalopay`.
9. The webhook is validated, logged, de-duplicated and the order moves to `PAID`.
10. The customer sees the success / status page.

---

## Data Models (Prisma)

- **Product** — `id`, `name`, `price`, `createdAt`
- **Order** — `id`, `customerName`, `customerEmail`, `customerPhone`, `amount`,
  `status`, `transactionId`, `createdAt`
- **Payment** — `id`, `orderId`, `provider`, `transactionId`, `amount`, `status`,
  `rawResponse`, `createdAt`
- **WebhookEvent** — stores every inbound webhook payload for auditing and
  idempotent processing.

---

## Security

- **Helmet** sets secure HTTP headers.
- **Rate limiting** globally (`/api`) and stricter on `/payment/create`.
- **Input validation** with Zod on every write/query endpoint.
- **Environment-based secrets** — API keys never reach the browser.
- **CORS** restricted to configured origins.
- **HMAC-SHA256 webhook signature** verification with constant-time comparison.

## Logging

Winston-based structured logging covers application, payment, webhook and error
events; Morgan logs every HTTP request. Logs are human-readable in development
and JSON in production.

## Error Handling

Friendly, consistent JSON errors for: invalid phone/email, invalid amount,
missing product, network failure, API timeout, gateway/payment rejection,
duplicate transactions and rate limiting. The frontend surfaces these as
inline, user-friendly messages.

---

## Admin Dashboard

Visit `/admin` for: total orders, successful/pending/failed counts, total
collected, and a searchable, status-filterable, paginated recent-transactions
table.

## License

MIT — for testing and integration purposes.
