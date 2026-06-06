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
// GenAI Prompt:
// For my cs35l project I need to write a /api/signup endpoint. It should get
// the username, password, and role from the request body. It should check if the
// username is already used and if so return an error. If it is not being used, it should //hash the password before storing it,
//  insert the new user into the database with the //hashed password and role, and return the created user. Here is the breakdown:
//
// app.post('/api/signup', async (req, res) => {
//     const { username, password, role } = req.body;
//     try {
//         // todo: check if username already exists, return error if so
//         // todo: hash the password using bcrypt
//         // todo: insert new user into the database
//         // todo: return the created user
//     } 
// });
//
// GenAI Response:
// app.post('/api/signup', async (req, res) => {
//     const { username, password, role } = req.body;
//     try {
//         const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
//         if (result.rows.length !== 0) return res.status(400).json({ error: "Username already taken." });
//
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);
//         const newUser = await pool.query(
//             'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING user_id, username, role',
//             [username, hashedPassword, role || 'customer']
//         );
//         res.status(201).json({ message: "User created!", user: newUser.rows[0] });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
//
// My Reflection:
// The GenAI separates password hashing into two steps. First generating a
// salt with bcrypt.genSalt(10), then hashing the password with that salt. 
// Storing the raw password was not a good option so hashing it before inserting is
// very important for security so that even if the database is compromised, passwords
// are not revealed.  I adopted this response as-is because it  correctly handled all the signup requirements including 
// security concerns.


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
// GenAI Prompt:
// For my project I must write a /api/login endpoint. It should get
// the username and password from the request body. It should check if the username
//already exists in the database and return an error if it doesn't. It should then compare 
// the provided password against the stored hashed password and return an error if they
// don't match. If successful, it should generate a JWT token containing the user's id,
// username and role, and return it along with the user's details. Here is the skeleton:
//
// app.post('/api/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         // todo: check if username exists, return error if not
//         // todo: compare password with stored hash, return error if no match
//         // todo: return token and user details
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
//
// GenAI Response:
// app.post('/api/login', async (req, res) => {
//     const { username, password } = req.body;
//     try {
//         const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
//         if (result.rows.length === 0) return res.status(400).json({ error: "Invalid Username" });
//
//         const user = result.rows[0];
//         const isMatch = await bcrypt.compare(password, user.password_hash);
//         if (!isMatch) return res.status(400).json({ error: "Invalid Password" });
//
//         const token = jwt.sign(
//             { userId: user.user_id, username: user.username, role: user.role },
//             process.env.JWT_SECRET,
//             { expiresIn: '1h' }
//         );
//         res.json({ token, user: { id: user.user_id, username: user.username, role: user.role } });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
//
//My Reflection:
// The GenAI uses bcrypt.compare() to check the submitted password against
// the stored hash rather than hashing the input and comparing strings directly,
// which is the proper and secure way to verify bcrypt hashes. I used this response like it is since it correctly handled all
// the login and security requirements.

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
// GenAI Prompt:
// For my project I need to write a GET /api/food-opportunities endpoint.
// It should return all food opportunities, and support optional filtering by meal
// period and maximum cost using query parameters. Each opportunity should also //include the creator's username. Here is the skeleton:
//
// app.get('/api/food-opportunities', authenticateToken, async (req, res) => {
//     const { meal, maxCost } = req.query;
//     try {
//         const viewerId = req.user.userId;
//         // todo: build a query that joins foodopps with users to get creator username
//         // todo: include a subquery for rsvp count per opportunity
//         // todo: include a subquery for whether the viewer has rsvped
//         // todo: dynamically add meal and maxCost filters if provided
//         // todo: return results ordered by date
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
//
// GenAI Response:
// app.get('/api/food-opportunities', authenticateToken, async (req, res) => {
//     const { meal, maxCost } = req.query;
//     try {
//         const viewerId = req.user.userId;
//         let query = `
//             SELECT f.*, u.username as creator_username,
//                    (SELECT COUNT(*)::int FROM rsvps r WHERE r.opp_id = f.opp_id) AS rsvp_count,
//                    CASE WHEN $1::int IS NULL THEN false
//                         ELSE EXISTS(SELECT 1 FROM rsvps r WHERE r.opp_id = f.opp_id AND r.user_id = $1::int)
//                    END AS user_has_rsvped
//             FROM foodopps f
//             JOIN users u ON f.creator_user_id = u.user_id
//             WHERE 1=1`;
//         let params = [viewerId];
//
//         if (meal && meal !== 'All') {
//             params.push(meal);
//             query += ` AND f.meal_period_name = $${params.length}`;
//         }
//         if (maxCost) {
//             params.push(maxCost);
//             query += ` AND f.cost <= $${params.length}`;
//         }
//         query += ` ORDER BY f.opp_date ASC`;
//
//         const result = await pool.query(query, params);
//         res.json(result.rows);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
//
//My Reflection:
// This response uses a dynamic query building pattern starting with WHERE 1=1, which 
// is a common technique that allows filters to be appended with AND without checking
// if it is the first condition or not. Parameters are pushed
// dynamically and referenced by index using $${params.length}, which is the correct
// way to build parameterized queries in PostgreSQL to prevent SQL injection. I
// used this response  since it cleanly handled filtering and per-user state in a single //query.


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
// GenAI Prompt:
// For my cs35l project I need to write a POST /api/food-opportunities endpoint for user stories 3,4,7,8.
// It should only be accessible to vendors. It should get the food opportunity
// details from the request body, extract the creator's id from the verified token,  insert 
// the new opportunity into the database, and return the created record. 

