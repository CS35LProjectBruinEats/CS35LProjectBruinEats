require('dotenv').config({ path: '../backend/.env' })
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error('❌ Database connection error:', err.stack);
    else console.log('✅ Database connected successfully');
});

// U1: Signup
app.post('/api/signup', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
            [username, hashedPassword, role]
        );
        res.status(201).json({ message: "User created!", user: newUser.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Signup failed" });
    }
});

// U2: Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userResult.rows.length === 0) return res.status(400).json({ error: "Invalid Credentials" });
        const isMatch = await bcrypt.compare(password, userResult.rows[0].password_hash);
        if (!isMatch) return res.status(400).json({ error: "Invalid Credentials" });
        const token = jwt.sign({ userId: userResult.rows[0].user_id, role: userResult.rows[0].role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { username: userResult.rows[0].username, role: userResult.rows[0].role } });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// U3, U4 & U8: Add Food
app.post('/api/food-opportunities', async (req, res) => {
    const { name, description, date, cost, mealPeriod, username, locationName } = req.body;
    try {
        const user = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
        const newOpp = await pool.query(
            `INSERT INTO foodopps (opp_name, opp_description, opp_date, cost, meal_period_name, creator_user_id, location_name) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, description, date, cost, mealPeriod, user.rows[0].user_id, locationName]
        );
        res.status(201).json({ message: "Food added!", opportunity: newOpp.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Failed to add food" });
    }
});

// U7 & U8: Get Food
app.get('/api/food-opportunities', async (req, res) => {
    const { meal, maxCost } = req.query;
    try {
        let queryText = `
            SELECT f.*, u.username as creator_username 
            FROM foodopps f 
            JOIN users u ON f.creator_user_id = u.user_id 
        `;
        let queryParams = [];
        let conditions = [];
        if (meal && meal !== 'All') {
            queryParams.push(meal);
            conditions.push(`f.meal_period_name = $${queryParams.length}`);
        }
        if (maxCost && maxCost !== '') {
            queryParams.push(maxCost);
            conditions.push(`f.cost <= $${queryParams.length}`);
        }
        if (conditions.length > 0) queryText += " WHERE " + conditions.join(" AND ");
        queryText += " ORDER BY f.opp_date ASC";
        const allOpps = await pool.query(queryText, queryParams);
        res.json(allOpps.rows);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// U5 & U8: Edit
app.put('/api/food-opportunities/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, date, cost, mealPeriod, locationName } = req.body;
    try {
        const updatedOpp = await pool.query(
            `UPDATE foodopps 
             SET opp_name = $1, opp_description = $2, opp_date = $3, cost = $4, meal_period_name = $5, location_name = $6 
             WHERE opp_id = $7 RETURNING *`,
            [name, description, date, cost, mealPeriod, locationName, id]
        );
        res.json({ message: "Opportunity updated!", opportunity: updatedOpp.rows[0] });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// U6: Delete
app.delete('/api/food-opportunities/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM foodopps WHERE opp_id = $1', [id]);
        res.json({ message: "Opportunity deleted successfully!" });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));