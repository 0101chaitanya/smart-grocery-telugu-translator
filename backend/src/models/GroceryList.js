import mongoose from 'mongoose';

const groceryListItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    priceAtSave: {
      type: Number,
      required: true,
      default: 0, // Captures price snapshot at time of list creation
    },
  },
  { _id: false }
);

const groceryListSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [groceryListItemSchema],
  },
  { timestamps: true }
);

groceryListSchema.index({ user: 1 });

export default mongoose.model('GroceryList', groceryListSchema);
