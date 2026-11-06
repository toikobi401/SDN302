const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
connectDB();

const JWT_SECRET = process.env.SECRET_KEY;

/* ============================== MODELS ============================== */

const Nation = mongoose.model('Nation', new mongoose.Schema({
    nationName: { type: String, required: true, unique: true },
    continent: { type: String, required: true }
}, { timestamps: true }), 'nations');

const Food = mongoose.model('Food', new mongoose.Schema({
    foodName: { type: String, required: true, unique: true },
    foodDescription: { type: String, required: true },
    imageUrl: { type: String, required: true },
    calories: { type: Number, required: true, min: 700, max: 1500 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    isVegetarian: { type: Boolean, default: false },
    nation: { type: mongoose.Schema.Types.ObjectId, ref: 'Nation', required: true }
}, { timestamps: true }), 'foods');

const User = mongoose.model('User', new mongoose.Schema({
    name: { type: String, required: true },
    key: { type: String, required: true }
}, { timestamps: true }), 'users');

/* ============================== HELPERS ============================== */

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

const readCookie = (req, name) => {
    const hit = (req.headers.cookie || '').split(';')
        .map(c => c.trim())
        .find(c => c.startsWith(name + '='));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
};

const signToken = user => jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: '1h' });

// JSON embedded in a <script> block: "<" must be escaped or a food description
// containing "</script>" closes the block early (stored XSS).
const toScriptJson = value => JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll(' ', '\\u2028')
    .replaceAll(' ', '\\u2029');

// Shared by /auth/signin (API) and /auth/login (views): name + bcrypt key.
const findAccount = async (name, key) => {
    if (!name || !key) return { error: 'Name and key are required' };
    const user = await User.findOne({ name });
    if (!user) return { error: 'Invalid name or key' };
    const ok = await bcrypt.compare(key, user.key);
    if (!ok) return { error: 'Invalid name or key' };
    return { user };
};

/* ============================== AUTH MIDDLEWARE ============================== */

// Task 02 — JWT for the REST API.
const requireToken = (req, res, next) => {
    try {
        const token = (req.headers.authorization || '').replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'No token provided' });
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Task 03 — same JWT, carried in a cookie so the browser pages can use it.
const requirePage = (req, res, next) => {
    try {
        const token = readCookie(req, 'token');
        if (!token) return res.redirect('/auth/login');
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (error) {
        return res.redirect('/auth/login');
    }
};

/* ============================== TASK 02 — AUTH API ============================== */

// POST /auth/signin  { "name": "foodreviewer", "key": "123456789" }  -> { token }
app.post('/auth/signin', async (req, res) => {
    try {
        const { name, key } = req.body;
        const { user, error } = await findAccount(name, key);
        if (error) return res.status(401).json({ error });

        return res.status(200).json({ token: signToken(user) });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ============================== TASK 02 — NATIONS CRUD ============================== */

app.get('/api/v1/nations', requireToken, async (req, res) => {
    try {
        const nations = await Nation.find().sort({ nationName: 1 });
        return res.status(200).json(nations);
    } catch (error) {
        return sendError(res, error);
    }
});

app.get('/api/v1/nations/:id', requireToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: `Invalid nation id: ${id}` });
        }

        const nation = await Nation.findById(id);
        if (!nation) return res.status(404).json({ error: `Nation with id = ${id} not found` });

        return res.status(200).json(nation);
    } catch (error) {
        return sendError(res, error);
    }
});

app.post('/api/v1/nations', requireToken, async (req, res) => {
    try {
        const { nationName, continent } = req.body;
        if (!nationName || !continent) {
            return res.status(400).json({ error: 'nationName and continent are required' });
        }

        const existed = await Nation.findOne({ nationName });
        if (existed) return res.status(409).json({ error: `Nation ${nationName} already exists` });

        const nation = await Nation.create({ nationName, continent });
        return res.status(201).json(nation);
    } catch (error) {
        return sendError(res, error);
    }
});

// PUT = replace, PATCH = partial. Same handler: only the keys sent are written.
app.put(['/api/v1/nations/:id'], requireToken, updateNation);
app.patch(['/api/v1/nations/:id'], requireToken, updateNation);

async function updateNation(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: `Invalid nation id: ${id}` });
        }

        const { nationName, continent } = req.body;
        if (req.method === 'PUT' && (!nationName || !continent)) {
            return res.status(400).json({ error: 'nationName and continent are required' });
        }

        if (nationName) {
            const taken = await Nation.findOne({ nationName, _id: { $ne: id } });
            if (taken) return res.status(409).json({ error: `Nation ${nationName} already exists` });
        }

        const payload = {};
        if (nationName !== undefined) payload.nationName = nationName;
        if (continent !== undefined) payload.continent = continent;

        const nation = await Nation.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
        if (!nation) return res.status(404).json({ error: `Nation with id = ${id} not found` });

        return res.status(200).json(nation);
    } catch (error) {
        return sendError(res, error);
    }
}

