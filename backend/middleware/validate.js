const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return a 400 error if validation fails
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = validate;