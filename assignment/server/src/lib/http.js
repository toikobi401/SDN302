const mongoose = require('mongoose');

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function assert(condition, status, code, message) {
  if (!condition) throw new HttpError(status, code, message);
}

function text(value, name, { optional = false, max = 200 } = {}) {
  if (optional && value === undefined) return undefined;
  assert(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max,
    400, 'INVALID_INPUT', `${name} must be a non-empty string (max ${max} characters)`);
  return value.trim();
}

function id(value, name = 'id') {
  assert(typeof value === 'string' && /^[a-f\d]{24}$/i.test(value), 400, 'INVALID_ID', `${name} is invalid`);
  return value.toLowerCase();
}

function number(value, name, min = 0) {
  assert(typeof value === 'number' && Number.isSafeInteger(value) && value >= min,
    400, 'INVALID_INPUT', `${name} must be a safe integer >= ${min}`);
  return value;
}

function pick(body, keys) {
  assert(body && typeof body === 'object' && !Array.isArray(body), 400, 'INVALID_INPUT', 'Expected a JSON object');
  return Object.fromEntries(keys.filter(key => Object.hasOwn(body, key)).map(key => [key, body[key]]));
}

function page(query) {
  const parse = (value, fallback, max) => {
    if (value === undefined) return fallback;
    assert(typeof value === 'string' && /^\d+$/.test(value), 400, 'INVALID_QUERY', 'Invalid pagination');
    const result = Number(value);
    assert(Number.isSafeInteger(result) && result >= 1 && result <= max, 400, 'INVALID_QUERY', 'Pagination out of range');
    return result;
  };
  const current = parse(query.page, 1, 100000);
  const limit = parse(query.limit, 20, 100);
  return { page: current, limit, skip: (current - 1) * limit };
}

async function list(Model, filter, query, { sort = { createdAt: -1 }, populate } = {}) {
  const pagination = page(query);
  let cursor = Model.find(filter).sort(sort).skip(pagination.skip).limit(pagination.limit);
  if (populate) cursor = cursor.populate(populate);
  const [data, total] = await Promise.all([cursor, Model.countDocuments(filter)]);
  return { data, pagination: { page: pagination.page, limit: pagination.limit, total, pages: Math.ceil(total / pagination.limit) } };
}

async function found(Model, value, filter = {}, session) {
  const document = await Model.findOne({ _id: id(value), ...filter }).session(session || null);
  assert(document, 404, 'NOT_FOUND', `${Model.modelName} not found`);
  return document;
}

function dateRange(query, field = 'createdAt') {
  const range = {};
  for (const [name, operator] of [['from', '$gte'], ['to', '$lte']]) {
    if (query[name] !== undefined) {
      const raw = text(query[name], name, { max: 40 });
      const date = new Date(raw);
      assert(!Number.isNaN(date.getTime()), 400, 'INVALID_QUERY', `${name} must be an ISO date`);
      range[operator] = date;
    }
  }
  assert(!(range.$gte && range.$lte) || range.$gte <= range.$lte, 400, 'INVALID_QUERY', 'from must be <= to');
  return Object.keys(range).length ? { [field]: range } : {};
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message;
  if (error.code === 11000) { status = 409; code = 'DUPLICATE'; message = 'A unique value already exists'; }
  if (['ValidationError', 'CastError', 'StrictModeError'].includes(error.name)) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Invalid document fields';
  }
  if (error.name === 'VersionError') { status = 409; code = 'CONCURRENT_UPDATE'; message = 'Data changed; reload and retry'; }
  if (error.type === 'entity.too.large') { status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body is too large'; }
  if (error.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; message = 'Malformed JSON body'; }
  if (status >= 500) {
    console.error(JSON.stringify({ event: 'api_error', requestId: req.requestId, name: error.name, code: String(error.code || '') }));
    message = 'Server error'; code = 'INTERNAL_ERROR';
  }
  res.status(status).json({ error: { code, message, requestId: req.requestId } });
}

module.exports = { HttpError, assert, text, id, number, pick, page, list, found, dateRange, errorHandler };
