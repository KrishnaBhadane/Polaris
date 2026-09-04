import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '../config/env';
import { User } from '../models/user.model';
import { UserRole, AccountStatus } from '../types/user.types';
import { logger } from '../utils/logger';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const seedAdmin = async (): Promise<void> => {
  const mongoUri = config.mongoUri || process.env.MONGODB_URI;

  if (!mongoUri) {
    logger.error('MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  const adminName = config.adminName ? config.adminName.trim() : 'POLARIS Administrator';
  const adminEmail = config.adminEmail ? config.adminEmail.trim().toLowerCase() : '';
  const adminPassword = config.adminPassword;

  // 1. Validation
  if (!adminEmail || !EMAIL_REGEX.test(adminEmail)) {
    logger.error(
      'ADMIN_EMAIL is missing or invalid in .env. Please provide a valid email address.'
    );
    process.exit(1);
  }

  if (!adminPassword || adminPassword.length < 8) {
    logger.error(
      'ADMIN_PASSWORD is missing or shorter than 8 characters in .env.'
    );
    process.exit(1);
  }

  try {
    // 2. Connect to MongoDB
    await mongoose.connect(mongoUri, {
      dbName: 'polaris',
    });
    logger.info('Connected to MongoDB for admin seeding.');

    // 3. Check for existing user
    const existingUser = await User.findOne({ email: adminEmail });

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    if (existingUser) {
      if (existingUser.role === UserRole.ADMIN) {
        logger.info(
          `Administrator account already exists for ${adminEmail}. Updating credentials.`
        );
        existingUser.name = adminName;
        existingUser.password = hashedPassword;
        existingUser.emailVerified = true;
        existingUser.accountStatus = AccountStatus.ACTIVE;
        await existingUser.save();
        logger.info(`Administrator account updated successfully.`);
      } else {
        logger.info(
          `Existing user found for ${adminEmail}. Upgrading account role to ADMIN.`
        );
        existingUser.name = adminName;
        existingUser.password = hashedPassword;
        existingUser.role = UserRole.ADMIN;
        existingUser.emailVerified = true;
        existingUser.accountStatus = AccountStatus.ACTIVE;
        await existingUser.save();
        logger.info(`User successfully elevated to ADMIN.`);
      }
    } else {
      // 4. Create new Administrator user
      await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: UserRole.ADMIN,
        emailVerified: true,
        accountStatus: AccountStatus.ACTIVE,
      });

      logger.info(
        `Administrator account created successfully for: ${adminEmail}`
      );
    }

    await mongoose.disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown seeding error';
    logger.error(`Admin seeding failed: ${errorMsg}`);
    process.exit(1);
  }
};

seedAdmin();
