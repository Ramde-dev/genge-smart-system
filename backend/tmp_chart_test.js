const db = require('./config/db');

(async () => {
  try {
    const sellerId = 9;
    const period = '30days';
    let interval;
    switch (period) {
      case '7days':
        interval = '7 DAY';
        break;
      case '30days':
        interval = '30 DAY';
        break;
      case 'month':
        interval = '6 MONTH';
        break;
      case 'year':
        interval = '5 YEAR';
        break;
      default:
        interval = '30 DAY';
    }

    let groupByExpression;
    if (period === 'month') {
      groupByExpression = "DATE_FORMAT(created_at, '%Y-%m')";
    } else if (period === 'year') {
      groupByExpression = "DATE_FORMAT(created_at, '%Y')";
    } else {
      groupByExpression = 'DATE(created_at)';
    }

    const sql = `
      SELECT
        ${groupByExpression} as date,
        COALESCE(SUM(total_price), 0) as amount,
        COUNT(*) as orders
      FROM orders
      WHERE seller_id = ? AND status = 'delivered'
      AND created_at >= DATE_SUB(NOW(), INTERVAL ${interval})
      GROUP BY ${groupByExpression}
      ORDER BY ${groupByExpression} ASC
    `;

    console.log('SQL:', sql);

    const [rows] = await db.execute(sql, [sellerId]);
    console.log('ROWS', rows);
  } catch (err) {
    console.error('ERROR', err);
  } finally {
    process.exit();
  }
})();
