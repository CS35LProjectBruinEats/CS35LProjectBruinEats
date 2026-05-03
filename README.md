# UCLA Food Opportunity Platform

A platform where UCLA students, clubs, and food vendors can post and discover free or discounted food on campus.

This branch implements User Stories 1–3:
1. Account creation (UCLA student or food vendor)
2. Login
3. Posting food opportunities (location, time, what's served, cost, hosting org)

## Prerequisites

- **Node.js** 20.19+ or 22+ (`node -v` to check)
- **PostgreSQL** running locally

## Setup

### 1. Clone and check out this branch

```sh
git clone https://github.com/ChessGamingPro/CS35LProject.git
cd CS35LProject
```

### 2. Start the backend

```sh
cd backend
./start.sh
```

`start.sh` handles first-time setup automatically:

- installs npm dependencies if `node_modules` is missing
- creates `.env` from `env_example` if it doesn't exist, defaulting `DB_USER` to your current login user and generating a random `JWT_SECRET`
- creates the `foodopp_db` database and loads `schema.sql` if the database or its tables are missing
- starts the backend (`node index.js`)

It checks that `node` and `psql` are available and that PostgreSQL is reachable, and exits with a hint if not (e.g. `brew services start postgresql`).

If you'd rather configure things by hand, edit `backend/.env` before running `start.sh` — it only fills in defaults when the file is absent.

`schema.sql` creates two tables:

- `users` — id, username, password_hash, role (`student` or `vendor`)
- `food_opportunities` — id, vendor_id (FK), title, description, food_items, cost, organization, location, start_time, end_time, created_at

> If you set up an earlier version of this project, the `users` table previously had a column named `password` and a default role of `customer`. Re-running `schema.sql` will drop and recreate both tables — back up any data you want to keep first.

### 3. Start the frontend

In another terminal:

```sh
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (typically http://localhost:5173).

## Trying it out

1. **Sign up** — pick "UCLA student" or "Food vendor / club".
2. **Post an opportunity** — fill out title, location, start/end time, food items, cost, etc.
3. **Browse** — your post appears in the list, visible to everyone.
4. **Log out** and log back in to confirm credentials are persisted.

## API

| Method | Path                  | Auth      | Purpose                          |
| ------ | --------------------- | --------- | -------------------------------- |
| POST   | `/api/signup`         | —         | Create account; returns JWT      |
| POST   | `/api/login`          | —         | Authenticate; returns JWT        |
| GET    | `/api/opportunities`  | —         | List all food opportunities      |
| POST   | `/api/opportunities`  | Bearer    | Post a new food opportunity      |

Authenticated requests use `Authorization: Bearer <jwt>`. The frontend's axios instance attaches it automatically from `localStorage`.

## Project layout

```
backend/
  start.sh              # one-shot setup + run script
  index.js              # express app + router mounting
  db.js                 # pg pool
  schema.sql            # database schema
  env_example           # template for .env
  middleware/auth.js    # JWT verification middleware
  routes/auth.js        # /signup, /login
  routes/opportunities.js # GET / POST food opportunities

frontend/src/
  App.jsx               # auth state + dashboard layout
  api.js                # axios instance with auth interceptor
  components/
    AuthForm.jsx        # signup/login (with role)
    OpportunityForm.jsx # create form
    OpportunityList.jsx # browse list
```
