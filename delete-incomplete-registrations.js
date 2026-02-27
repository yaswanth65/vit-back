/**
 * Delete Incomplete Registrations (Stuck at Step 2)
 * Safely removes 4 users with incomplete registration
 */

import sequelize from './src/config/database.js';
import { User, AuthenticationMeta } from './src/database/models/index.js';

async function deleteIncompleteRegistrations() {
  const emailsToDelete = [
    'yaswanth.akhil65@gmail.com',
    'yaswanth.22bce9763@vitapstudent.ac.in',
    'test1771998718433@example.com',
    'test1771997783274@example.com',
  ];

  console.log('═'.repeat(80));
  console.log('DELETE INCOMPLETE REGISTRATIONS');
  console.log('═'.repeat(80));

  const t = await sequelize.transaction();

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Find users
    const usersToDelete = await User.findAll({
      where: { email: emailsToDelete },
      include: [{ model: AuthenticationMeta, as: 'authMeta' }],
      transaction: t,
    });

    console.log(`Found ${usersToDelete.length} users to delete:\n`);

    for (const user of usersToDelete) {
      console.log(`  ✓ ${user.email}`);
      console.log(`    - User ID: ${user.id}`);
      console.log(`    - Status: Step ${user.authMeta?.registration_step || 'unknown'}`);
      console.log(`    - Active: ${user.is_active}`);
    }

    // Delete users (cascade will delete AuthenticationMeta)
    const deletedCount = await User.destroy({
      where: { email: emailsToDelete },
      transaction: t,
      force: true, // For paranoid tables if they're paranoid
    });

    await t.commit();

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`✅ Successfully deleted ${deletedCount} user(s) and their related records`);
    console.log(`${'─'.repeat(80)}`);

    // Verify deletion
    const remaining = await User.count({
      where: { email: emailsToDelete },
    });

    if (remaining === 0) {
      console.log('\n✅ Verification complete: All 4 incomplete registrations deleted\n');
    } else {
      console.log(`\n⚠️ ${remaining} user(s) still in database\n`);
    }

  } catch (error) {
    await t.rollback();
    console.error('❌ Deletion Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

deleteIncompleteRegistrations();
