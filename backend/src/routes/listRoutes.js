import express from 'express';
import GroceryList from '../models/GroceryList.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all list routes
router.use(protect);

// 1. GET /api/lists - Fetch all lists for the logged-in user
router.get('/', async (req, res) => {
  try {
    const lists = await GroceryList.find({ user: req.user })
      .populate('items.item') // Populates localized names and images
      .sort({ createdAt: -1 });
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/lists - Create a new saved list
router.post('/', async (req, res) => {
  try {
    const { name, items } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'List name is required' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cannot save an empty list' });
    }

    // Format items to match schema references
    const formattedItems = items.map((entry) => ({
      item: entry._id,
      quantity: entry.quantity,
    }));

    const newList = new GroceryList({
      name: name.trim(),
      user: req.user, // Tied to logged-in user
      items: formattedItems,
    });

    await newList.save();

    // Return the populated list so the frontend gets full details immediately
    const populatedList = await GroceryList.findById(newList._id).populate(
      'items.item'
    );
    res.status(201).json(populatedList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. DELETE /api/lists/:id - Delete a saved list
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
// 4. PUT /api/lists/:id - Update an existing list (items or name)
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
      list.items = items.map((entry) => ({
        item: entry._id,
        quantity: entry.quantity,
      }));
    }

    await list.save();

    const populatedList = await GroceryList.findById(list._id).populate(
      'items.item'
    );
    res.json(populatedList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
