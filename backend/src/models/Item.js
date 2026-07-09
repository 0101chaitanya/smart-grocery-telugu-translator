import mongoose from 'mongoose';

const localizationSchema = new mongoose.Schema(
  {
    languageCode: {
      type: String,
      required: true,
    },
    names: [
      {
        type: String,
        required: true,
      },
    ],
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['Groceries', 'Vegetables', 'Fruits', 'Spices', 'Dairy', 'Beverages', 'Snacks', 'Others'],
      required: true,
    },
    defaultUnit: {
      type: String,
      enum: ['kg', 'g', 'L', 'ml', 'pcs', 'pack'],
      default: 'kg',
    },
    translations: [localizationSchema],
    // Field added to store AI stock image URLs
    imageUrl: {
      type: String,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    stock: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

itemSchema.index({ 'translations.names': 'text' });

export default mongoose.model('Item', itemSchema);
