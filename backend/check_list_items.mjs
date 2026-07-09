// Scratch: Check actual GroceryList items structure in DB
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const localizationSchema = new mongoose.Schema({ languageCode: String, names: [String] }, { _id: false });
const itemSchema = new mongoose.Schema({ category: String, defaultUnit: String, translations: [localizationSchema], imageUrl: String, seller: mongoose.Schema.Types.ObjectId, stock: Number }, { timestamps: true });
const Item = mongoose.model('Item', itemSchema);

const groceryListSchema = new mongoose.Schema({
  name: String,
  user: mongoose.Schema.Types.ObjectId,
  items: [{ item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }, quantity: Number, priceAtSave: Number }]
}, { timestamps: true });
const GroceryList = mongoose.model('GroceryList', groceryListSchema);

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
console.log('Connected');

const lists = await GroceryList.find({}).populate('items.item').limit(2).lean();
for (const list of lists) {
  console.log(`\nList: ${list.name}`);
  for (const entry of list.items) {
    if (!entry.item) {
      console.log('  entry.item is NULL');
    } else {
      console.log(`  item._id=${entry.item._id}, name field=${entry.item.name}, translations count=${entry.item.translations?.length}`);
      console.log('  translations:', JSON.stringify(entry.item.translations?.slice(0, 2)));
    }
  }
}
await mongoose.disconnect();
