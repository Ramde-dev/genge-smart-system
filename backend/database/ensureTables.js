const pool = require('../config/db');

async function ensureUserVerificationColumns() {
    const [columns] = await pool.query('SHOW COLUMNS FROM users');
    const columnNames = new Set(columns.map((column) => column.Field));
    if (!columnNames.has('email_verified')) {
        await pool.query(`ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE`);
    }
    if (!columnNames.has('verification_code_hash')) {
        await pool.query(`ALTER TABLE users ADD COLUMN verification_code_hash CHAR(64) NULL`);
    }
    if (!columnNames.has('verification_expires_at')) {
        await pool.query(`ALTER TABLE users ADD COLUMN verification_expires_at DATETIME NULL`);
    }
    if (!columnNames.has('reset_code_hash')) {
        await pool.query(`ALTER TABLE users ADD COLUMN reset_code_hash CHAR(64) NULL`);
    }
    if (!columnNames.has('reset_code_expires_at')) {
        await pool.query(`ALTER TABLE users ADD COLUMN reset_code_expires_at DATETIME NULL`);
    }
}

async function migrateLegacyPayments() {
    const [columns] = await pool.query('SHOW COLUMNS FROM payments');
    const columnNames = new Set(columns.map((column) => column.Field));

    if (!columnNames.has('order_ids')) {
        return;
    }

    const columnsToAdd = [
        ['order_id', 'INT NULL AFTER id'],
        ['amount', 'DECIMAL(12, 2) NULL AFTER buyer_id'],
        ['method', 'VARCHAR(40) NULL AFTER amount'],
        ['destination_number', 'VARCHAR(30) NULL AFTER method']
    ];
    for (const [name, definition] of columnsToAdd) {
        if (!columnNames.has(name)) {
            await pool.query(`ALTER TABLE payments ADD COLUMN ${name} ${definition}`);
        }
    }

    await pool.query(`
        ALTER TABLE payments
            MODIFY COLUMN total_amount DECIMAL(12, 2) NULL,
            MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pending'
    `);
}

async function ensureTables() {
    await ensureUserVerificationColumns();
    await pool.query(`
        CREATE TABLE IF NOT EXISTS conversations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(120) NOT NULL DEFAULT 'New conversation',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_conversations_user_updated (user_id, updated_at)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            conversation_id INT NOT NULL,
            role VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            INDEX idx_chat_messages_conversation (conversation_id, created_at)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS buyer_addresses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            buyer_id INT NOT NULL,
            name VARCHAR(100) NOT NULL,
            full_name VARCHAR(150) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            address VARCHAR(255) NOT NULL,
            city VARCHAR(100) NOT NULL,
            region VARCHAR(100) NOT NULL,
            postal_code VARCHAR(20),
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_buyer_addresses_buyer (buyer_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            report_date DATE NOT NULL,
            type VARCHAR(50) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'ready',
            data_json JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            buyer_id INT NOT NULL,
            amount DECIMAL(12, 2) NOT NULL,
            method VARCHAR(40) NOT NULL DEFAULT 'mobile_money',
            destination_number VARCHAR(30) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_payments_order (order_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS seller_payouts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            seller_id INT NOT NULL,
            amount DECIMAL(12, 2) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            paid_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_payouts_seller (seller_id)
        )
    `);

    await migrateLegacyPayments();
}

module.exports = ensureTables;