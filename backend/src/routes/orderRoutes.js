import express from 'express';
import Order from '../models/Order.js';
import Item from '../models/Item.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// 1. GET /api/orders - Fetch all orders for the current user
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.item')
      .sort({ createdAt: -1 });

    // Dynamic progression tracking simulation based on order age for all orders
    const updatedOrders = await Promise.all(orders.map(async (order) => {
      const ageInSecs = (Date.now() - new Date(order.createdAt).getTime()) / 1000;
      let currentStatus = 'Placed';

      if (ageInSecs > 90) {
        currentStatus = 'Delivered';
      } else if (ageInSecs > 60) {
        currentStatus = 'OutForDelivery';
      } else if (ageInSecs > 30) {
        currentStatus = 'Packing';
      }

      if (order.deliveryStatus !== currentStatus && order.deliveryStatus !== 'Delivered') {
        order.deliveryStatus = currentStatus;
        await order.save();
      }
      return order;
    }));

    res.json(updatedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/orders - Place a new mock order
router.post('/', async (req, res) => {
  try {
    const { deliveryAddress, phoneNumber, items, totalAmount } = req.body;
    
    if (!deliveryAddress || !deliveryAddress.trim()) {
      return res.status(400).json({ error: "Delivery address is required" });
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({ error: "Phone number is required for delivery contact" });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Order cart cannot be empty" });
    }

    // Verify stock availability
    for (const entry of items) {
      const itemRecord = await Item.findById(entry._id);
      if (!itemRecord) {
        return res.status(404).json({ error: `Item not found in catalog.` });
      }

      // Enforce stock limits on all items (temporarily fallback null/undefined to 5)
      const effectiveStock = (itemRecord.stock === undefined || itemRecord.stock === null) ? 5 : itemRecord.stock;
      if (effectiveStock < entry.quantity) {
        const enTrans = itemRecord.translations.find(t => t.languageCode === 'en');
        const name = enTrans ? enTrans.names[0] : 'Item';
        return res.status(400).json({
          error: `Inadequate stock for "${name}". Available: ${effectiveStock}, requested: ${entry.quantity}.`
        });
      }
    }

    // Deduct stock
    for (const entry of items) {
      const itemRecord = await Item.findById(entry._id);
      if (itemRecord) {
        const effectiveStock = (itemRecord.stock === undefined || itemRecord.stock === null) ? 5 : itemRecord.stock;
        itemRecord.stock = Math.max(0, effectiveStock - entry.quantity);
        await itemRecord.save();
      }
    }

    const formattedItems = items.map(entry => ({
      item: entry._id,
      quantity: entry.quantity,
      priceAtOrder: entry.latestPrice || 0
    }));

    const newOrder = new Order({
      user: req.user._id,
      items: formattedItems,
      totalAmount,
      deliveryAddress: deliveryAddress.trim(),
      phoneNumber: phoneNumber.trim(),
      paymentStatus: 'Paid',
      deliveryStatus: 'Placed'
    });

    await newOrder.save();
    
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/orders/:id - Retrieve order status (dynamic real-time simulation)
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user })
      .populate('items.item');
      
    if (!order) {
      return res.status(404).json({ error: "Order details not found" });
    }

    const ageInSecs = (Date.now() - new Date(order.createdAt).getTime()) / 1000;
    let currentStatus = 'Placed';

    if (ageInSecs > 90) {
      currentStatus = 'Delivered';
    } else if (ageInSecs > 60) {
      currentStatus = 'OutForDelivery';
    } else if (ageInSecs > 30) {
      currentStatus = 'Packing';
    }

    if (order.deliveryStatus !== currentStatus && order.deliveryStatus !== 'Delivered') {
      order.deliveryStatus = currentStatus;
      await order.save();
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
