import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/user.model';
import { MarqueeNews } from '../models/marqueeNews.model';
import { UserRole } from '../types/user.types';

async function seed() {
  await mongoose.connect(config.mongoUri || 'mongodb://127.0.0.1:27017/polaris', {
    dbName: 'polaris',
  });
  const admin = await User.findOne({ role: UserRole.ADMIN });
  if (!admin) {
    console.error('No admin found.');
    process.exit(1);
  }

  await MarqueeNews.deleteMany({});
  await MarqueeNews.create([
    {
      textEn: '45th Indian Antarctic Expedition applications are now open.',
      textHi: '45वें भारतीय अंटार्कटिक अभियान के लिए आवेदन अब खुले हैं।',
      enabled: true,
      createdBy: admin._id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      textEn: 'New polar cryosphere & ice sheet elevation dataset published on POLARIS.',
      textHi: 'पोलारिस पर नया ध्रुवीय क्रायोस्फीयर और बर्फ की चादर का उन्नयन डेटासेट प्रकाशित।',
      enabled: true,
      createdBy: admin._id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  ]);
  console.log('✅ Seeded 2 active announcements for testing.');
  await mongoose.disconnect();
}

seed().catch(console.error);
