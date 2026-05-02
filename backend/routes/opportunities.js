const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT o.id, o.title, o.description, o.food_items, o.cost,
                   o.organization, o.location, o.start_time, o.end_time,
                   o.created_at,
                   u.username AS posted_by, u.role AS posted_by_role
            FROM food_opportunities o
            JOIN users u ON u.id = o.vendor_id
            ORDER BY o.start_time ASC
        `);
        res.json({ opportunities: result.rows });
    } catch (err) {
        console.error('List opportunities error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', requireAuth, async (req, res) => {
    const {
        title,
        description,
        food_items,
        cost,
        organization,
        location,
        start_time,
        end_time,
    } = req.body;

    if (!title || !location || !start_time || !end_time) {
        return res.status(400).json({
            error: 'Title, location, start time, and end time are required',
        });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Start and end time must be valid timestamps' });
    }
    if (end <= start) {
        return res.status(400).json({ error: 'End time must be after start time' });
    }

    const numericCost = cost === undefined || cost === null || cost === ''
        ? 0
        : Number(cost);
    if (Number.isNaN(numericCost) || numericCost < 0) {
        return res.status(400).json({ error: 'Cost must be a non-negative number' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO food_opportunities
                (vendor_id, title, description, food_items, cost,
                 organization, location, start_time, end_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                req.user.id,
                title,
                description || null,
                food_items || null,
                numericCost,
                organization || null,
                location,
                start_time,
                end_time,
            ]
        );

        res.status(201).json({
            message: 'Opportunity created',
            opportunity: result.rows[0],
        });
    } catch (err) {
        console.error('Create opportunity error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
