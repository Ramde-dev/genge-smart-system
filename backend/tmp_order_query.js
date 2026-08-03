const db = require('./config/db');
(async () => {
  try {
    const sellerId = 9;
    const search = '';
    const status = '';
    const page = 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    let sql = `SELECT 
                o.*, 
                u.name as buyer_name, 
                u.email as buyer_email, 
                u.phone as buyer_phone, 
                u.address as buyer_address,
                (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
               FROM orders o
               JOIN users u ON o.buyer_id = u.id
               WHERE o.seller_id = ?`;
    const params = [sellerId];

    if (search) {
      sql += " AND (u.name LIKE ? OR u.email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      sql += " AND o.status = ?";
      params.push(status);
    }

    sql += " ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    console.log('SQL:', sql);
    console.log('params:', params.map((p) => ({v:p, t: typeof p})));
    const [rows] = await db.execute(sql, params);
    console.log('rows count', rows.length);
  } catch (err) {
    console.error('ERR', err);
  } finally {
    process.exit();
  }
})();
