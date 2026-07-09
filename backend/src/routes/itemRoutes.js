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
    const { search, category } = req.query;
    let query = {};

    if (search && search.trim()) {
      query['translations.names'] = { $regex: search.trim(), $options: 'i' };
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    let items = await Item.find(query).lean();
    if (items.length === 0) {
      return res.json([]);
    }

    // Temporarily map items with no stock (null or undefined) to a default stock of 5
    items = items.map((item) => {
      if (item.stock === undefined || item.stock === null) {
        return { ...item, stock: 5 };
      }
      return item;
    });

    const itemIds = items.map((item) => item._id);



    // 2. Retrieve all Price Records for returned items in a single query
    const allPrices = await PriceRecord.find({ item: { $in: itemIds } }).sort({
      createdAt: 1,
    });

    // Group price logs in-memory
    const pricesMap = {};
    const latestPriceDateMap = {};
    allPrices.forEach((record) => {
      const itemIdStr = record.item.toString();
      if (!pricesMap[itemIdStr]) {
        pricesMap[itemIdStr] = [];
      }
      pricesMap[itemIdStr].push(record.price);
      latestPriceDateMap[itemIdStr] = record.createdAt;
    });

    // 3. Map and enrich items list
    const enrichedItems = items.map((item) => {
      // Dynamic image fallback
      if (!item.imageUrl) {
        const englishTranslation = item.translations.find(
          (t) => t.languageCode === 'en'
        );
        const primaryEnglishName =
          englishTranslation && englishTranslation.names.length > 0
            ? englishTranslation.names[0]
            : 'grocery';
        item.imageUrl = `https://image.pollinations.ai/prompt/fresh%20${encodeURIComponent(primaryEnglishName)}%20grocery%20item%20isolated%20on%20white%20background?width=300&height=300&nologo=true`;
      }

      const itemPrices = pricesMap[item._id.toString()] || [];
      const lastDate = latestPriceDateMap[item._id.toString()];

      item.latestPrice =
        itemPrices.length > 0 ? itemPrices[itemPrices.length - 1] : 0;
      item.lastPriceUpdated = lastDate ? lastDate.toISOString() : null;

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
    if (req.user.role !== 'seller') {
      return res
        .status(403)
        .json({ error: 'Only sellers can add new items to the catalog.' });
    }

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
Detect the correct category (Groceries, Vegetables, Fruits, Spices, Dairy, Beverages, Snacks, Others) and defaultUnit (kg, g, L, ml, pcs, pack).
Estimate a typical current retail market price in India (in INR ₹ per defaultUnit) and a normal price range (min/max). Ensure the pricing feels realistic for Indian local markets.
Return ONLY a strict JSON object with this shape:
{
  "category": "Groceries" | "Vegetables" | "Fruits" | "Spices" | "Dairy" | "Beverages" | "Snacks" | "Others",
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
            'X-Title': 'Mana grocery store',
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
        'API translation failed, using local safe fallback:',
        apiError.message
      );

      // Fallback inference logic
      let inferredCategory = 'Groceries';
      let inferredUnit = 'kg';

      const lowerName = trimmedName.toLowerCase();
      const vegKeywords = [
        'onion',
        'tomato',
        'potato',
        'chilli',
        'garlic',
        'ginger',
        'carrot',
        'cabbage',
        'aloo',
        'ఉల్లి',
        'టమో',
        'బంగా',
        'కూరగాయ',
      ];
      const fruitKeywords = [
        'apple',
        'banana',
        'mango',
        'grape',
        'orange',
        'యాపి',
        'అరటి',
        'మామి',
        'పండు',
      ];
      const spiceKeywords = [
        'masala',
        'powder',
        'pepper',
        'cardamom',
        'clove',
        'cinnamon',
        'కారం',
        'పసుపు',
        'మసాలా',
      ];
      const dairyKeywords = [
        'milk',
        'curd',
        'paneer',
        'butter',
        'ghee',
        'yogurt',
        'cheese',
        'పాలు',
        'నెయ్యి',
        'పనీర్',
      ];
      const beverageKeywords = [
        'tea',
        'coffee',
        'cola',
        'pepsi',
        'drink',
        'soda',
        'juice',
        'టీ',
        'కాఫీ',
        'పానీయం',
      ];
      const snackKeywords = [
        'chips',
        'biscuit',
        'chocolate',
        'namkeen',
        'bhujia',
        'బిస్కె',
        'తినుబండ',
      ];

      if (vegKeywords.some((kw) => lowerName.includes(kw))) {
        inferredCategory = 'Vegetables';
      } else if (fruitKeywords.some((kw) => lowerName.includes(kw))) {
        inferredCategory = 'Fruits';
        inferredUnit = 'pcs';
      } else if (spiceKeywords.some((kw) => lowerName.includes(kw))) {
        inferredCategory = 'Spices';
        inferredUnit = 'g';
      } else if (dairyKeywords.some((kw) => lowerName.includes(kw))) {
        inferredCategory = 'Dairy';
        inferredUnit = 'L';
      } else if (beverageKeywords.some((kw) => lowerName.includes(kw))) {
        inferredCategory = 'Beverages';
        inferredUnit = 'pack';
      } else if (snackKeywords.some((kw) => lowerName.includes(kw))) {
        inferredCategory = 'Snacks';
        inferredUnit = 'pack';
      }

      generatedData = {
        category: inferredCategory,
        defaultUnit: inferredUnit,
        estimatedPrice: 35,
        translations: [
          { languageCode: 'en', names: [trimmedName] },
          { languageCode: 'te', names: [trimmedName] },
        ],
      };
    }

    if (!generatedData.category || generatedData.category === 'Others') {
      return res.status(400).json({
        error: `"${trimmedName}" is categorized as 'Others' (not a grocery item) and cannot be added. Please enter a valid grocery, vegetable, fruit, spice, dairy, beverage, or snack name.`,
      });
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
      category: generatedData.category,
      defaultUnit: generatedData.defaultUnit || 'kg',
      translations: generatedData.translations,
      imageUrl: imageUrl,
      seller: req.user._id,
      stock: 0,
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
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Only sellers can modify items.' });
    }

    const { id } = req.params;
    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
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
Detect the correct category (Groceries, Vegetables, Fruits, Spices, Dairy, Beverages, Snacks, Others) and defaultUnit (kg, g, L, ml, pcs, pack).
Estimate a typical current retail market price in India (in INR ₹ per defaultUnit) and a normal price range (min/max). Ensure the pricing feels realistic for Indian local markets.
Return ONLY a strict JSON object with this shape:
{
  "category": "Groceries" | "Vegetables" | "Fruits" | "Spices" | "Dairy" | "Beverages" | "Snacks" | "Others",
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
          'X-Title': 'Mana grocery store',
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

// 1.1 GET /api/items/:id/trends - Group and retrieve price logs over Day/Week
router.get('/:id/trends', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query; // 'day' | 'week'

    // Set aggregation grouping string pattern based on period
    let format = '%Y-%m-%d'; // default Day
    if (period === 'week') {
      format = '%Y-W%V';
    }

    const trends = await PriceRecord.aggregate([
      {
        $match: {
          item: new mongoose.Types.ObjectId(id),
          user: new mongoose.Types.ObjectId(req.user._id),
        },
      },
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

    const formattedTrends = trends.map((t) => {
      let label = t._id;
      if (period === 'week' && t._id.includes('-W')) {
        const parts = t._id.split('-W');
        const year = parseInt(parts[0], 10);
        const week = parseInt(parts[1], 10);

        // Calculate the Monday of that ISO week number
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dow = simple.getDay();
        const monday = new Date(simple);
        if (dow <= 4) {
          monday.setDate(simple.getDate() - simple.getDay() + 1);
        } else {
          monday.setDate(simple.getDate() + 8 - simple.getDay());
        }

        const yyyy = monday.getFullYear();
        const mm = String(monday.getMonth() + 1).padStart(2, '0');
        const dd = String(monday.getDate()).padStart(2, '0');
        label = `${yyyy}-${mm}-${dd}`;
      }

      return {
        label,
        avgPrice: Math.round(t.avgPrice * 100) / 100,
        minPrice: t.minPrice,
        maxPrice: t.maxPrice,
        count: t.count,
      };
    });

    res.json(formattedTrends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. PUT /api/items/:id/stock - Update stock and latest price (Sellers only)
router.put('/:id/stock', protect, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Only sellers can manage stock.' });
    }

    const { id } = req.params;
    const { stock, price } = req.body;

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    if (stock !== undefined) {
      item.stock = Number(stock);
    }
    await item.save();

    if (price !== undefined && Number(price) > 0) {
      const newPrice = new PriceRecord({
        item: item._id,
        price: Number(price),
        user: req.user._id,
      });
      await newPrice.save();
    }

    // Return the updated item
    res.json({ message: 'Stock and price updated successfully', item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
