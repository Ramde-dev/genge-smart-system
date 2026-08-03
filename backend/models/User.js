const db = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * User model – all methods use MySQL
 */
const User = {
  /**
   * Find a user by ID
   * @param {number|string} id
   * @returns {Promise<object|null>} user object (without password) or null
   */
  findById: async (id) => {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    const user = rows[0];
    delete user.password; // never return password
    return user;
  },

  /**
   * Find a user by email
   * @param {string} email
   * @returns {Promise<object|null>} user object (including password) or null
   */
  findByEmail: async (email) => {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  /**
   * Create a new user
   * @param {object} userData - { name, email, password, role? }
   * @returns {Promise<object>} created user (without password)
   */
  create: async (userData) => {
    const { name, email, password, role = 'buyer' } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );
    // Fetch the newly created user
    const newUser = await User.findById(result.insertId);
    return newUser;
  },

  /**
   * Update a user by ID
   * @param {number|string} id
   * @param {object} updates - key-value pairs to update
   * @returns {Promise<boolean>} true if updated, false otherwise
   */
  update: async (id, updates) => {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return false;
    values.push(id);
    const [result] = await db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  /**
   * Compare a plain password with the stored hashed password
   * @param {string} enteredPassword
   * @param {string} storedPassword
   * @returns {Promise<boolean>}
   */
  comparePassword: async (enteredPassword, storedPassword) => {
    return await bcrypt.compare(enteredPassword, storedPassword);
  }
};

module.exports = User;