/**
 * VITUOR Registration Deep Analysis Script
 * Analyzes all registration-related data in the database
 */

import sequelize from './src/config/database.js';
import { User, AuthenticationMeta, Author } from './src/database/models/index.js';
import { Op } from 'sequelize';

async function analyzeRegistration() {
  console.log('═'.repeat(80));
  console.log('VITUOR REGISTRATION DEEP ANALYSIS');
  console.log('═'.repeat(80));
  console.log(`Analysis Date: ${new Date().toISOString()}\n`);

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // ========================================
    // SECTION 1: USER TABLE OVERVIEW
    // ========================================
    console.log('┌' + '─'.repeat(78) + '┐');
    console.log('│ SECTION 1: USER TABLE OVERVIEW'.padEnd(78) + '│');
    console.log('└' + '─'.repeat(78) + '┘\n');

    const allUsers = await User.findAll({
      order: [['created_at', 'DESC']],
      raw: true,
    });

    console.log(`Total Users in Database: ${allUsers.length}\n`);

    // Group by role
    const roleGroups = {};
    allUsers.forEach(u => {
      roleGroups[u.role] = (roleGroups[u.role] || 0) + 1;
    });
    console.log('Users by Role:');
    Object.entries(roleGroups).forEach(([role, count]) => {
      console.log(`  - ${role}: ${count}`);
    });

    // Group by is_active
    const activeCount = allUsers.filter(u => u.is_active).length;
    const inactiveCount = allUsers.filter(u => !u.is_active).length;
    console.log(`\nUser Activity Status:`);
    console.log(`  - Active: ${activeCount}`);
    console.log(`  - Inactive: ${inactiveCount}`);

    // Check for placeholder names
    const placeholderNames = allUsers.filter(
      u => (u.first_name === 'User' && u.last_name === 'Profile') || 
           !u.first_name || !u.last_name
    );
    console.log(`\nUsers with Placeholder/Missing Names: ${placeholderNames.length}`);
    if (placeholderNames.length > 0) {
      placeholderNames.forEach(u => {
        console.log(`  - [${u.id.substring(0, 8)}...] ${u.email} | Name: "${u.first_name} ${u.last_name}" | Active: ${u.is_active}`);
      });
    }

    // ========================================
    // SECTION 2: AUTHENTICATION META ANALYSIS
    // ========================================
    console.log('\n┌' + '─'.repeat(78) + '┐');
    console.log('│ SECTION 2: AUTHENTICATION META ANALYSIS'.padEnd(78) + '│');
    console.log('└' + '─'.repeat(78) + '┘\n');

    const allAuthMeta = await AuthenticationMeta.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_active', 'role', 'first_name', 'last_name'] }],
      raw: true,
      nest: true,
    });

    console.log(`Total AuthenticationMeta Records: ${allAuthMeta.length}\n`);

    // Group by registration_step
    const stepGroups = {};
    allAuthMeta.forEach(a => {
      const step = a.registration_step || 'null';
      stepGroups[step] = (stepGroups[step] || 0) + 1;
    });
    console.log('Registration Step Distribution:');
    Object.entries(stepGroups).forEach(([step, count]) => {
      let desc = '';
      switch(step) {
        case '1': desc = '(Initial - needs password)'; break;
        case '2': desc = '(Awaiting OTP verification)'; break;
        case '3': desc = '(OTP verified - needs profile)'; break;
        case 'completed': desc = '(Fully registered)'; break;
        case 'null': desc = '(No step set - possible issue)'; break;
      }
      console.log(`  - Step ${step}: ${count} ${desc}`);
    });

    // Group by is_registration_verified
    const verifiedCount = allAuthMeta.filter(a => a.is_registration_verified).length;
    const unverifiedCount = allAuthMeta.filter(a => !a.is_registration_verified).length;
    console.log(`\nOTP Verification Status:`);
    console.log(`  - Verified: ${verifiedCount}`);
    console.log(`  - Unverified: ${unverifiedCount}`);

    // Check for active OTPs
    const activeOTPs = allAuthMeta.filter(
      a => a.registration_otp && 
           a.registration_otp_expires_at && 
           new Date(a.registration_otp_expires_at) > new Date()
    );
    const expiredOTPs = allAuthMeta.filter(
      a => a.registration_otp && 
           a.registration_otp_expires_at && 
           new Date(a.registration_otp_expires_at) <= new Date()
    );
    console.log(`\nOTP Status:`);
    console.log(`  - Active OTPs (not expired): ${activeOTPs.length}`);
    console.log(`  - Expired OTPs (still in DB): ${expiredOTPs.length}`);

    // ========================================
    // SECTION 3: INCOMPLETE REGISTRATIONS
    // ========================================
    console.log('\n┌' + '─'.repeat(78) + '┐');
    console.log('│ SECTION 3: INCOMPLETE REGISTRATIONS (POTENTIAL ISSUES)'.padEnd(78) + '│');
    console.log('└' + '─'.repeat(78) + '┘\n');

    // Users stuck at step 2 (awaiting OTP)
    const stuckAtStep2 = allAuthMeta.filter(a => a.registration_step === '2');
    console.log(`Users Stuck at Step 2 (Awaiting OTP): ${stuckAtStep2.length}`);
    if (stuckAtStep2.length > 0) {
      stuckAtStep2.forEach(a => {
        const otpStatus = a.registration_otp ? 
          (new Date(a.registration_otp_expires_at) > new Date() ? 'OTP Active' : 'OTP Expired') : 
          'No OTP';
        console.log(`  - [${a.user_id.substring(0, 8)}...] ${a.user.email} | ${otpStatus} | Created: ${new Date(a.created_at).toLocaleDateString()}`);
      });
    }

    // Users stuck at step 3 (OTP verified but profile not completed)
    const stuckAtStep3 = allAuthMeta.filter(a => a.registration_step === '3');
    console.log(`\nUsers Stuck at Step 3 (Profile not completed): ${stuckAtStep3.length}`);
    if (stuckAtStep3.length > 0) {
      stuckAtStep3.forEach(a => {
        console.log(`  - [${a.user_id.substring(0, 8)}...] ${a.user.email} | Verified: ${a.is_registration_verified} | Created: ${new Date(a.created_at).toLocaleDateString()}`);
      });
    }

    // Inactive Authors (registration not completed)
    const inactiveAuthors = allUsers.filter(u => u.role === 'Author' && !u.is_active);
    console.log(`\nInactive Authors (is_active=false): ${inactiveAuthors.length}`);
    if (inactiveAuthors.length > 0) {
      for (const author of inactiveAuthors) {
        const authMeta = allAuthMeta.find(a => a.user_id === author.id);
        console.log(`  - [${author.id.substring(0, 8)}...] ${author.email} | Step: ${authMeta?.registration_step || 'N/A'} | Name: "${author.first_name} ${author.last_name}"`);
      }
    }

    // ========================================
    // SECTION 4: ORPHANED / INCONSISTENT RECORDS
    // ========================================
    console.log('\n┌' + '─'.repeat(78) + '┐');
    console.log('│ SECTION 4: ORPHANED / INCONSISTENT RECORDS'.padEnd(78) + '│');
    console.log('└' + '─'.repeat(78) + '┘\n');

    // Users without AuthenticationMeta
    const userIds = allUsers.map(u => u.id);
    const authMetaUserIds = allAuthMeta.map(a => a.user_id);
    const usersWithoutAuth = userIds.filter(id => !authMetaUserIds.includes(id));
    console.log(`Users WITHOUT AuthenticationMeta: ${usersWithoutAuth.length}`);
    if (usersWithoutAuth.length > 0) {
      usersWithoutAuth.forEach(id => {
        const user = allUsers.find(u => u.id === id);
        console.log(`  - [${id.substring(0, 8)}...] ${user?.email} | Role: ${user?.role}`);
      });
    }

    // AuthenticationMeta without Users (orphaned)
    const orphanedAuth = authMetaUserIds.filter(id => !userIds.includes(id));
    console.log(`\nOrphaned AuthenticationMeta (no User): ${orphanedAuth.length}`);

    // Authors (role-based profiles)
    const allAuthors = await Author.findAll({ raw: true });
    console.log(`\nAuthor Profile Records: ${allAuthors.length}`);
    
    // Users with role=Author but no Author profile
    const authorUsers = allUsers.filter(u => u.role === 'Author');
    const authorProfileUserIds = allAuthors.map(a => a.user_id);
    const authorsWithoutProfile = authorUsers.filter(u => !authorProfileUserIds.includes(u.id));
    console.log(`Author Users WITHOUT Author Profile: ${authorsWithoutProfile.length}`);
    if (authorsWithoutProfile.length > 0) {
      authorsWithoutProfile.forEach(u => {
        console.log(`  - [${u.id.substring(0, 8)}...] ${u.email} | Active: ${u.is_active}`);
      });
    }

    // ========================================
    // SECTION 5: COMPLETED REGISTRATIONS AUDIT
    // ========================================
    console.log('\n┌' + '─'.repeat(78) + '┐');
    console.log('│ SECTION 5: COMPLETED REGISTRATIONS AUDIT'.padEnd(78) + '│');
    console.log('└' + '─'.repeat(78) + '┘\n');

    const completedRegs = allAuthMeta.filter(a => a.registration_step === 'completed');
    console.log(`Completed Registrations: ${completedRegs.length}`);

    // Verify they have all required data
    let issuesFound = 0;
    for (const auth of completedRegs) {
      const issues = [];
      
      // Check user is active
      if (!auth.user.is_active) issues.push('User not active');
      
      // Check has proper name
      if (auth.user.first_name === 'User' || auth.user.last_name === 'Profile') {
        issues.push('Has placeholder name');
      }
      
      // Check has Author profile (if Author role)
      if (auth.user.role === 'Author') {
        const hasProfile = authorProfileUserIds.includes(auth.user_id);
        if (!hasProfile) issues.push('Missing Author profile');
      }
      
      // Check is_registration_verified
      if (!auth.is_registration_verified) issues.push('Not verified');
      
      if (issues.length > 0) {
        issuesFound++;
        console.log(`  ⚠️ [${auth.user_id.substring(0, 8)}...] ${auth.user.email}`);
        issues.forEach(i => console.log(`      - ${i}`));
      }
    }
    
    if (issuesFound === 0) {
      console.log('  ✅ All completed registrations have valid data');
    } else {
      console.log(`\n  ⚠️ Found ${issuesFound} completed registrations with issues`);
    }

    // ========================================
    // SECTION 6: DETAILED USER DUMP (RECENT 20)
    // ========================================
    console.log('\n┌' + '─'.repeat(78) + '┐');
    console.log('│ SECTION 6: RECENT USERS DETAILED VIEW (Last 20)'.padEnd(78) + '│');
    console.log('└' + '─'.repeat(78) + '┘\n');

    const recentUsers = await User.findAll({
      limit: 20,
      order: [['created_at', 'DESC']],
      include: [
        { model: AuthenticationMeta, as: 'authMeta' },
        { model: Author, as: 'authorProfile', required: false },
      ],
    });

    console.log('ID (short) | Email | Role | Active | Step | Verified | Has Author | Created');
    console.log('─'.repeat(120));

    for (const user of recentUsers) {
      const authMeta = user.authMeta;
      const author = user.authorProfile;
      
      const idShort = user.id.substring(0, 8);
      const email = user.email.padEnd(35);
      const role = user.role.padEnd(12);
      const active = user.is_active ? 'Yes' : 'No ';
      const step = (authMeta?.registration_step || 'N/A').padEnd(9);
      const verified = authMeta?.is_registration_verified ? 'Yes' : 'No ';
      const hasAuthor = author ? 'Yes' : 'No ';
      const created = new Date(user.created_at).toLocaleDateString();
      
      console.log(`${idShort}... | ${email} | ${role} | ${active}    | ${step} | ${verified}      | ${hasAuthor}        | ${created}`);
    }

    // ========================================
    // SECTION 7: REGISTRATION FLOW VALIDATION
    // ========================================
    console.log('\n┌' + '─'.repeat(78) + '┐');
    console.log('│ SECTION 7: REGISTRATION FLOW STATE MACHINE VALIDATION'.padEnd(78) + '│');
    console.log('└' + '─'.repeat(78) + '┘\n');

    console.log('Expected Flow:');
    console.log('  Step 1: User created (is_active=false, first_name="User", last_name="Profile")');
    console.log('         AuthMeta created (registration_step="2", is_registration_verified=false, OTP sent)');
    console.log('  Step 2: OTP verified → registration_step="3", is_registration_verified=true');
    console.log('  Step 3: Profile completed → registration_step="completed", is_active=true, Author created');
    console.log('');

    // Validate each state
    let stateIssues = [];

    // Check all step 2 users are inactive and unverified
    for (const auth of allAuthMeta.filter(a => a.registration_step === '2')) {
      if (auth.user.is_active) {
        stateIssues.push(`Step 2 user ${auth.user.email} is active (should be inactive)`);
      }
      if (auth.is_registration_verified) {
        stateIssues.push(`Step 2 user ${auth.user.email} is verified (should be unverified)`);
      }
    }

    // Check all step 3 users are verified but inactive
    for (const auth of allAuthMeta.filter(a => a.registration_step === '3')) {
      if (!auth.is_registration_verified) {
        stateIssues.push(`Step 3 user ${auth.user.email} is unverified (should be verified)`);
      }
      if (auth.user.is_active) {
        stateIssues.push(`Step 3 user ${auth.user.email} is active (should be inactive until profile complete)`);
      }
    }

    // Check all completed users are active and verified
    for (const auth of allAuthMeta.filter(a => a.registration_step === 'completed')) {
      if (!auth.is_registration_verified) {
        stateIssues.push(`Completed user ${auth.user.email} is unverified`);
      }
      if (!auth.user.is_active && auth.user.role === 'Author') {
        stateIssues.push(`Completed author ${auth.user.email} is inactive`);
      }
    }

    if (stateIssues.length === 0) {
      console.log('✅ All registration states are consistent');
    } else {
      console.log(`⚠️ Found ${stateIssues.length} state inconsistencies:`);
      stateIssues.forEach(issue => console.log(`  - ${issue}`));
    }

    // ========================================
    // SECTION 8: RAW DATA SAMPLE
    // ========================================
    console.log('\n┌' + '─'.repeat(78) + '┐');
    console.log('│ SECTION 8: RAW DATA SAMPLE (First incomplete registration)'.padEnd(78) + '│');
    console.log('└' + '─'.repeat(78) + '┘\n');

    const incompleteReg = allAuthMeta.find(a => a.registration_step !== 'completed' && a.registration_step !== null);
    if (incompleteReg) {
      console.log('USER:');
      console.log(JSON.stringify(incompleteReg.user, null, 2));
      console.log('\nAUTHENTICATION META:');
      const authCopy = { ...incompleteReg };
      delete authCopy.user;
      // Hide sensitive data
      if (authCopy.password_hash) authCopy.password_hash = '[HIDDEN]';
      if (authCopy.registration_otp) authCopy.registration_otp = '[HIDDEN]';
      console.log(JSON.stringify(authCopy, null, 2));
    } else {
      console.log('No incomplete registrations found to display.');
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '═'.repeat(80));
    console.log('ANALYSIS SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Users: ${allUsers.length}`);
    console.log(`Total AuthMeta: ${allAuthMeta.length}`);
    console.log(`Total Author Profiles: ${allAuthors.length}`);
    console.log(`Completed Registrations: ${completedRegs.length}`);
    console.log(`Incomplete Registrations: ${allAuthMeta.length - completedRegs.length}`);
    console.log(`  - At Step 2: ${stuckAtStep2.length}`);
    console.log(`  - At Step 3: ${stuckAtStep3.length}`);
    console.log(`Users without AuthMeta: ${usersWithoutAuth.length}`);
    console.log(`Authors without Profile: ${authorsWithoutProfile.length}`);
    console.log(`State Inconsistencies: ${stateIssues.length}`);
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('Analysis Error:', error);
  } finally {
    await sequelize.close();
  }
}

analyzeRegistration();
