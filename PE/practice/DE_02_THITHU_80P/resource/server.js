const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');

require('dotenv').config();
const { connectDb } = require('./dal/database');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Chi de DEBUG: tra JSON da thut le cho de doc trong Postman/Thunder Client.
app.set('json spaces', 2);

// ===== MODELS =====


// ===== HELPERS =====
const sendError = (res, error) => {
    if (error.name === 'ValidationError') {
        return res.status(400).json({ error: Object.values(error.errors).map(e => e.message).join(', ') });
    }
    if (error.name === 'CastError') {
        return res.status(400).json({ error: `Invalid ${error.path}: ${error.value}` });
    }
    if (error.code === 11000) {
        return res.status(409).json({ error: `Duplicate value for ${Object.keys(error.keyValue || {}).join(', ')}` });
    }
    return res.status(500).json({ error: error.message });
};

// ===== ROUTES =====
app.get('/api', async (req, res, next) => {
    try {
        res.status(200).json({ message: `Welcome Express server` });
    } catch (error) {
        next(error);
    }
});


// ===== 404 + ERROR (phải đặt cuối cùng) =====
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});
app.use((error, req, res, next) => sendError(res, error));

(async () => {
    try {
        await connectDb();
        app.listen(process.env.PORT, () => {
            console.log(`API chay tai http://localhost:${process.env.PORT}/api`);
        });
    } catch (error) {
        console.error(`Khong khoi dong duoc server: `, error.message);
        process.exit(1);
    }
})()
