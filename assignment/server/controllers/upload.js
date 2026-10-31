const { signUpload } = require('../services/cloudinary');

function signature(req, res) {
  res.json({ data: signUpload() });
}

module.exports = { signature };
