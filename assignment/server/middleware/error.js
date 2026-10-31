function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found', requestId: req.requestId } });
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
  if (status >= 500 && status !== 502 && status !== 503) {
    console.error(JSON.stringify({ event: 'api_error', requestId: req.requestId, name: error.name, code: String(error.code || '') }));
    message = 'Server error'; code = 'INTERNAL_ERROR';
  }
  res.status(status).json({ error: { code, message, requestId: req.requestId } });
}

module.exports = { errorHandler, notFound };
