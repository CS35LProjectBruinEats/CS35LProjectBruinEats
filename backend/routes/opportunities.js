const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function requireVendor(req, res, next) {
    if (req.user?.role !== 'vendor') {
        return res.status(403).json({
            error: 'Only food vendors can post or edit opportunities',
        });
    }
    next();
}

const LIST_COLUMNS = `
    o.id, o.vendor_id, o.title, o.description, o.food_items, o.cost,
    o.organization, o.location, o.start_time, o.end_time, o.created_at,
    u.username AS posted_by, u.role AS posted_by_role
`;

function validateOpportunityInput({ title, location, start_time, end_time, cost }) {
    if (!title || !location || !start_time || !end_time) {
        return 'Title, location, start time, and end time are required';
    }
    const start = new Date(start_time);
    const end = new Date(end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 'Start and end time must be valid timestamps';
    }
    if (end <= start) {
        return 'End time must be after start time';
    }
    const numericCost = cost === undefined || cost === null || cost === ''
        ? 0
        : Number(cost);
    if (Number.isNaN(numericCost) || numericCost < 0) {
        return 'Cost must be a non-negative number';
    }
    return null;
}

function normalizeCost(cost) {
    return cost === undefined || cost === null || cost === '' ? 0 : Number(cost);
}

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ${LIST_COLUMNS}
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

router.post('/', requireAuth, requireVendor, async (req, res) => {
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

    const validationError = validateOpportunityInput(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const inserted = await pool.query(
            `INSERT INTO food_opportunities
                (vendor_id, title, description, food_items, cost,
                 organization, location, start_time, end_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
                req.user.id,
                title,
                description || null,
                food_items || null,
                normalizeCost(cost),
                organization || null,
                location,
                start_time,
                end_time,
            ]
        );

        const result = await pool.query(
            `SELECT ${LIST_COLUMNS}
             FROM food_opportunities o
             JOIN users u ON u.id = o.vendor_id
             WHERE o.id = $1`,
            [inserted.rows[0].id]
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

router.put('/:id', requireAuth, requireVendor, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid opportunity id' });
    }

    const validationError = validateOpportunityInput(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

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

    try {
        const existing = await pool.query(
            'SELECT vendor_id FROM food_opportunities WHERE id = $1',
            [id]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }
        if (existing.rows[0].vendor_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only edit your own opportunities' });
        }

        await pool.query(
            `UPDATE food_opportunities SET
                title = $1,
                description = $2,
                food_items = $3,
                cost = $4,
                organization = $5,
                location = $6,
                start_time = $7,
                end_time = $8
             WHERE id = $9`,
            [
                title,
                description || null,
                food_items || null,
                normalizeCost(cost),
                organization || null,
                location,
                start_time,
                end_time,
                id,
            ]
        );

        const result = await pool.query(
            `SELECT ${LIST_COLUMNS}
             FROM food_opportunities o
             JOIN users u ON u.id = o.vendor_id
             WHERE o.id = $1`,
            [id]
        );

        res.json({
            message: 'Opportunity updated',
            opportunity: result.rows[0],
        });
    } catch (err) {
        console.error('Update opportunity error:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
