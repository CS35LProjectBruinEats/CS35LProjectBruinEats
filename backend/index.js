const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// --- AUTHENTICATION ---

app.post('/api/signup', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length !== 0) return res.status(400).json({ error: "Username already taken." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING user_id, username, role',
            [username, hashedPassword, role || 'customer']
        );
        res.status(201).json({ message: "User created!", user: newUser.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(400).json({ error: "Invalid Username" });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: "Invalid Password" });

        const token = jwt.sign({ userId: user.user_id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // We send back user_id and username so the frontend can post correctly
        res.json({ token, user: { id: user.user_id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FOOD OPPORTUNITIES (Stories 3, 4, 7, 8) ---

app.get('/api/food-opportunities', async (req, res) => {
    const { meal, maxCost, username } = req.query;
    try {
        // Look up viewer's user_id (if any) so we can attach per-user RSVP state
        let viewerId = null;
        if (username) {
            const viewer = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
            if (viewer.rows.length > 0) viewerId = viewer.rows[0].user_id;
        }

        // We JOIN with users so the frontend can see the 'creator_username'.
        // Subqueries return current RSVP count and whether the viewer has RSVPed.
        let query = `
            SELECT f.*, u.username as creator_username,
                   (SELECT COUNT(*)::int FROM rsvps r WHERE r.opp_id = f.opp_id) AS rsvp_count,
                   CASE WHEN $1::int IS NULL THEN false
                        ELSE EXISTS(SELECT 1 FROM rsvps r WHERE r.opp_id = f.opp_id AND r.user_id = $1::int)
                   END AS user_has_rsvped
            FROM foodopps f
            JOIN users u ON f.creator_user_id = u.user_id
            WHERE 1=1`;
        let params = [viewerId];

        if (meal && meal !== 'All') {
            params.push(meal);
            query += ` AND f.meal_period_name = $${params.length}`;
        }
        if (maxCost) {
            params.push(maxCost);
            query += ` AND f.cost <= $${params.length}`;
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/food-opportunities', async (req, res) => {
    const { name, description, date, cost, mealPeriod, locationName, username, rsvpCapacity } = req.body;
    try {
        // First, find the user_id for the username provided
        const userRes = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
        const userId = userRes.rows[0].user_id;

        const capacity = rsvpCapacity === '' || rsvpCapacity === undefined || rsvpCapacity === null
            ? null
            : Number(rsvpCapacity);

        const result = await pool.query(
            `INSERT INTO foodopps (opp_name, opp_description, opp_date, cost, meal_period_name, location_name, creator_user_id, rsvp_capacity)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, description, date, cost, mealPeriod, locationName, userId, capacity]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- EDIT & DELETE (Stories 5, 6) ---

app.put('/api/food-opportunities/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, date, cost, mealPeriod, locationName, rsvpCapacity } = req.body;
    try {
        const capacity = rsvpCapacity === '' || rsvpCapacity === undefined || rsvpCapacity === null
            ? null
            : Number(rsvpCapacity);
        await pool.query(
            `UPDATE foodopps SET opp_name=$1, opp_description=$2, opp_date=$3, cost=$4, meal_period_name=$5, location_name=$6, rsvp_capacity=$7
             WHERE opp_id=$8`,
            [name, description, date, cost, mealPeriod, locationName, capacity, id]
        );
        res.json({ message: "Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/food-opportunities/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM foodopps WHERE opp_id = $1', [req.params.id]);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Save an opportunity to personal schedule (story 9) ---
// Save an opportunity
app.post('/api/saved', async (req, res) => {
    const { username, opp_id } = req.body;
    try {
        const user = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
        await pool.query(
            'INSERT INTO saved_opportunities (user_id, opp_id) VALUES ($1, $2)',
            [user.rows[0].user_id, opp_id]
        );
        res.json({ message: 'Saved!' });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Already saved' });
        res.status(500).send('Server error');
    }
});

//Remove an opportunity from schedule
app.delete('/api/saved', async (req, res) => {
    const { username, opp_id } = req.body;
    try {
        const user = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
        await pool.query(
            'DELETE FROM saved_opportunities WHERE user_id = $1 AND opp_id = $2',
            [user.rows[0].user_id, opp_id]
        );
        res.json({ message: 'Deleted from schedule' });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Get saved opportunities for a user
app.get('/api/saved', async (req, res) => {
    const { username } = req.query;
    try {
        const user = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
        const result = await pool.query(
            'SELECT f.* FROM foodopps f JOIN saved_opportunities s ON f.opp_id = s.opp_id WHERE s.user_id = $1',
            [user.rows[0].user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// --- RSVP (story 10) ---

app.post('/api/rsvp', async (req, res) => {
    const { username, opp_id } = req.body;
    const client = await pool.connect();
    try {
        const user = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
        if (user.rows.length === 0) return res.status(400).json({ error: 'User not found' });
        const userId = user.rows[0].user_id;

        // Lock the opportunity row so capacity check and insert are atomic
        await client.query('BEGIN');
        const opp = await client.query('SELECT rsvp_capacity FROM foodopps WHERE opp_id = $1 FOR UPDATE', [opp_id]);
        if (opp.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Opportunity not found' });
        }
        const capacity = opp.rows[0].rsvp_capacity;
        if (capacity !== null) {
            const count = await client.query('SELECT COUNT(*)::int AS n FROM rsvps WHERE opp_id = $1', [opp_id]);
            if (count.rows[0].n >= capacity) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Event is full' });
            }
        }
        await client.query('INSERT INTO rsvps (user_id, opp_id) VALUES ($1, $2)', [userId, opp_id]);
        await client.query('COMMIT');
        res.json({ message: 'RSVP confirmed' });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        if (err.code === '23505') return res.status(400).json({ error: 'Already RSVPed' });
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.delete('/api/rsvp', async (req, res) => {
    const { username, opp_id } = req.body;
    try {
        const user = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
        if (user.rows.length === 0) return res.status(400).json({ error: 'User not found' });
        const result = await pool.query(
            'DELETE FROM rsvps WHERE user_id = $1 AND opp_id = $2',
            [user.rows[0].user_id, opp_id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'No RSVP to cancel' });
        res.json({ message: 'RSVP cancelled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));