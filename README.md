# Food App Project - Authentication Feature
This branch (`feature/auth-implementation`) contains the implementation for User Stories 1 & 2: User Registration and Login.
##  Prerequisites
Before starting, ensure your system meets these requirements:
* **Node.js**: Version **20.19+** or **22+**. (Check with `node -v`).
---
##  Step-by-Step Setup
### 1. Clone and Branch Selection
1. git clone https://github.com/ChessGamingPro/CS35LProject.git
2. cd CS35LProject
3. git checkout feature/auth-implementation

### 2. Backend Initialization

1. Navigate to the backend directory: cd backend
2. Install dependencies: npm install express cors pg bcryptjs jsonwebtoken dotenv
3. Set up your Environment Variables:
4. Create a file named .env.
5. Use .env_example as a template.
6. Update DB_USER with your macOS/local machine username.

### 3. Database & Schema Setup
   
1. Use the psql command-line tool to set up your local database:
Open psql:
In the terminal :  psql postgres 

2. Create the database
 ```sql
CREATE DATABASE foodopp_db;
```
3.  Connect to the database: 
   \c foodopp_db

4. Create the users table
 ```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'customer'
);
```

5. Exit: Type \q and hit Enter.



### 4. Frontend Initialization

1. Open a new terminal window and navigate to the frontend directory: cd ../frontend
2. Install dependencies: npm install


### 5. Running the Application
1. In the backend folder: node index.js
2. In the frontend folder: npm run dev

### 6. Testing
1. Signup: Create a new account on the registration page.
2. Login: Log in with the credentials you just created.


