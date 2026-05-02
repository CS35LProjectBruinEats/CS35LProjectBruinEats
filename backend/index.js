const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err.stack);
    } else {
        console.log('Database connected at:', res.rows[0].now);
    }
});

app.use('/api', authRoutes);

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use by another process.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});