app.delete('/api/v1/nations/:id', requireToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: `Invalid nation id: ${id}` });
        }

        const nation = await Nation.findById(id);
        if (!nation) return res.status(404).json({ error: `Nation with id = ${id} not found` });

        // Must check the reference BEFORE deleting, and only after the 404 check.
        const linked = await Food.countDocuments({ nation: id });
        if (linked > 0) {
            return res.status(400).json({ error: 'Cannot delete nation because it has associated foods' });
        }

        await Nation.findByIdAndDelete(id);
        return res.status(200).json({ message: `Nation ${nation.nationName} deleted successfully` });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ============================== TASK 03 — FOOD VALIDATION ============================== */

const NAME_PATTERN = /^[A-Za-z ]+$/;

// One validator for both add and update so the rules cannot drift apart.
const validateFood = async (body, excludeId) => {
    const { foodName, foodDescription, imageUrl, calories, rating, nation } = body;

    if (!foodName || !foodDescription || !imageUrl ||
        calories === undefined || calories === '' ||
        rating === undefined || rating === '' || !nation) {
        return { error: 'All fields are required' };
    }

    if (!NAME_PATTERN.test(foodName)) {
        return { error: 'foodName must contain only letters (a-z, A-Z) and spaces' };
    }

    const taken = await Food.findOne(
        excludeId ? { foodName, _id: { $ne: excludeId } } : { foodName }
    );
    if (taken) return { error: `Food name "${foodName}" already exists` };

    const cal = Number(calories);
    if (!Number.isFinite(cal) || cal < 700 || cal > 1500) {
        return { error: 'calories must be a number between 700 and 1500' };
    }

    const rate = Number(rating);
    if (!Number.isInteger(rate) || rate < 1 || rate > 5) {
        return { error: 'rating must be a number between 1 and 5' };
    }

    if (!mongoose.Types.ObjectId.isValid(nation)) {
        return { error: `Invalid nation: ${nation}` };
    }
    const nationDoc = await Nation.findById(nation);
    if (!nationDoc) return { error: `Nation with id = ${nation} not found` };

    return {
        data: {
            foodName,
            foodDescription,
            imageUrl,
            calories: cal,
            rating: rate,
            // Checkbox/toggle: absent means off.
            isVegetarian: body.isVegetarian === true || body.isVegetarian === 'true' || body.isVegetarian === 'on',
            nation
        }
    };
};

/* ============================== TASK 03 — VIEWS ============================== */

app.get('/auth/login', (req, res) => {
    res.render('login', { error: null, name: '' });
});

app.post('/auth/login', async (req, res) => {
    try {
        const { name, key } = req.body;
        const { user, error } = await findAccount(name, key);
        if (error) return res.status(401).render('login', { error, name: name || '' });

        res.cookie('token', signToken(user), { httpOnly: true, maxAge: 60 * 60 * 1000 });
        return res.redirect('/page/foods');
    } catch (error) {
        return res.status(500).render('login', { error: error.message, name: req.body.name || '' });
    }
});

app.get('/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/auth/login');
});

app.get('/page/foods', requirePage, async (req, res) => {
    try {
        const [foods, nations] = await Promise.all([
            Food.find().populate('nation', 'nationName').sort({ foodName: 1 }).lean(),
            Nation.find().sort({ nationName: 1 }).lean()
        ]);

        return res.render('foods', { foods, nations, user: req.user, foodsJson: toScriptJson(foods) });
    } catch (error) {
        return res.status(500).send(error.message);
    }
});

app.get('/page/foods/:id', requirePage, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: `Invalid food id: ${id}` });
        }

        const food = await Food.findById(id).populate('nation', 'nationName').lean();
        if (!food) return res.status(404).json({ error: `Food with id = ${id} not found` });

        return res.status(200).json(food);
    } catch (error) {
        return sendError(res, error);
    }
});

app.post('/page/foods', requirePage, async (req, res) => {
    try {
        const { data, error } = await validateFood(req.body);
        if (error) return res.status(400).json({ error });

        const food = await Food.create(data);
        return res.status(201).json({ message: `Food "${food.foodName}" added successfully`, food });
    } catch (error) {
        return sendError(res, error);
    }
});

app.put('/page/foods/:id', requirePage, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: `Invalid food id: ${id}` });
        }

        const { data, error } = await validateFood(req.body, id);
        if (error) return res.status(400).json({ error });

        const food = await Food.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        if (!food) return res.status(404).json({ error: `Food with id = ${id} not found` });

        return res.status(200).json({ message: `Food "${food.foodName}" updated successfully`, food });
    } catch (error) {
        return sendError(res, error);
    }
});

app.delete('/page/foods/:id', requirePage, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: `Invalid food id: ${id}` });
        }

        const food = await Food.findByIdAndDelete(id);
        if (!food) return res.status(404).json({ error: `Food with id = ${id} not found` });

        return res.status(200).json({ message: `Food "${food.foodName}" deleted successfully` });
    } catch (error) {
        return sendError(res, error);
    }
});

/* ============================== ROOT / 404 ============================== */

app.get('/', (req, res) => {
    res.redirect('/page/foods');
});

app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((error, req, res, next) => sendError(res, error));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
