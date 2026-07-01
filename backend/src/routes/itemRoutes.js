import express from 'express';
import Item from '../models/Item.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // check this later

// 1. GET /api/items - Fetch all items (searches English & Telugu regional names)
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        'translations.names': { $regex: search, $options: 'i' },
      };
    }

    const items = await Item.find(query);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to safely extract JSON from LLM markdown fences
function extractJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return JSON.parse(text);
}

// POST /api/items/lookup - Search DB or auto-generate transliterations via Google Gemma models on OpenRouter
router.post('/lookup', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const trimmedName = name.trim();

    // 1. Search database for existing item matching this name
    const existingItem = await Item.findOne({
      'translations.names': { $regex: `^${trimmedName}$`, $options: 'i' },
    });

    if (existingItem) {
      return res.json({ source: 'database', item: existingItem });
    }

    // 2. OpenRouter API setup
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return res.status(500).json({
        error: 'OpenRouter API Key is missing in server environment (.env)',
      });
    }

    const systemPrompt = `You are an AI assistant for a grocery translation app in India.
Translate the input name into English and Telugu. Provide common Telugu regional variations (e.g. for Onion: ["ఉల్లిపాయ", "ఎర్రగడ్డ"]).
Detect the correct category (Groceries, Vegetables, Fruits, Spices, Others) and defaultUnit (kg, g, L, ml, pcs, pack).
Return ONLY a strict JSON object with this shape:
{
  "category": "Groceries" | "Vegetables" | "Fruits" | "Spices" | "Others",
  "defaultUnit": "kg" | "g" | "L" | "ml" | "pcs" | "pack",
  "translations": [
    { "languageCode": "en", "names": ["Onion", "Red Onion"] },
    { "languageCode": "te", "names": ["ఉల్లిపాయ", "ఎర్రగడ్డ"] }
  ]
}`;

    // List of models to try in order
    const modelsToTry = [
      'google/gemma-4-26b-a4b-it:free',
      'google/gemma-4-31b-it:free',
    ];

    let openRouterResponse = null;
    let lastError = null;

    // Try models sequentially until one succeeds
    for (const model of modelsToTry) {
      try {
        console.log(`Attempting translation using model: ${model}`);
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
              model: model,
              messages: [
                { role: 'system', content: systemPrompt },
                {
                  role: 'user',
                  content: `Translate the grocery item name: "${trimmedName}"`,
                },
              ],
              response_format: { type: 'json_object' }, // Guides model to return valid JSON
            }),
          }
        );

        if (response.ok) {
          openRouterResponse = response;
          break; // Stop loop on success
        } else {
          const errText = await response.text();
          throw new Error(
            `Model ${model} returned status ${response.status}: ${errText}`
          );
        }
      } catch (err) {
        console.warn(`Failed with model ${model}:`, err.message);
        lastError = err;
      }
    }

    if (!openRouterResponse) {
      throw new Error(
        `All translation models failed. Last error: ${lastError ? lastError.message : 'Unknown error'}`
      );
    }

    const result = await openRouterResponse.json();
    const rawContent = result.choices[0].message.content;

    // Parse the generated schema from LLM
    const generatedData = extractJSON(rawContent);

    // Save the new item in the database
    const newItem = new Item({
      category: generatedData.category || 'Others',
      defaultUnit: generatedData.defaultUnit || 'kg',
      translations: generatedData.translations,
    });

    await newItem.save();
    res.status(201).json({ source: 'openrouter', item: newItem });
  } catch (error) {
    console.error('Lookup/Transliteration Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Keep the standard post route as backup
router.post('/', async (req, res) => {
  try {
    const { category, defaultUnit, translations } = req.body;
    const newItem = new Item({ category, defaultUnit, translations });
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
