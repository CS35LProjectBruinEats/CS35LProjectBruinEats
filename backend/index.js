
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./db');
require('dotenv').config();

const jwt = require('jsonwebtoken');

const app = express();


// Middleware
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION CHECK ---
// This ensures your Node app can actually talk to Postgres on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection error:', err.stack);
    } else {
        console.log('✅ Database connected successfully at:', res.rows[0].now);
    }
});

// --- ROUTES ---

// User Story 1: Create an Account [cite: 11-15]
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Check if username is already taken [cite: 16-18]
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: "Username already taken" });
        }

        // 2. Hash the password (security best practice)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Insert user into database [cite: 15]
        const newUser = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );

        res.status(201).json({ message: "User created!", user: newUser.rows[0] });
    } catch (err) {
        console.error('Signup Error:', err.message);
        res.status(500).send("Server Error");
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Check if user exists
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid Credentials" });
        }

        const user = userResult.rows[0];

        // 2. Compare hashed password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid Credentials" });
        }

        // 3. Create a JWT Token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ message: "Login successful!", token });
    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).send("Server Error");
    }
});


// --- SERVER INITIALIZATION ---
const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// Handle Port Conflicts (like the macOS AirPlay issue on 5000)
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', err);
    }
});