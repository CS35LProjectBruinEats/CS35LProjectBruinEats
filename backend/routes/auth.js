const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const VALID_ROLES = new Set(['student', 'vendor']);

function signToken(user) {
    return jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

function publicUser(user) {
    return { id: user.id, username: user.username, role: user.role };
}

router.post('/signup', async (req, res) => {
    const { username, password, role = 'student' } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    if (!VALID_ROLES.has(role)) {
        return res.status(400).json({ error: 'Role must be either student or vendor' });
    }

    try {
        const existing = await pool.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `INSERT INTO users (username, password_hash, role)
             VALUES ($1, $2, $3)
             RETURNING id, username, role`,
            [username, hashedPassword, role]
        );

        const user = result.rows[0];
        const token = signToken(user);
        res.status(201).json({
            message: 'Account created!',
            token,
            user: publicUser(user),
        });
    } catch (err) {
        console.error('Signup Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = signToken(user);
        res.json({
            message: 'Login successful!',
            token,
            user: publicUser(user),
        });
    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
