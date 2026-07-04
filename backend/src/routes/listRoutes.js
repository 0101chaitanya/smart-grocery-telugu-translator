import express from 'express';
import GroceryList from '../models/GroceryList.js';
import PriceRecord from '../models/PriceRecord.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Helper function to enrich list item populated values with current prices and total valuations
const enrichListPrices = async (listDoc) => {
  const list = listDoc.toObject();

  let originalValue = 0;
  let currentValue = 0;

  list.items = await Promise.all(
    list.items.map(async (entry) => {
      if (entry.item) {
        const itemId = entry.item._id;

        // Fetch latest price logged for this item
        const latestRecord = await PriceRecord.findOne({ item: itemId })
          .sort({ createdAt: -1 })
          .select('price');

        // Fetch average price logged for this item
        const avgResult = await PriceRecord.aggregate([
          { $match: { item: itemId } },
          { $group: { _id: null, avgPrice: { $avg: '$price' } } },
        ]);

        const latestPrice = latestRecord ? latestRecord.price : 0;
        entry.item.latestPrice = latestPrice;
        entry.item.avgPrice =
          avgResult.length > 0
            ? Math.round(avgResult[0].avgPrice * 100) / 100
            : 0;

        // Accumulate original cost snapshot vs. current valuation
        originalValue +=
          entry.quantity * (entry.priceAtSave || latestPrice || 0);
        currentValue += entry.quantity * (latestPrice || 0);
      }
      return entry;
    })
  );

  list.originalValue = Math.round(originalValue * 100) / 100;
  list.currentValue = Math.round(currentValue * 100) / 100;

  return list;
};

// 1. GET /api/lists - Fetch all lists for the logged-in user
router.get('/', async (req, res) => {
  try {
    const lists = await GroceryList.find({ user: req.user })
      .populate('items.item')
      .sort({ createdAt: -1 });

    const enrichedLists = await Promise.all(lists.map(enrichListPrices));
    res.json(enrichedLists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/lists - Create a new saved list (logs current prices)
router.post('/', async (req, res) => {
  try {
    const { name, items } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'List name is required' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cannot save an empty list' });
    }

    const formattedItems = await Promise.all(
      items.map(async (entry) => {
        // Query the latest price logged for this item to preserve snapshot
        const latestPriceRecord = await PriceRecord.findOne({ item: entry._id })
          .sort({ createdAt: -1 })
          .select('price');

        return {
          item: entry._id,
          quantity: entry.quantity,
          priceAtSave: latestPriceRecord ? latestPriceRecord.price : 0,
        };
      })
    );

    const newList = new GroceryList({
      name: name.trim(),
      user: req.user,
      items: formattedItems,
    });

    await newList.save();

    const populatedList = await GroceryList.findById(newList._id).populate(
      'items.item'
    );
    const enrichedList = await enrichListPrices(populatedList);
    res.status(201).json(enrichedList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. PUT /api/lists/:id - Update list
router.put('/:id', async (req, res) => {
  try {
    const { name, items } = req.body;
    const list = await GroceryList.findOne({
      _id: req.params.id,
      user: req.user,
    });
    if (!list) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }

    if (name && name.trim()) {
      list.name = name.trim();
    }

    if (items) {
      list.items = await Promise.all(
        items.map(async (entry) => {
          const latestPriceRecord = await PriceRecord.findOne({
            item: entry._id,
          })
            .sort({ createdAt: -1 })
            .select('price');

          return {
            item: entry._id,
            quantity: entry.quantity,
            priceAtSave: latestPriceRecord ? latestPriceRecord.price : 0,
          };
        })
      );
    }

    await list.save();

    const populatedList = await GroceryList.findById(list._id).populate(
      'items.item'
    );
    const enrichedList = await enrichListPrices(populatedList);
    res.json(enrichedList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. DELETE /api/lists/:id - Delete a saved list
router.delete('/:id', async (req, res) => {
  try {
    const list = await GroceryList.findOneAndDelete({
      _id: req.params.id,
      user: req.user,
    });
    if (!list) {
      return res.status(404).json({ error: 'List not found or unauthorized' });
    }
    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
