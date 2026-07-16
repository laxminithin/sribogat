const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const { Parser } = require('json2csv');

exports.getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get various statistics in parallel
    const [
      totalRevenue,
      orderStats,
      productStats,
      customerStats,
      dailyRevenue
    ] = await Promise.all([
      // Total Revenue
      Order.aggregate([
        { $match: { ...dateFilter, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),

      // Order Statistics
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        }
      ]),

      // Product Statistics
      Order.aggregate([
        { $match: { ...dateFilter, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 }
      ]),

      // Customer Statistics
      User.aggregate([
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'user',
            as: 'orders'
          }
        },
        {
          $project: {
            name: 1,
            email: 1,
            totalOrders: { $size: '$orders' },
            totalSpent: {
              $sum: {
                $filter: {
                  input: '$orders.totalAmount',
                  as: 'amount',
                  cond: { $ne: ['$$amount', null] }
                }
              }
            }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 }
      ]),

      // Daily Revenue
      Order.aggregate([
        { $match: { ...dateFilter, status: { $ne: 'cancelled' } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    // Populate product details
    const populatedProductStats = await Product.populate(productStats, {
      path: '_id',
      select: 'name price image'
    });

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      orderStats: orderStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          revenue: stat.revenue
        };
        return acc;
      }, {}),
      topProducts: populatedProductStats.map(product => ({
        product: product._id,
        totalSold: product.totalSold,
        revenue: product.revenue
      })),
      topCustomers: customerStats,
      dailyRevenue
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.exportData = async (req, res) => {
  try {
    const { type, startDate, endDate, format = 'csv' } = req.query;
    const dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let data;
    let fields;
    let fileName;

    switch (type) {
      case 'orders':
        data = await Order.find(dateFilter)
          .populate('user', 'name email')
          .populate('items.product', 'name price');
        fields = ['_id', 'user.name', 'user.email', 'totalAmount', 'status', 'createdAt'];
        fileName = 'orders';
        break;

      case 'customers':
        data = await User.find(dateFilter).select('-password');
        fields = ['_id', 'name', 'email', 'phone', 'createdAt'];
        fileName = 'customers';
        break;

      case 'products':
        data = await Product.find(dateFilter);
        fields = ['_id', 'name', 'price', 'stock', 'category', 'createdAt'];
        fileName = 'products';
        break;

      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      
      res.header('Content-Type', 'text/csv');
      res.attachment(`${fileName}-${new Date().toISOString()}.csv`);
      return res.send(csv);
    }

    // JSON format
    res.header('Content-Type', 'application/json');
    res.attachment(`${fileName}-${new Date().toISOString()}.json`);
    return res.send(data);
  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getCustomReports = async (req, res) => {
  try {
    const { metrics, dimensions, filters, startDate, endDate } = req.body;
    
    // Build aggregation pipeline based on request
    const pipeline = [];

    // Date filter
    if (startDate && endDate) {
      pipeline.push({
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      });
    }

    // Apply custom filters
    if (filters) {
      pipeline.push({ $match: filters });
    }

    // Group by dimensions
    if (dimensions?.length) {
      const groupBy = {};
      dimensions.forEach(dim => {
        groupBy[dim] = `$${dim}`;
      });
      pipeline.push({ $group: { _id: groupBy } });
    }

    // Calculate metrics
    if (metrics?.length) {
      const metricCalculations = {};
      metrics.forEach(metric => {
        switch (metric) {
          case 'totalAmount':
            metricCalculations[metric] = { $sum: '$totalAmount' };
            break;
          case 'count':
            metricCalculations[metric] = { $sum: 1 };
            break;
          // Add more metric calculations as needed
        }
      });
      pipeline.push({ $project: metricCalculations });
    }

    const results = await Order.aggregate(pipeline);
    res.json(results);
  } catch (error) {
    console.error('Custom Report Error:', error);
    res.status(500).json({ error: error.message });
  }
}; 