// app.post('/api/food-opportunities', authenticateToken, requireRole('vendor'), async (req, res) => {
//     const { name, description, date, cost, mealPeriod, locationName, rsvpCapacity } = req.body;
//     try {
//         // todo: get creator user id from token
//         // todo: convert empty rsvpCapacity to null
//         // todo: insert into foodopps table and return the new record
//     } 
// });
//
// GenAI Response:
// app.post('/api/food-opportunities', authenticateToken, requireRole('vendor'), async (req, res) => {
//     const { name, description, date, cost, mealPeriod, locationName, rsvpCapacity } = req.body;
//     try {
//         const userId = req.user.userId;
//         const capacity = rsvpCapacity === '' || rsvpCapacity === undefined || rsvpCapacity === null
//             ? null
//             : Number(rsvpCapacity);
//         const result = await pool.query(
//             `INSERT INTO foodopps (opp_name, opp_description, opp_date, cost, meal_period_name, location_name, creator_user_id, rsvp_capacity)
//              VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
//             [name, description, date, cost, mealPeriod, locationName, userId, capacity]
//         );
//         res.status(201).json(result.rows[0]);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
//
// My Reflection:
// This code correctly derives the creator's identity from req.user.userId rather than
// accepting a user id in the request body. This is important for security because
// a user should not be able to claim they are someone else by passing a different id
// in the body. I used this response  because it 
// handled all the creation and security requirements.

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
// GenAI Prompt:
// For my project I need to write a PUT /api/food-opportunities/:id endpoint
// for user stories 5 and 6. It should update an existing food opportunity. However,before
//updating, it should check that the opportunity already exists and that the logged in user
//  created it,and returning errors if either check fails. 
//
// app.put('/api/food-opportunities/:id', authenticateToken, async (req, res) => {
//     const { id } = req.params;
//     const { name, description, date, cost, mealPeriod, locationName, rsvpCapacity } = req.body;
//     try {
//         // todo: check opportunity exists, return 404 if not
//         // todo: check logged in user is the creator, return 403 if not
//         // todo: convert empty rsvpCapacity to null
//         // todo: update the record in the database
//     }
// });
//
// GenAI Response:
// app.put('/api/food-opportunities/:id', authenticateToken, async (req, res) => {
//     const { id } = req.params;
//     const { name, description, date, cost, mealPeriod, locationName, rsvpCapacity } = req.body;
//     try {
//         const existing = await pool.query('SELECT creator_user_id FROM foodopps WHERE opp_id = $1', [id]);
//         if (existing.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });
//         if (existing.rows[0].creator_user_id !== req.user.userId) {
//             return res.status(403).json({ error: 'You can only edit your own listings' });
//         }
//         const capacity = rsvpCapacity === '' || rsvpCapacity === undefined || rsvpCapacity === null
//             ? null
//             : Number(rsvpCapacity);
//         await pool.query(
//             `UPDATE foodopps SET opp_name=$1, opp_description=$2, opp_date=$3, cost=$4, meal_period_name=$5, location_name=$6, rsvp_capacity=$7
//              WHERE opp_id=$8`,
//             [name, description, date, cost, mealPeriod, locationName, capacity, id]
//         );
//         res.json({ message: "Updated" });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
//
// My Reflection:
// The GenAi correctly performs an check for ownership before allowing the update. It first queries only the creator_user_id from the record 
// rather than selecting all columns, which is more efficient since that is the only field needed for the check. The two
// checks are done in sequence — existence first, then ownership — so that a 404 is
// returned for missing records and a 403 is returned specifically when the record
// exists but belongs to a different user. This distinction is important so the
// frontend can display the correct error to the user.



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
// GenAI Prompt:
// For my project I must write a DELETE /api/food-opportunities/:id endpoint
// for user stories 5 and 6. It should delete an existing food opportunity. Before
// deleting, it should check that the opportunity exists and that the logged in user
// is the one who created it, returning errors if either check fails. 

// app.delete('/api/food-opportunities/:id', authenticateToken, async (req, res) => {
//     const { id } = req.params;
//     try {
//         // todo: check opportunity exists, return 404 if not
//         // todo: check logged in user is the creator, return 403 if not
//         // todo: delete the record from the database
//     } 
// });
//
// GenAI Response:
// app.delete('/api/food-opportunities/:id', authenticateToken, async (req, res) => {
//     const { id } = req.params;
//     try {
//         const existing = await pool.query('SELECT creator_user_id FROM foodopps WHERE opp_id = $1', [id]);
//         if (existing.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });
//         if (existing.rows[0].creator_user_id !== req.user.userId) {
//             return res.status(403).json({ error: 'You can only delete your own listings' });
//         }
//         await pool.query('DELETE FROM foodopps WHERE opp_id = $1', [id]);
//         res.json({ message: "Deleted" });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
//
// My Reflection:
// This endpoint follows the same ownership check as the PUT endpoint —
// querying only creator_user_id first, then checking existence and ownership in
// sequence before performing the operation. This consistency makes the codebase
// easier to understand. The DELETE query is simpler than the UPDATE
// since it only needs the opp_id to identify the record to remove. I adopted this 
// response  since it correctly handled all the deletion and ownership requirements, and it
// mirrors the PUT pattern which I was already comfortable with.


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