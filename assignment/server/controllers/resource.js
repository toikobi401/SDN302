const { assert, text, pick, list, found } = require('../lib/http');

// Shared admin CRUD for simple documents; delete only deactivates, so history stays intact.
function resource(Model, keys) {
  function input(body) {
    const fields = pick(body, keys);
    for (const [key, value] of Object.entries(fields)) {
      if (key === 'isActive') assert(typeof value === 'boolean', 400, 'INVALID_INPUT', 'isActive must be boolean');
      else fields[key] = text(value, key, { max: key === 'description' || key === 'note' ? 5000 : 1000 });
    }
    if (fields.imageUrl) assert(/^https:\/\//i.test(fields.imageUrl), 400, 'INVALID_INPUT', 'Image URL must use HTTPS');
    return fields;
  }
  return {
    adminList: async (req, res) => res.json(await list(Model, {}, req.query)),
    adminGet: async (req, res) => res.json({ data: await found(Model, req.params.id) }),
    create: async (req, res) => res.status(201).json({ data: await Model.create(input(req.body)) }),
    update: async (req, res) => {
      const document = await found(Model, req.params.id);
      Object.assign(document, input(req.body));
      await document.save();
      res.json({ data: document });
    },
    remove: async (req, res) => {
      const document = await found(Model, req.params.id);
      document.isActive = false;
      await document.save();
      res.json({ data: document });
    },
  };
}

module.exports = { resource };
