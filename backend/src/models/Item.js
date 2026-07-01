import mongoose from 'mongoose';

const localizationSchema = new mongoose.Schema({
  languageCode: { 
    type: String, 
    required: true 
  },
  names: [{ 
    type: String, 
    required: true 
  }]
}, { _id: false });

const itemSchema = new mongoose.Schema({
  category: { 
    type: String, 
    enum: ['Groceries', 'Vegetables', 'Fruits', 'Spices', 'Others'], 
    required: true 
  },
  defaultUnit: { 
    type: String, 
    enum: ['kg', 'g', 'L', 'ml', 'pcs', 'pack'], 
    default: 'kg' 
  },
  translations: [localizationSchema]
}, { 
  timestamps: true 
});

itemSchema.index({ 'translations.names': 'text' });

export default mongoose.model('Item', itemSchema);
