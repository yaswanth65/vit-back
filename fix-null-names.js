import dotenv from 'dotenv';
dotenv.config();

import sequelize from './src/config/database.js';
import { User } from './src/database/models/index.js';
import { Op } from 'sequelize';

/**
 * Migration Script: Fix Null first_name and last_name
 * 
 * This script finds all users with NULL first_name or last_name
 * and sets them to default values before applying NOT NULL constraint.
 * 
 * Run this BEFORE adding NOT NULL constraint to the database.
 */

async function fixNullNames() {
  try {
    console.log('🔧 Database Migration: Fixing NULL Names\n');
    console.log('📊 Connecting to database...');
    
    await sequelize.authenticate();
    console.log('✅ Connected successfully\n');

    // Find users with NULL first_name or last_name
    console.log('🔍 Searching for users with NULL names...');
    const usersWithNullNames = await User.findAll({
      where: {
        [Op.or]: [
          { first_name: null },
          { last_name: null },
        ],
      },
      raw: true,
    });

    if (usersWithNullNames.length === 0) {
      console.log('✅ No users with NULL names found\n');
      console.log('✨ Database is ready for NOT NULL constraint\n');
      await sequelize.close();
      process.exit(0);
    }

    console.log(`⚠️  Found ${usersWithNullNames.length} user(s) with NULL names\n`);

    // Update each user
    let updated = 0;
    for (const user of usersWithNullNames) {
      const updates = {};

      if (!user.first_name) {
        updates.first_name = 'User';
        console.log(`   - User ${user.id} (${user.email}): first_name set to 'User'`);
      }

      if (!user.last_name) {
        updates.last_name = 'Profile';
        console.log(`   - User ${user.id} (${user.email}): last_name set to 'Profile'`);
      }

      await User.update(updates, {
        where: { id: user.id },
      });

      updated++;
    }

    console.log(`\n✅ Updated ${updated} user(s) successfully\n`);
    console.log('📝 Next Steps:');
    console.log('   1. Run: npx sequelize-cli db:migrate');
    console.log('   2. Or manually run ALTER TABLE SQL:');
    console.log(`      ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;`);
    console.log(`      ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;\n`);

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

fixNullNames();
