const { Category } = require('../models');
const { list, found } = require('../lib/http');
const { resource } = require('./resource');

module.exports = {
  ...resource(Category, ['name', 'slug', 'description', 'imageUrl', 'isActive']),
  list: async (req, res) => res.json(await list(Category, { isActive: true }, req.query, { sort: { name: 1, _id: 1 } })),
  get: async (req, res) => res.json({ data: await found(Category, req.params.id, { isActive: true }) }),
};
