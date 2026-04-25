## Feature: Authentication (User Stories 1 & 2)

### 1. Database Setup
Ensure PostgreSQL is running and create the `users` table:
\`\`\`sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'student'
);
\`\`\`

### 2. Environment Variables
Create a `.env` file in the `backend` folder:
\`\`\`text
DATABASE_URL=postgres://localhost:5432/foodapp_db
JWT_SECRET=your_random_secret_string
PORT=5001
\`\`\`

### 3. Running Locally
- **Backend:** `cd backend && npm install && node index.js`
- **Frontend:** `cd frontend && npm install && npm run dev`
