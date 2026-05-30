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

// --- JWT VERIFICATION MIDDLEWARE ---
// Reads the Bearer token, verifies its signature, and attaches the
// authenticated user to req.user. Routes that act on a user's behalf must
// derive identity from here, never from a username in the request body.
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = payload;
        next();
    });
}

// Authorize by role. Use after authenticateToken so req.user is populated.
function requireRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: `Forbidden: ${role} role required` });
        }
        next();
    };
}

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

        const token = jwt.sign({ userId: user.user_id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // We send back user_id and username so the frontend can post correctly
        res.json({ token, user: { id: user.user_id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FOOD OPPORTUNITIES (Stories 3, 4, 7, 8) ---

app.get('/api/food-opportunities', authenticateToken, async (req, res) => {
    const { meal, maxCost } = req.query;
    try {
        // Viewer comes from the verified token, used to attach per-user RSVP state.
        const viewerId = req.user.userId;

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

        query += ` ORDER BY f.opp_date ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/food-opportunities', authenticateToken, requireRole('vendor'), async (req, res) => {
    const { name, description, date, cost, mealPeriod, locationName, rsvpCapacity } = req.body;
    try {
        // Creator comes from the verified token.
        const userId = req.user.userId;

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

app.put('/api/food-opportunities/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, description, date, cost, mealPeriod, locationName, rsvpCapacity } = req.body;
    try {
        // Ownership check: only the creator may edit this listing.
        const existing = await pool.query('SELECT creator_user_id FROM foodopps WHERE opp_id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });
        if (existing.rows[0].creator_user_id !== req.user.userId) {
            return res.status(403).json({ error: 'You can only edit your own listings' });
        }

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

app.delete('/api/food-opportunities/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Ownership check: only the creator may delete this listing.
        const existing = await pool.query('SELECT creator_user_id FROM foodopps WHERE opp_id = $1', [id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });
        if (existing.rows[0].creator_user_id !== req.user.userId) {
            return res.status(403).json({ error: 'You can only delete your own listings' });
        }

        await pool.query('DELETE FROM foodopps WHERE opp_id = $1', [id]);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Save an opportunity to personal schedule (story 9) ---
// Save an opportunity
/*GenAI prompt: Write me a psql statement that can add a new row to the saved_opportunities table, which has the primary key id and two columns: user_id and opp_id.
I also want to be able to catch the error of whether an item has already been saved (that user_id + opp_id pair is already in the table).
app.post('/api/saved', async (req, res) => {
    const { username, opp_id } = req.body;
    try {
        const user = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
        await pool.query(
            [todo]
        );
        res.json({ message: 'Saved!' });
    } catch (err) {
        [todo]
        res.status(500).json({ error: err.message });
    }
});

GenAI response:
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
        res.status(500).json({ error: err.message });
    }
});

Reflection: For the first todo, I was just using AI to bypass implementing the psql syntax myself, since it was explicitly stated in class that this is not a requirement for this class.
For the second, the AI gave me the error code "23505". A quick google search told me that this is the psql error code for a unique_violation, which is what I needed. 
Both of the solutions provided by the AI were exactly what I was looking for, so I decided to adopt both. 
*/
app.post('/api/saved', authenticateToken, async (req, res) => {
    const { opp_id } = req.body;
    try {
        await pool.query(
            'INSERT INTO saved_opportunities (user_id, opp_id) VALUES ($1, $2)',
            [req.user.userId, opp_id]
        );
        res.json({ message: 'Saved!' });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Already saved' });
        res.status(500).json({ error: err.message });
    }
});

//Remove an opportunity from schedule
app.delete('/api/saved', authenticateToken, async (req, res) => {
    const { opp_id } = req.body;
    try {
        await pool.query(
            'DELETE FROM saved_opportunities WHERE user_id = $1 AND opp_id = $2',
            [req.user.userId, opp_id]
        );
        res.json({ message: 'Deleted from schedule' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get saved opportunities for a user
/*GenAI prompt: Write me a psql statement that can get the saved opportunities for a user:
app.get('/api/saved', async (req, res) => {
    const { username } = req.query;
    try {
        const user = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
        await pool.query(
            [todo]
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

GenAI response:
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
        res.status(500).json({ error: err.message });
    }
});
The SQL joins foodopps and saved_opportunities together so you get the full food opportunity details (name, cost, date, etc.) rather than just the IDs.

Reflection: 
I was just using AI to bypass implementing the psql syntax myself, since it was explicitly stated in class that this is not a requirement for this class.
I realized that my approach was slightly incorrect, as I had to save the result in a const so that I could actually display it.
This AI response was exactly what I needed, so I decided to integrate it into my program.
I also later added "ORDER BY f.opp_date ASC" based on a google search so that the schedule is in chronological order.
*/
app.get('/api/saved', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT f.* FROM foodopps f JOIN saved_opportunities s ON f.opp_id = s.opp_id WHERE s.user_id = $1 ORDER BY f.opp_date ASC',
            [req.user.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RSVP (story 10) ---

app.post('/api/rsvp', authenticateToken, async (req, res) => {
    const { opp_id } = req.body;
    const client = await pool.connect();
    try {
        const userId = req.user.userId;

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

app.delete('/api/rsvp', authenticateToken, async (req, res) => {
    const { opp_id } = req.body;
    try {
        const result = await pool.query(
            'DELETE FROM rsvps WHERE user_id = $1 AND opp_id = $2',
            [req.user.userId, opp_id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'No RSVP to cancel' });
        res.json({ message: 'RSVP cancelled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- COMMENTS (story 11) ---

app.get('/api/comments', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.comment_id, c.opp_id, c.comment_text, c.created_at, u.username
             FROM comments c
             JOIN users u ON c.user_id = u.user_id
             ORDER BY c.created_at ASC`
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/comments', authenticateToken, async (req, res) => {
    const { opp_id, text } = req.body;
    if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Comment is empty' });
    }
    try {
        // Author comes from the verified token, not the request body.
        const inserted = await pool.query(
            `INSERT INTO comments (user_id, opp_id, comment_text) VALUES ($1, $2, $3)
             RETURNING comment_id, opp_id, comment_text, created_at`,
            [req.user.userId, opp_id, text.trim()]
        );
        res.status(201).json({ ...inserted.rows[0], username: req.user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5001;
// Only start the HTTP server when run directly (node index.js). When the app is
// required by the test suite, we export it so Supertest can drive it in-process.
if (require.main === module) {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;