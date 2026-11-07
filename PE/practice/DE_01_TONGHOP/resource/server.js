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

const Category = mongoose.model('Category', new mongoose.Schema({
    categoryName: String,
    description: String
}), 'categories');

const Product = mongoose.model('Product', new mongoose.Schema({
    productName: String,
    price: Number,
    unit: String,
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    specs: mongoose.Schema.Types.Mixed
}), 'products');

app.get('/api/products', async(req, res) => {
    try {
        const products = await Product.find();
        const categories = await Category.find();
        let returnData = products.map(product => ({
            productName: product.productName,
            price: product.price,
            unit: product.unit,
            categoryName: categories.find(category => category._id.equals(product.categoryId))?.categoryName || 'Unknown'
        }))
        return res.status(200).json(returnData);
    }catch (error) {
        return res.status(500).json({ error: error.message });
    }
})

app.get('/api/products/:productId', async(req, res) => {
    try {
        const productId = req.params.productId;
        const products = await Product.find({_id: productId});
        const categories = await Category.find();
        let returnData = products.map(product => ({
            productName: product.productName,
            price: product.price,
            unit: product.unit,
            categoryName: categories.find(category => category._id.equals(product.categoryId))?.categoryName || 'Unknown',
            spec: product.specs
        }))
        return res.status(200).json(returnData);
    }catch (error) {
        return res.status(500).json({ error: error.message });
    }
})

app.get('/api/categories/:categoryId/products', async(req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const products = await Product.find({ categoryId: categoryId });
        return res.status(200).json(products.map(product => ({
            productName: product.productName,
            price: product.price,
            unit: product.unit
        })));
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
})

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
