import express from 'express';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Item from '../models/Item.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const RAZORPAY_MOCK_SECRET = 'mock_secret_key_12345';
const RAZORPAY_WEBHOOK_SECRET = 'mock_webhook_secret_67890';

// 4. POST /api/orders/razorpay/webhook - Webhook for asynchronous payment events
// Placed before protect middleware so gateways can access it
router.post('/razorpay/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (generated_signature !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;

      // In a real app, you would look up the order by razorpay_order_id (orderId)
      // and update its status to 'Paid' if it wasn't already handled by the synchronous verify endpoint.
      console.log(
        `[Webhook] Payment captured for order: ${orderId}, amount: ${paymentEntity.amount}`
      );
      // Implementation Note: Since our mock /init doesn't save a "Pending" order to DB first,
      // there is no DB record to update here by default. If we saved pending orders, we'd do:
      // await Order.findOneAndUpdate({ razorpayOrderId: orderId }, { paymentStatus: 'Paid' });
    }

    // Always return 200 OK to acknowledge receipt of the webhook
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.use(protect);

// 1. GET /api/orders - Fetch all orders for the current user
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.item')
      .sort({ createdAt: -1 });

    // Dynamic progression tracking simulation based on order age for all orders
    const updatedOrders = await Promise.all(
      orders.map(async (order) => {
        const ageInSecs =
          (Date.now() - new Date(order.createdAt).getTime()) / 1000;
        let currentStatus = 'Placed';

        if (ageInSecs > 90) {
          currentStatus = 'Delivered';
        } else if (ageInSecs > 60) {
          currentStatus = 'OutForDelivery';
        } else if (ageInSecs > 30) {
          currentStatus = 'Packing';
        }

        if (
          order.deliveryStatus !== currentStatus &&
          order.deliveryStatus !== 'Delivered'
        ) {
          order.deliveryStatus = currentStatus;
          await order.save();
        }
        return order;
      })
    );

    res.json(updatedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/orders/razorpay/init - Initialize a Razorpay mock order
router.post('/razorpay/init', async (req, res) => {
  try {
    const { amount, currency, receipt, items } = req.body;

    // Amount should be in paise
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (items && items.length > 0) {
      // Verify stock availability before initializing payment
      for (const entry of items) {
        const itemRecord = await Item.findById(entry._id);
        if (!itemRecord) {
          return res.status(404).json({ error: `Item not found in catalog.` });
        }

        const effectiveStock =
          itemRecord.stock === undefined || itemRecord.stock === null
            ? 5
            : itemRecord.stock;
        if (effectiveStock < entry.quantity) {
          const enTrans = itemRecord.translations?.find(
            (t) => t.languageCode === 'en'
          );
          const name = enTrans ? enTrans.names[0] : itemRecord.name || 'Item';
          return res.status(400).json({
            error: `Inadequate stock for "${name}". Available: ${effectiveStock}, requested: ${entry.quantity}.`,
          });
        }
      }
    }

    // Generate a mock Razorpay order ID
    const randomChars = crypto.randomBytes(6).toString('hex');
    const order_id = `order_mock_${randomChars}`;

    res.json({
      id: order_id,
      amount: amount,
      currency: currency || 'INR',
      receipt: receipt || '',
      status: 'created',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/orders/razorpay/verify - Verify signature and place actual order
router.post('/razorpay/verify', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      deliveryAddress,
      phoneNumber,
      items,
      totalAmount,
    } = req.body;

    // Verify signature
    const text = razorpay_order_id + '|' + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_MOCK_SECRET)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Proceed with placing the order (from the original POST / logic)
    if (!deliveryAddress || !deliveryAddress.trim()) {
      return res.status(400).json({ error: 'Delivery address is required' });
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      return res
        .status(400)
        .json({ error: 'Phone number is required for delivery contact' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order cart cannot be empty' });
    }

    // Verify stock availability
    for (const entry of items) {
      const itemRecord = await Item.findById(entry._id);
      if (!itemRecord) {
        return res.status(404).json({ error: `Item not found in catalog.` });
      }

      const effectiveStock =
        itemRecord.stock === undefined || itemRecord.stock === null
          ? 5
          : itemRecord.stock;
      if (effectiveStock < entry.quantity) {
        const enTrans = itemRecord.translations.find(
          (t) => t.languageCode === 'en'
        );
        const name = enTrans ? enTrans.names[0] : 'Item';
        return res.status(400).json({
          error: `Inadequate stock for "${name}". Available: ${effectiveStock}, requested: ${entry.quantity}.`,
        });
      }
    }

    // Deduct stock
    for (const entry of items) {
      const itemRecord = await Item.findById(entry._id);
      if (itemRecord) {
        const effectiveStock =
          itemRecord.stock === undefined || itemRecord.stock === null
            ? 5
            : itemRecord.stock;
        itemRecord.stock = Math.max(0, effectiveStock - entry.quantity);
        await itemRecord.save();
      }
    }

    const formattedItems = items.map((entry) => ({
      item: entry._id,
      quantity: entry.quantity,
      priceAtOrder: entry.latestPrice || 0,
    }));

    const newOrder = new Order({
      user: req.user._id,
      items: formattedItems,
      totalAmount,
      deliveryAddress: deliveryAddress.trim(),
      phoneNumber: phoneNumber.trim(),
      paymentStatus: 'Paid',
      deliveryStatus: 'Placed',
    });

    await newOrder.save();

    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/orders - Place a new mock order (Legacy)
router.post('/', async (req, res) => {
  try {
    const { deliveryAddress, phoneNumber, items, totalAmount } = req.body;

    if (!deliveryAddress || !deliveryAddress.trim()) {
      return res.status(400).json({ error: 'Delivery address is required' });
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      return res
        .status(400)
        .json({ error: 'Phone number is required for delivery contact' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order cart cannot be empty' });
    }

    // Verify stock availability
    for (const entry of items) {
      const itemRecord = await Item.findById(entry._id);
      if (!itemRecord) {
        return res.status(404).json({ error: `Item not found in catalog.` });
      }

      // Enforce stock limits on all items (temporarily fallback null/undefined to 5)
      const effectiveStock =
        itemRecord.stock === undefined || itemRecord.stock === null
          ? 5
          : itemRecord.stock;
      if (effectiveStock < entry.quantity) {
        const enTrans = itemRecord.translations.find(
          (t) => t.languageCode === 'en'
        );
        const name = enTrans ? enTrans.names[0] : 'Item';
        return res.status(400).json({
          error: `Inadequate stock for "${name}". Available: ${effectiveStock}, requested: ${entry.quantity}.`,
        });
      }
    }

    // Deduct stock
    for (const entry of items) {
      const itemRecord = await Item.findById(entry._id);
      if (itemRecord) {
        const effectiveStock =
          itemRecord.stock === undefined || itemRecord.stock === null
            ? 5
            : itemRecord.stock;
        itemRecord.stock = Math.max(0, effectiveStock - entry.quantity);
        await itemRecord.save();
      }
    }

    const formattedItems = items.map((entry) => ({
      item: entry._id,
      quantity: entry.quantity,
      priceAtOrder: entry.latestPrice || 0,
    }));

    const newOrder = new Order({
      user: req.user._id,
      items: formattedItems,
      totalAmount,
      deliveryAddress: deliveryAddress.trim(),
      phoneNumber: phoneNumber.trim(),
      paymentStatus: 'Paid',
      deliveryStatus: 'Placed',
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
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user,
    }).populate('items.item');

    if (!order) {
      return res.status(404).json({ error: 'Order details not found' });
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

    if (
      order.deliveryStatus !== currentStatus &&
      order.deliveryStatus !== 'Delivered'
    ) {
      order.deliveryStatus = currentStatus;
      await order.save();
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
