const { Supplier } = require('../models');
const { resource } = require('./resource');

module.exports = resource(Supplier, ['code', 'name', 'contactName', 'email', 'phone', 'address', 'note', 'isActive']);
