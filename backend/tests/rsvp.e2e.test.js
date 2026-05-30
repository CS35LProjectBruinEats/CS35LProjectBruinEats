// End-to-end tests for the RSVP flow.
//
// The RSVP endpoint guards capacity with a transaction that locks the
// opportunity row (SELECT ... FOR UPDATE) before counting and inserting. The
// headline test fires concurrent RSVPs at a one-seat event and asserts the
// event is never overbooked -- a property that only holds if that lock is
// correct, and that a real Postgres (not an in-memory fake) is needed to verify.

const { app, pool, request, resetDb, makeUser, makeListing } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

// Create an event with the given capacity (null = unlimited) owned by a vendor.
async function makeEvent(capacity) {
    const vendor = await makeUser('vendor', 'vendor');
    const listing = await makeListing(vendor, { name: 'Free Boba', rsvpCapacity: capacity });
    return listing.opp_id;
}

test('concurrent RSVPs never exceed capacity', async () => {
    const oppId = await makeEvent(1);
    const users = await Promise.all(
        ['a', 'b', 'c', 'd', 'e'].map((u) => makeUser(u, 'customer'))
    );

    // Fire all five RSVPs at once against a single seat.
    const results = await Promise.all(
        users.map((u) =>
            request(app).post('/api/rsvp').set('Authorization', u.auth).send({ opp_id: oppId })
        )
    );

    const accepted = results.filter((r) => r.status === 200);
    const rejected = results.filter((r) => r.status === 400);
    expect(accepted).toHaveLength(1); // exactly one seat handed out
    expect(rejected).toHaveLength(4);
    rejected.forEach((r) => expect(r.body.error).toBe('Event is full'));

    // The database itself must never hold more rows than the capacity.
    const { rows } = await pool.query(
        'SELECT COUNT(*)::int AS n FROM rsvps WHERE opp_id = $1',
        [oppId]
    );
    expect(rows[0].n).toBe(1);
});

test('cancelling an RSVP frees the seat for someone else', async () => {
    const oppId = await makeEvent(1);
    const first = await makeUser('first', 'customer');
    const second = await makeUser('second', 'customer');

    await request(app).post('/api/rsvp').set('Authorization', first.auth).send({ opp_id: oppId }).expect(200);
    // Event is full, so the second user is turned away.
    await request(app).post('/api/rsvp').set('Authorization', second.auth).send({ opp_id: oppId }).expect(400);

    // First user cancels, freeing the seat...
    await request(app).delete('/api/rsvp').set('Authorization', first.auth).send({ opp_id: oppId }).expect(200);
    // ...and now the second user can take it.
    await request(app).post('/api/rsvp').set('Authorization', second.auth).send({ opp_id: oppId }).expect(200);
});

test('the same user cannot RSVP twice', async () => {
    const oppId = await makeEvent(null); // unlimited capacity
    const user = await makeUser('dup', 'customer');

    await request(app).post('/api/rsvp').set('Authorization', user.auth).send({ opp_id: oppId }).expect(200);
    const again = await request(app)
        .post('/api/rsvp')
        .set('Authorization', user.auth)
        .send({ opp_id: oppId })
        .expect(400);
    expect(again.body.error).toBe('Already RSVPed');
});
