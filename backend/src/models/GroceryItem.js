import mongoose from 'mongoose';

// Define the structure of a single grocery document
const groceryItemSchema = new mongoose.Schema(
  {
    englishName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    teluguName: {
      type: String,
      required: true,
      trim: true,
    },
    transliteration: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['vegetables', 'spices', 'fruits', 'lentils', 'others'],
      default: 'others',
    },
  },
  {
    timestamps: true, // Automatically injects createdAt and updatedAt fields
  }
);

// Compile the schema into a reusable Model instance
export const GroceryItem = mongoose.model('GroceryItem', groceryItemSchema);
