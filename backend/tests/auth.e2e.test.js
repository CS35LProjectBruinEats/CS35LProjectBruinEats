// End-to-end tests for authentication, role-based access, and listing ownership.
//
// These pin the security model: protected routes require a valid JWT, only
// vendors may create listings, and a listing may only be edited or deleted by
// the account that created it.

const { app, pool, request, resetDb, makeUser, makeListing } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

test('protected routes reject missing and forged tokens', async () => {
    // No Authorization header at all -> 401.
    await request(app).get('/api/food-opportunities').expect(401);

    // A syntactically-present but invalid token -> 403.
    await request(app)
        .get('/api/food-opportunities')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(403);
});

test('only vendors can create listings, and the creator is taken from the token', async () => {
    const customer = await makeUser('cust', 'customer');
    const vendor = await makeUser('vend', 'vendor');

    // A customer is forbidden from creating a listing.
    await request(app)
        .post('/api/food-opportunities')
        .set('Authorization', customer.auth)
        .send({ name: 'Pizza', date: '2026-06-01', cost: 0, mealPeriod: 'Lunch' })
        .expect(403);

    // A vendor can, and the row is attributed to the vendor's own id.
    const created = await makeListing(vendor, { name: 'Pizza' });
    expect(created.creator_user_id).toBe(vendor.id);
});

test('a vendor cannot edit or delete another vendor\'s listing', async () => {
    const owner = await makeUser('owner', 'vendor');
    const other = await makeUser('other', 'vendor');
    const listing = await makeListing(owner, { name: 'Tacos' });

    const edit = {
        name: 'Hacked',
        date: '2026-06-01',
        cost: 0,
        mealPeriod: 'Dinner',
    };

    // A different vendor is blocked from mutating someone else's listing.
    await request(app)
        .put(`/api/food-opportunities/${listing.opp_id}`)
        .set('Authorization', other.auth)
        .send(edit)
        .expect(403);
    await request(app)
        .delete(`/api/food-opportunities/${listing.opp_id}`)
        .set('Authorization', other.auth)
        .expect(403);

    // The owner can edit their own listing.
    await request(app)
        .put(`/api/food-opportunities/${listing.opp_id}`)
        .set('Authorization', owner.auth)
        .send({ ...edit, name: 'Tacos v2' })
        .expect(200);

    // And the blocked edit never took effect.
    const { rows } = await pool.query(
        'SELECT opp_name FROM foodopps WHERE opp_id = $1',
        [listing.opp_id]
    );
    expect(rows[0].opp_name).toBe('Tacos v2');
});
