CREATE TABLE users (
    user_id       SERIAL PRIMARY KEY,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('customer', 'vendor'))
);

CREATE TABLE foodopps (
    opp_id           SERIAL PRIMARY KEY,
    opp_name         VARCHAR(150) NOT NULL,
    opp_description  TEXT,
    opp_date         DATE NOT NULL,
    cost             NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    meal_period_name VARCHAR(20) NOT NULL,
    location_name    VARCHAR(100),
    creator_user_id  INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rsvp_capacity    INTEGER
);

CREATE TABLE saved_opportunities (
    id      SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    opp_id  INTEGER NOT NULL REFERENCES foodopps(opp_id) ON DELETE CASCADE,
    UNIQUE (user_id, opp_id)
);

CREATE TABLE rsvps (
    id      SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    opp_id  INTEGER NOT NULL REFERENCES foodopps(opp_id) ON DELETE CASCADE,
    UNIQUE (user_id, opp_id)
);

CREATE TABLE comments (
    comment_id   SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    opp_id       INTEGER REFERENCES foodopps(opp_id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT now()
);
