import express from 'express';
import Item from '../models/Item.js';
import PriceRecord from '../models/PriceRecord.js';
import { protect } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';

const router = express.Router();

// Gated behind authentication
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        'translations.names': { $regex: search, $options: 'i' },
      };
    }

    const items = await Item.find(query).lean();
    if (items.length === 0) {
      return res.json([]);
    }

    const itemIds = items.map(item => item._id);

    // 1. Bulk Auto-Seeding check
    const existingPrices = await PriceRecord.distinct('item', { item: { $in: itemIds } });
    const seededItemIdsSet = new Set(existingPrices.map(id => id.toString()));

    const itemsToSeed = items.filter(item => !seededItemIdsSet.has(item._id.toString()));
    if (itemsToSeed.length > 0) {
      const seedRecords = [];
      for (const item of itemsToSeed) {
        const basePrice = Math.floor(Math.random() * 50) + 30;
        const seeds = [
          { daysAgo: 3, priceChange: -5 },
          { daysAgo: 2, priceChange: 5 },
          { daysAgo: 1, priceChange: 0 },
        ];
        for (const seed of seeds) {
          const seedDate = new Date();
          seedDate.setDate(seedDate.getDate() - seed.daysAgo);
          seedRecords.push({
            item: item._id,
            price: basePrice + seed.priceChange,
            user: req.user._id,
            createdAt: seedDate
          });
        }
      }
      if (seedRecords.length > 0) {
        await PriceRecord.insertMany(seedRecords);
      }
    }

    // 2. Retrieve all Price Records for returned items in a single query
    const allPrices = await PriceRecord.find({ item: { $in: itemIds } }).sort({ createdAt: 1 });

    // Group price logs in-memory
    const pricesMap = {};
    allPrices.forEach(record => {
      const itemIdStr = record.item.toString();
      if (!pricesMap[itemIdStr]) {
        pricesMap[itemIdStr] = [];
      }
      pricesMap[itemIdStr].push(record.price);
    });

    // 3. Map and enrich items list
    const enrichedItems = items.map(item => {
      // Dynamic image fallback
      if (!item.imageUrl) {
        const englishTranslation = item.translations.find(t => t.languageCode === 'en');
        const primaryEnglishName = englishTranslation && englishTranslation.names.length > 0
          ? englishTranslation.names[0]
          : 'grocery';
        item.imageUrl = `https://image.pollinations.ai/prompt/fresh%20${encodeURIComponent(primaryEnglishName)}%20grocery%20item%20isolated%20on%20white%20background?width=300&height=300&nologo=true`;
      }

      const itemPrices = pricesMap[item._id.toString()] || [];
      
      item.latestPrice = itemPrices.length > 0 ? itemPrices[itemPrices.length - 1] : 0;
      
      if (itemPrices.length > 0) {
        const total = itemPrices.reduce((sum, p) => sum + p, 0);
        item.avgPrice = Math.round((total / itemPrices.length) * 100) / 100;
      } else {
        item.avgPrice = 0;
      }

      return item;
    });

    res.json(enrichedItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function extractJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
}

// 2. POST /api/items/lookup - Search DB or auto-generate transliterations
router.post('/lookup', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const trimmedName = name.trim();

    // Search database for existing item matching this name
    const existingItem = await Item.findOne({
      'translations.names': { $regex: `^${trimmedName}$`, $options: 'i' },
    });

    if (existingItem) {
      return res.json({ source: 'database', item: existingItem });
    }

    // OpenRouter API setup
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return res.status(500).json({
        error: 'OpenRouter API Key configuration is missing on the server.',
      });
    }

    const systemPrompt = `You are an AI assistant for a grocery translation app in India.
Translate the input name into English and Telugu. Provide common Telugu regional variations (e.g. for Onion: ["ఉల్లిపాయ", "ఎర్రగడ్డ"]).
Detect the correct category (Groceries, Vegetables, Fruits, Spices, Others) and defaultUnit (kg, g, L, ml, pcs, pack).
Estimate a typical current retail market price in India (in INR ₹ per defaultUnit) and a normal price range (min/max). Ensure the pricing feels realistic for Indian local markets.
Return ONLY a strict JSON object with this shape:
{
  "category": "Groceries" | "Vegetables" | "Fruits" | "Spices" | "Others",
  "defaultUnit": "kg" | "g" | "L" | "ml" | "pcs" | "pack",
  "estimatedPrice": 40,
  "priceRangeMin": 30,
  "priceRangeMax": 50,
  "translations": [
    { "languageCode": "en", "names": ["Onion", "Red Onion"] },
    { "languageCode": "te", "names": ["ఉల్లిపాయ", "ఎర్రగడ్డ"] }
  ]
}`;

    let generatedData;

    try {
      console.log(`Querying OpenRouter: openrouter/free`);
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Mana Grocery Tracker',
          },
          body: JSON.stringify({
            model: 'openrouter/free',
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: `Translate the grocery item name: "${trimmedName}"`,
              },
            ],
            response_format: { type: 'json_object' },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenRouter returned status ${response.status}`);
      }

      const result = await response.json();
      const rawContent = result.choices[0].message.content;
      generatedData = extractJSON(rawContent);
    } catch (apiError) {
      console.warn(
        'API translation failed, applying graceful fallback:',
        apiError.message
      );
      generatedData = {
        category: 'Others',
        defaultUnit: 'kg',
        estimatedPrice: 30,
        translations: [
          { languageCode: 'en', names: [trimmedName] },
          { languageCode: 'te', names: [trimmedName] },
        ],
      };
    }

    const englishTranslation = generatedData.translations.find(
      (t) => t.languageCode === 'en'
    );
    const primaryEnglishName =
      englishTranslation && englishTranslation.names.length > 0
        ? englishTranslation.names[0]
        : trimmedName;

    const imageUrl = `https://image.pollinations.ai/prompt/fresh%20${encodeURIComponent(primaryEnglishName)}%20grocery%20item%20isolated%20on%20white%20background?width=300&height=300&nologo=true`;

    const newItem = new Item({
      category: generatedData.category || 'Others',
      defaultUnit: generatedData.defaultUnit || 'kg',
      translations: generatedData.translations,
      imageUrl: imageUrl,
    });

    await newItem.save();

    const initialPrice = generatedData.estimatedPrice || 25;
    const priceRecord = new PriceRecord({
      item: newItem._id,
      price: Number(initialPrice),
      user: req.user,
    });
    await priceRecord.save();

    res.status(201).json({ source: 'openrouter', item: newItem });
  } catch (error) {
    console.error('Lookup Error:', error);
    res.status(500).json({
      error:
        'Our translation system is temporarily busy. Please check your network or try again.',
    });
  }
});

