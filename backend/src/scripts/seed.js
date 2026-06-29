import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GroceryItem } from '../models/GroceryItem.js';

// Load environmental parameters (Database URI)
dotenv.config();

// Define a substantial baseline of staple local items across categories
const mockGroceries = [
  {
    englishName: 'coriander',
    teluguName: 'కొత్తిమీర',
    transliteration: 'Kothimeera',
    category: 'vegetables',
  },
  {
    englishName: 'tomato',
    teluguName: 'టమోటా',
    transliteration: 'Tamota',
    category: 'vegetables',
  },
  {
    englishName: 'cumin',
    teluguName: 'జీలకర్ర',
    transliteration: 'Jeelakarra',
    category: 'spices',
  },
  {
    englishName: 'mustard seeds',
    teluguName: 'ఆవాలు',
    transliteration: 'Aavalu',
    category: 'spices',
  },
  {
    englishName: 'turmeric',
    teluguName: 'పసుపు',
    transliteration: 'Pasupu',
    category: 'spices',
  },
  {
    englishName: 'garlic',
    teluguName: 'వెల్లుల్లి',
    transliteration: 'Vellulli',
    category: 'vegetables',
  },
  {
    englishName: 'ginger',
    teluguName: 'అల్లం',
    transliteration: 'Allam',
    category: 'vegetables',
  },
  {
    englishName: 'onion',
    teluguName: 'ఉల్లిపాయ',
    transliteration: 'Ullipaya',
    category: 'vegetables',
  },
];

async function seedDatabase() {
  try {
    // 1. Establish database connection
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Seed script connected to MongoDB successfully.');

    // 2. Wipe the collection clear
    await GroceryItem.deleteMany({});
    console.log('Cleared existing database records.');

    // 3. Batch insert dataset
    const insertedRecords = await GroceryItem.insertMany(mockGroceries);
    console.log(
      `Successfully injected ${insertedRecords.length} grocery items into the cache layer.`
    );
  } catch (error) {
    console.error('Critical failure running seed automation:', error);
  } finally {
    // 4. Always shut down connection pipelines cleanly
    await mongoose.disconnect();
    console.log('Database connection disconnected cleanly. Process complete.');
  }
}

seedDatabase();
