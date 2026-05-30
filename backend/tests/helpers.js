// Shared setup for the end-to-end tests.
//
// These tests drive the real Express app over real HTTP (via Supertest) against
// a real Postgres database (foodopp_test_db), so they exercise the full stack:
// middleware -> route handler -> SQL -> response. The test DB is selected by the
// `test` npm script, which sets DB_NAME=foodopp_test_db before dotenv loads
// (dotenv does not override variables already present in the environment).

const request = require('supertest');
const app = require('../index');
const pool = require('../db');

// Wipe every table between tests so each one starts from a known-empty state.
// RESTART IDENTITY keeps generated ids predictable; CASCADE clears dependents.
function resetDb() {
    return pool.query(
        'TRUNCATE comments, rsvps, saved_opportunities, foodopps, users RESTART IDENTITY CASCADE'
    );
}

// Create a user through the real signup + login endpoints and return the bits a
// test needs to act as them: their id and a ready-to-use Authorization header.
async function makeUser(username, role = 'customer') {
    await request(app).post('/api/signup').send({ username, password: 'pw', role });
    const { body } = await request(app).post('/api/login').send({ username, password: 'pw' });
    return { id: body.user.id, auth: `Bearer ${body.token}` };
}

// Create a listing owned by the given vendor and return the created row.
// opp_date is NOT NULL in the schema, so a date is always supplied.
async function makeListing(vendor, overrides = {}) {
    const { body } = await request(app)
        .post('/api/food-opportunities')
        .set('Authorization', vendor.auth)
        .send({
            name: 'Free Bagels',
            description: 'Leftover bagels from the meeting',
            date: '2026-06-01',
            cost: 0,
            mealPeriod: 'Breakfast',
            locationName: 'Ackerman',
            ...overrides,
        });
    return body;
}

module.exports = { app, pool, request, resetDb, makeUser, makeListing };
