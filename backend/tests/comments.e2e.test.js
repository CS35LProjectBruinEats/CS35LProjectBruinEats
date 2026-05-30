// End-to-end tests for comments (User Story 11).
//
// Covers the three things that actually matter for this feature: empty comments
// are rejected, a comment is attributed to the authenticated token holder (never
// to a value the client puts in the body), and a comment posted by one user is
// visible to another.

const { app, pool, request, resetDb, makeUser, makeListing } = require('./helpers');

beforeEach(resetDb);
afterAll(() => pool.end());

// Every comment needs a listing to hang off of.
async function seedListing() {
    const vendor = await makeUser('vendor', 'vendor');
    const listing = await makeListing(vendor);
    return listing.opp_id;
}

test('a whitespace-only comment is rejected', async () => {
    const oppId = await seedListing();
    const alice = await makeUser('alice', 'customer');

    const res = await request(app)
        .post('/api/comments')
        .set('Authorization', alice.auth)
        .send({ opp_id: oppId, text: '   ' })
        .expect(400);
    expect(res.body.error).toBe('Comment is empty');

    // Nothing was written.
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM comments');
    expect(rows[0].n).toBe(0);
});

test('a comment is attributed to the token holder, not a spoofed body field', async () => {
    const oppId = await seedListing();
    const alice = await makeUser('alice', 'customer');

    // The body tries to impersonate someone else; the server must ignore it.
    const res = await request(app)
        .post('/api/comments')
        .set('Authorization', alice.auth)
        .send({ opp_id: oppId, text: 'Great bagels!', username: 'admin', user_id: 9999 })
        .expect(201);
    expect(res.body.username).toBe('alice');

    const { rows } = await pool.query(
        'SELECT u.username FROM comments c JOIN users u ON c.user_id = u.user_id WHERE c.comment_id = $1',
        [res.body.comment_id]
    );
    expect(rows[0].username).toBe('alice');
});

test('a comment posted by one user is visible to another', async () => {
    const oppId = await seedListing();
    const alice = await makeUser('alice', 'customer');
    const bob = await makeUser('bob', 'customer');

    await request(app)
        .post('/api/comments')
        .set('Authorization', alice.auth)
        .send({ opp_id: oppId, text: 'See you there' })
        .expect(201);

    const { body } = await request(app)
        .get('/api/comments')
        .set('Authorization', bob.auth)
        .expect(200);

    const comment = body.find((c) => c.opp_id === oppId);
    expect(comment).toMatchObject({ username: 'alice', comment_text: 'See you there' });
});
