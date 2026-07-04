import mongoose from 'mongoose';

const priceRecordSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

priceRecordSchema.index({ item: 1, createdAt: -1 });
priceRecordSchema.index({ user: 1 });

export default mongoose.model('PriceRecord', priceRecordSchema);
