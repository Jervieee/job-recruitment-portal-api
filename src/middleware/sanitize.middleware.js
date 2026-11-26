/**
 * Recursively sanitizes objects against NoSQL injection operators ($..., dot-notation keys)
 * and strips dangerous prototype pollution keys (__proto__, constructor, prototype).
 */
const sanitizeObject = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeObject);
  }

  if (value && typeof value === 'object') {
    const clean = {};
    for (const key of Object.keys(value)) {
      if (
        key.startsWith('$') ||
        key.includes('.') ||
        key === '__proto__' ||
        key === 'constructor' ||
        key === 'prototype'
      ) {
        continue;
      }
      clean[key] = sanitizeObject(value[key]);
    }
    return clean;
  }

  if (typeof value === 'string') {
    return value.replace(/\0/g, '').trim();
  }

  return value;
};

const sanitizeRequest = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

module.exports = { sanitizeRequest, sanitizeObject };
