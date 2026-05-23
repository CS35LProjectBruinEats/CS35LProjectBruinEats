# Food App Project - Authentication Feature
This branch (`feature/auth-implementation`) contains the implementation for User Stories 1 & 2: User Registration and Login.
##  Prerequisites
Before starting, ensure your system meets these requirements:
* **Node.js**: Version **20.19+** or **22+**. (Check with `node -v`).
Also install Postgres. Everything in the installer should be left as default, like the port being 5432 and the superuser being postgres. At the end, when it asks if you want to use the stack installer, decline (or just close it if you opened the stack installer).
---
##  Step-by-Step Setup
### 1. Clone and Branch Selection
1. git clone https://github.com/ChessGamingPro/CS35LProject.git
2. cd CS35LProject
3. git checkout feature/auth-implementation

### 2. Backend Initialization

1. Navigate to the backend directory: cd backend
2. Install dependencies: npm install express cors pg bcryptjs jsonwebtoken dotenv
3. Set up your Environment Variables: Create a file named .env (use .env_example as a template).

### 3. Database & Schema Setup
   
1. In the terminal :  psql -U postgres 

2. Create the database
 ```sql
CREATE DATABASE foodopp_db;
```

4. Create the users table
 ```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'customer'
);
CREATE TABLE foodopps (
    opp_id SERIAL PRIMARY KEY,
    opp_name VARCHAR(100) NOT NULL,
    opp_description TEXT,
    opp_date DATE,
    cost DECIMAL(10, 2) NOT NULL,
    meal_period_name VARCHAR(50),
    creator_user_id INT,
    location_name VARCHAR(100),
    rsvp_capacity INT,
    FOREIGN KEY (creator_user_id) REFERENCES users(user_id)
);
CREATE TABLE saved_opportunities (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    opp_id INT REFERENCES foodopps(opp_id) ON DELETE CASCADE,
    UNIQUE(user_id, opp_id)
);
CREATE TABLE rsvps (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    opp_id INT REFERENCES foodopps(opp_id) ON DELETE CASCADE,
    UNIQUE(user_id, opp_id)
);
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    opp_id INT REFERENCES foodopps(opp_id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

5. Exit: Type \q and hit Enter.


### 4. Frontend Initialization

1. Open a new terminal window and navigate to the frontend directory: cd ../frontend
2. Install dependencies: npm install
3. Install package to concurrently run frontend and backend: npm install npm-run-all --save-dev
4. Install package for map: npm install react-leaflet leaflet


### 5. Running the Application
1. INSIDE the frontend folder: npm run dev
2. To exit: Ctrl+C, then Y to terminate both frontend and backend. 

### 6. Testing
1. Signup: Create a new account on the registration page.
2. Login: Log in with the credentials you just created.