// 3. PUT /api/items/:id/regenerate - Re-trigger LLM translation and image generation
router.put('/:id/regenerate', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const englishTranslation = item.translations.find(
      (t) => t.languageCode === 'en'
    );
    const lookupName =
      englishTranslation && englishTranslation.names.length > 0
        ? englishTranslation.names[0]
        : item.translations[0]?.names[0];

    if (!lookupName) {
      return res.status(400).json({ error: 'Could not resolve item name' });
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return res
        .status(500)
        .json({ error: 'OpenRouter API Key configuration is missing.' });
    }

    const systemPrompt = `You are an AI assistant for a grocery translation app in India.
Translate the input name into English and Telugu. Provide common Telugu regional variations (e.g. ["ఉల్లిపాయ", "ఎర్రగడ్డ"]).
Detect the correct category (Groceries, Vegetables, Fruits, Spices, Others) and defaultUnit (kg, g, L, ml, pcs, pack).
Estimate a typical current retail market price in India (in INR ₹ per defaultUnit) and a normal price range (min/max). Ensure the pricing feels realistic for Indian local markets.
Return ONLY a strict JSON object with this shape:
{
  "category": "Groceries" | "Vegetables" | "Fruits" | "Spices" | "Others",
  "defaultUnit": "kg" | "g" | "L" | "ml" | "pcs" | "pack",
  "estimatedPrice": 40,
  "priceRangeMin": 30,
  "priceRangeMax": 50,
  "translations": [
    { "languageCode": "en", "names": ["Onion", "Red Onion"] },
    { "languageCode": "te", "names": ["ఉల్లిపాయ", "ఎర్రగడ్డ"] }
  ]
}`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Mana Grocery Tracker',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Translate the grocery item name: "${lookupName}"`,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      }
    );

    if (!response.ok) {
      return res.status(503).json({
        error:
          'Translation servers are busy. Please try again in a few seconds.',
      });
    }

    const result = await response.json();
    const rawContent = result.choices[0].message.content;

    let generatedData;
    try {
      generatedData = extractJSON(rawContent);
    } catch (parseError) {
      return res.status(422).json({
        error:
          'Received corrupted data from translation service. Please try again.',
      });
    }

    const newEnglishTranslation = generatedData.translations.find(
      (t) => t.languageCode === 'en'
    );
    const newEnglishName =
      newEnglishTranslation && newEnglishTranslation.names.length > 0
        ? newEnglishTranslation.names[0]
        : lookupName;

    const randomSeed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/fresh%20${encodeURIComponent(newEnglishName)}%20grocery%20item%20isolated%20on%20white%20background?width=300&height=300&nologo=true&seed=${randomSeed}`;

    item.category = generatedData.category || 'Others';
    item.defaultUnit = generatedData.defaultUnit || 'kg';
    item.translations = generatedData.translations;
    item.imageUrl = imageUrl;

    await item.save();

    const initialPrice = generatedData.estimatedPrice || 25;
    const priceRecord = new PriceRecord({
      item: item._id,
      price: Number(initialPrice),
      user: req.user,
    });
    await priceRecord.save();

    res.json(item);
  } catch (error) {
    console.error('Regeneration Error:', error);
    res.status(500).json({
      error: 'Failed to regenerate item details. Please check your connection.',
    });
  }
});

// 4. POST /api/items/:id/prices - Log a new price point
router.post('/:id/prices', protect, async (req, res) => {
  try {
    const { price } = req.body;
    if (price === undefined || Number(price) <= 0) {
      return res
        .status(400)
        .json({ error: 'A valid price greater than zero is required' });
    }

    const newPrice = new PriceRecord({
      item: req.params.id,
      price: Number(price),
      user: req.user,
    });

    await newPrice.save();
    res.status(201).json(newPrice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1.1 GET /api/items/:id/trends - Group and retrieve price logs over Day/Week/Month/Year
router.get('/:id/trends', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query; // 'day' | 'week' | 'month' | 'year'

    // Set aggregation grouping string pattern based on period
    let format = '%Y-%m-%d'; // default Day
    if (period === 'week') format = '%Y-W%V';
    else if (period === 'month') format = '%Y-%m';
    else if (period === 'year') format = '%Y';

    const trends = await PriceRecord.aggregate([
      { $match: { item: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: { $dateToString: { format: format, date: '$createdAt' } },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } }, // Sort chronologically
    ]);

    const formattedTrends = trends.map((t) => ({
      label: t._id,
      avgPrice: Math.round(t.avgPrice * 100) / 100,
      minPrice: t.minPrice,
      maxPrice: t.maxPrice,
      count: t.count,
    }));

    res.json(formattedTrends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
