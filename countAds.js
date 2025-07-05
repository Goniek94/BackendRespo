import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from './models/ad.js';

// Load environment variables
dotenv.config();

const countAds = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');

    // Count documents in the 'ads' collection
    const adCount = await Ad.countDocuments({});
    console.log(`Total number of ads in the database: ${adCount}`);

  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  }
};

countAds();
