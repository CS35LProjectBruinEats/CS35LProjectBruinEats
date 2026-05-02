-- UCLA Food Opportunity Platform schema
-- Run with:  psql foodopp_db -f schema.sql

DROP TABLE IF EXISTS food_opportunities;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student'
        CHECK (role IN ('student', 'vendor'))
);

CREATE TABLE food_opportunities (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    food_items TEXT,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0
        CHECK (cost >= 0),
    organization VARCHAR(150),
    location VARCHAR(200) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

CREATE INDEX idx_food_opportunities_start_time ON food_opportunities(start_time);
CREATE INDEX idx_food_opportunities_vendor_id ON food_opportunities(vendor_id);
