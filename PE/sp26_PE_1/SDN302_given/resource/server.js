const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
app.use(express.json());
connectDB();

const Movie = mongoose.model('Movie', new mongoose.Schema({
    title: String,
    duration: Number,
    status: String,
    genre: [String],
    description: String
}), 'movies');

const Room = mongoose.model('Room', new mongoose.Schema({
    roomName: String,
    capacity: Number,
    // Mixed: a seat has a "type" key, which Mongoose would otherwise read as a type declaration
    seats: [mongoose.Schema.Types.Mixed]
}), 'rooms');

const Showtime = mongoose.model('Showtime', new mongoose.Schema({
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    startTime: String,
    endTime: String,
    price: Number
}), 'showtimes');

const Ticket = mongoose.model('Ticket', new mongoose.Schema({
    showTimeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Showtime' },
    seatId: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    price: Number,
    status: String,
    bookedAt: String,
    paymentMethod: String
}, { versionKey: false }), 'tickets');

const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    role: String,
    email: String,
    password: String,
    phone: String,
    access_key: String
}), 'users');

const MOVIE_STATUSES = ['NOW_SHOWING', 'STOPPED'];
const VIP_SURCHARGE = 1.2;

app.get('/', async (req, res) => {
    try {
        res.send({ message: 'Welcome to Practical Exam!' });
    } catch (error) {
        res.send({ error: error.message });
    }
});

// Question 1: Retrieve active movies
app.get('/api/movies', async (req, res) => {
    try {
        const { status } = req.query;

        if (!MOVIE_STATUSES.includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}` });
        }

        const movies = await Movie.find({ status });

        return res.status(200).json(movies.map(m => ({
            id: m._id,
            title: m.title,
            duration: m.duration,
            genre: m.genre
        })));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Question 2: Retrieve showtimes for a movie
app.get('/api/movies/:movieId/showtimes', async (req, res) => {
    try {
        const { movieId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(movieId)) {
            return res.status(400).json({ error: `Invalid movieId: ${movieId}` });
        }

        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({ error: `Movie with id = ${movieId} not found` });
        }

        const showtimes = await Showtime.find({ movieId }).populate('roomId', 'roomName');

        return res.status(200).json(showtimes.map(s => ({
            id: s._id,
            roomName: s.roomId ? s.roomId.roomName : null,
            startTime: s.startTime,
            endTime: s.endTime,
            price: s.price
        })));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Question 3: Retrieve seat availability by showtime
app.get('/api/showtimes/:showtimeId/seats', async (req, res) => {
    try {
        const { showtimeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
            return res.status(400).json({ error: `Invalid showtimeId: ${showtimeId}` });
        }

        const showtime = await Showtime.findById(showtimeId);
        if (!showtime) {
            return res.status(404).json({ error: `Showtime with Id: ${showtimeId} not found` });
        }

        const room = await Room.findById(showtime.roomId);
        const taken = await Ticket.find({ showTimeId: showtimeId, status: { $ne: 'canceled' } }, 'seatId');
        const booked = new Set(taken.map(t => t.seatId));

        return res.status(200).json((room ? room.seats : []).map(s => ({
            code: s._id,
            type: s.type,
            status: booked.has(s._id) ? 'BOOKED' : 'AVAILABLE'
        })));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Authorization middleware: resolve the customer owning the access_key header
const requireCustomer = async (req, res, next) => {
    try {
        const accessKey = req.headers['access_key'];
        if (!accessKey) {
            return res.status(403).json({ error: 'No access key' });
        }

        const user = await User.findOne({ access_key: accessKey });
        if (!user) {
            return res.status(403).json({ error: 'Invalid or unauthorized access key' });
        }
        if (user.role !== 'customer') {
            return res.status(403).json({ error: 'Customer access required' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Question 4: Create tickets (customer only)
app.post('/api/tickets', requireCustomer, async (req, res) => {
    try {
        const { showtimeId, seats } = req.body;

        if (!showtimeId || !Array.isArray(seats) || !seats.length) {
            return res.status(400).json({ error: 'showtimeId and seats required' });
        }
        if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
            return res.status(400).json({ error: `Invalid showtimeId: ${showtimeId}` });
        }

        const showtime = await Showtime.findById(showtimeId);
        if (!showtime) {
            return res.status(404).json({ error: `Showtime with Id: ${showtimeId} not found` });
        }

        const room = await Room.findById(showtime.roomId);
        const seatTypes = new Map((room ? room.seats : []).map(s => [s._id, s.type]));
        const unknown = seats.find(code => !seatTypes.has(code));
        if (unknown) {
            return res.status(400).json({ error: `Seat ${unknown} does not belong to the room` });
        }

        const taken = await Ticket.find({ showTimeId: showtimeId, status: { $ne: 'canceled' } }, 'seatId');
        const booked = new Set(taken.map(t => t.seatId));
        const conflict = seats.find(code => booked.has(code));
        if (conflict) {
            return res.status(409).json({ error: `Seat ${conflict} already booked` });
        }

        const created = await Ticket.insertMany(seats.map(code => ({
            showTimeId: showtime._id,
            seatId: code,
            userId: req.user._id,
            price: seatTypes.get(code) === 'VIP' ? showtime.price * VIP_SURCHARGE : showtime.price,
            status: 'booked',
            bookedAt: new Date().toISOString(),
            paymentMethod: null
        })));

        return res.status(201).json({
            message: 'Tickets created',
            count: created.length,
            totalAmount: created.reduce((sum, t) => sum + t.price, 0)
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
