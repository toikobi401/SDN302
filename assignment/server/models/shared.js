const { Schema } = require('mongoose');

const options = { timestamps: true, optimisticConcurrency: true };

function reference(model, required = true) {
  return { type: Schema.Types.ObjectId, ref: model, required };
}

function integer(min = 0, defaultValue) {
  const field = {
    type: Number,
    required: true,
    min,
    validate: { validator: Number.isSafeInteger, message: '{PATH} must be a safe integer' },
  };
  if (defaultValue !== undefined) field.default = defaultValue;
  return field;
}

const addressSchema = new Schema({
  recipientName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  addressLine: { type: String, required: true, trim: true },
  ward: { type: String, trim: true },
  province: { type: String, required: true, trim: true },
}, { _id: false });

const bookFormats = ['PHYSICAL', 'PDF'];
const orderStatuses = ['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED'];

function nonEmptyUniqueBooks(items) {
  return items.length > 0 && new Set(items.map(item => String(item.book))).size === items.length;
}

module.exports = { options, reference, integer, addressSchema, bookFormats, orderStatuses, nonEmptyUniqueBooks };
