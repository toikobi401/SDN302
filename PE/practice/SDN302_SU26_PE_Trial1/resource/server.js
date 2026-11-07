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

const Seat = mongoose.model('Seat', new mongoose.Schema({
    _Id: String,
    type: [String],
}), 'rooms.seats');   

const Room = mongoose.model('Room', new mongoose.Schema({
    roomName: String,
    capacity: Number,
    seats:  [Seat.schema]
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

app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomName: -1 });

    return res.status(200).json(
      rooms.map(room => ({
        id: room._id,
        name: room.roomName,
        totalSeats: room.seats.length,
        vipCount: room.seats.filter(seat => Array.isArray(seat.type) && seat.type.includes('VIP')).length
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/movies/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return res.status(400).json({ error: `Invalid movieId: ${movieId}` });
    }

    const [movie, showtimes] = await Promise.all([
      Movie.findById(movieId).lean(),
      Showtime.find({ movieId })
        .populate('roomId', 'roomName')
        .lean()
    ]);

    if (!movie) {
      return res.status(404).json({ error: `Movie with id = ${movieId} not found` });
    }

    return res.status(200).json({
      title: movie.title,
      duration: movie.duration,
      description: movie.description,
      showtimes: showtimes.map(st => ({
        startTime: st.startTime,
        roomName: st.roomId.roomName,
        price: st.price
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/', async(req, res)=>{
    try {
        res.send({message: 'Welcome to Practical Exam!'});
    } catch (error) {
        res.send({error: error.message});
    }
});

app.post('/api/showtimes', async (req, res) => {
    try {
        const { movieId, roomId, startTime, endTime, price } = req.body;
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
