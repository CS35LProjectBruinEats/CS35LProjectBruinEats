# Food App Project - Authentication Feature
This branch (`feature/auth-implementation`) contains the implementation for User Stories 1 & 2: User Registration and Login.
##  Prerequisites
Before starting, ensure your system meets these requirements:
* **Node.js**: Version **20.19+** or **22+**. (Check with `node -v`).
---
##  Step-by-Step Setup
### 1. Clone and Branch Selection
git clone https://github.com/ChessGamingPro/CS35LProject.git
cd CS35LProject
git checkout feature/auth-implementation

###2. Backend Initialization

Navigate to the backend directory: cd backend
Install dependencies: npm install express cors pg bcryptjs jsonwebtoken dotenv
Set up your Environment Variables:
Create a file named .env.
Use .env_example as a template.
Update DB_USER with your macOS/local machine username.

###3. Database & Schema Setup
   
Use the psql command-line tool to set up your local database:
Open psql:
In the terminal :

 psql postgres
Execute SQL Commands:
 SQL

 -- Create the database
CREATE DATABASE foodopp_db;

-- Connect to the database
\c foodopp_db

-- Create the users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'customer'
);
Exit: Type \q and hit Enter.



###4. Frontend Initialization

Open a new terminal window and navigate to the frontend directory: cd ../frontend
Install dependencies: npm install
 Running the Application
Start the Server (Backend)
In the backend folder: node index.js
Start the Client (Frontend)
In the frontend folder: npm run dev

###5. Testing
Signup: Create a new account on the registration page.
Login: Log in with the credentials you just created.


