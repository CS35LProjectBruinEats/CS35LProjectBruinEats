# Food App Project 

##  Prerequisites
Before starting, ensure your system meets these requirements:
* **Node.js**: Version **20.19+** or **22+**. (Check with `node -v`).
Also install Postgres. Everything in the installer should be left as default, like the port being 5432 and the superuser being postgres. At the end, when it asks if you want to use the stack installer, decline (or just close it if you opened the stack installer).

Note: * **PostgreSQL**: Version 18 recommended(tested with pgAdmin)

---
##  Step-by-Step Setup
### 1. Clone and Branch Selection
1. git clone https://github.com/ChessGamingPro/CS35LProject.git
2. cd CS35LProject

### 2. Backend Initialization

1. Navigate to the backend directory: cd backend
2. Install dependencies: npm install express cors pg bcryptjs jsonwebtoken dotenv
3. Run: npm install --save-dev cross-env dotenv-cli
4. Set up your Environment Variables: Create a file named .env (use .env_example as a template).
5. Set up the database: npm run db:setup

### 3. Frontend Initialization

1. Open a new terminal window and navigate to the frontend directory: cd ../frontend
2. Install dependencies: npm install
3. Install package to concurrently run frontend and backend: npm install npm-run-all --save-dev
4. Install package for map: npm install react-leaflet leaflet

### 4. Running the Application
1. INSIDE the frontend folder: npm run dev
2. To exit: Ctrl+C, then Y to terminate both frontend and backend. 

### 5. Testing
1. INSIDE the backend folder, run: npm run test:setup
    Note that you only need to run this once.
2. Then run: npm run test
