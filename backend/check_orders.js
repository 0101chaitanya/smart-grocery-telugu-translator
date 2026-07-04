import mongoose from 'mongoose';
import Order from './src/models/Order.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    const userId = '6a48a419354d3f96a94e4b9e';

    const ordersWithDoc = await Order.find({ user: userId }).lean();
    console.log('Find by user string ID results count:', ordersWithDoc.length);

    const ordersWithObj = await Order.find({
      user: new mongoose.Types.ObjectId(userId),
    }).lean();
    console.log(
      'Find by Mongoose ObjectId results count:',
      ordersWithObj.length
    );
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
