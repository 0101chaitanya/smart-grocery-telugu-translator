import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'te'],
      default: 'en',
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
