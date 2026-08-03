const { Order, Product, User } = require('../models');
const { Op } = require('sequelize');

exports.getAnalytics = async (req, res) => {
    try {
        const sellerId = req.user.id;

        // calculation of the price
        const totalRevenue = await Order.sum('total_price', { where: { seller_id: sellerId } });
        const totalOrders = await Order.count({ where: { seller_id: sellerId } });
        const uniqueCustomers = await Order.count({ 
            distinct: true, 
            col: 'customer_id', 
            where: { seller_id: sellerId } 
        });

        res.json({
            revenue: totalRevenue || 0,
            avgOrder: totalOrders > 0 ? (totalRevenue / totalOrders) : 0,
            totalOrders: totalOrders,
            customers: uniqueCustomers
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching analytics" });
    }
};

exports.getChartData = async (req, res) => {
    try {
        const sellerId = req.user.id;
        
        // show the sale for the last seven day
        const data = await Order.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%d/%m'), 'date'],
                [sequelize.fn('SUM', sequelize.col('total_price')), 'amount']
            ],
            where: { seller_id: sellerId },
            group: ['date'],
            order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
            limit: 7
        });

        res.json(data);
    } catch (error) {
        res.status(500).json({ message: "Error fetching chart data" });
    }
};