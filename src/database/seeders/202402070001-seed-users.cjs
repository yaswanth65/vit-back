'use strict';
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    const categories = ['Medicine', 'Oncology', 'Neurology', 'Surgery', 'Genetics', 'Cardiology'];
    
    const users = [];
    const authMetas = [];
    const roleProfiles = {
      admins: [],
      eics: [],
      editors: [],
      reviewers: [],
      authors: []
    };

    const createUserEntry = (firstName, lastName, email, role, prefix = 'Dr.') => {
      const id = uuidv4();
      users.push({
        id,
        prefix,
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        role,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      authMetas.push({
        id: uuidv4(),
        user_id: id,
        password_hash: passwordHash,
        is_email_verified: true,
        registration_step: 'completed',
        is_registration_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      return id;
    };

    // 1. ADMIN
    const adminId = createUserEntry('Sarthak', 'Mhatre', 'sarthak.mhatre@datacircles.in', 'Admin', 'Mr.');
    roleProfiles.admins.push({
      id: uuidv4(), // <--- ADDED THIS
      user_id: adminId,
      access_level: JSON.stringify({ manageUsers: true, managePayments: true, manageCMS: true, viewSecurityLogs: true }),
      created_at: new Date(),
      updated_at: new Date()
    });

    // 2. EICs
    categories.forEach(cat => {
      const id = createUserEntry(`${cat}EIC`, 'Expert', `eic.${cat.toLowerCase()}@vituor.com`, 'EditorInChief');
      roleProfiles.eics.push({
        id: uuidv4(), // <--- ADDED THIS
        user_id: id,
        journal_scope: cat,
        permissions: JSON.stringify({ canOverrideDecisions: true, canBypassPeerReview: false, viewAuditLogs: true }),
        created_at: new Date(),
        updated_at: new Date()
      });
    });

    // 3. EDITORS
    categories.forEach(cat => {
      const id = createUserEntry(`${cat}Editor`, 'Specialist', `editor.${cat.toLowerCase()}@vituor.com`, 'Editor');
      roleProfiles.editors.push({
        id: uuidv4(), // <--- ADDED THIS
        user_id: id,
        assigned_category: cat,
        primary_specialty: cat,
        metrics: JSON.stringify({ activeManuscripts: 0, avgTimeToDecision: 0, totalDecisionsMade: 0 }),
        created_at: new Date(),
        updated_at: new Date()
      });
    });

    // 4. REVIEWERS
    for (let i = 1; i <= 20; i++) {
      const id = createUserEntry(`Reviewer`, `${i}`, `reviewer${i}@vituor.com`, 'Reviewer');
      roleProfiles.reviewers.push({
        id: uuidv4(), // <--- ADDED THIS (assuming Reviewer table has an 'id' or uses 'reviewer_id' as PK)
        user_id: id,
        expertise_areas: ['Clinical Trials', 'Peer Review'],
        availability_status: 'Available',
        assigned_category: `ReviewGroup-${i}`,
        max_current_reviews: 3,
        metrics: JSON.stringify({ totalCompletedReviews: 0, avgTurnaroundTime: 0.0, onTimeRate: 100.0, editorRating: 5.0 }),
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // 5. AUTHORS
    for (let i = 1; i <= 10; i++) {
      const id = createUserEntry(`Author`, `${i}`, `author${i}@vituor.com`, 'Author');
      roleProfiles.authors.push({
        id: uuidv4(), // <--- ADDED THIS
        user_id: id,
        orcid_id: `0000-000${i}-1234-567X`,
        institution: 'VITUOR Academic Institute',
        country: 'India',
        total_publications: 0,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // 6. CUSTOM TEST AUTHOR - Yaswanth
    const yaswanthId = createUserEntry('Yaswanth', 'Kancharla', 'yaswanth.kancharla65@gmail.com', 'Author', 'Mr.');
    roleProfiles.authors.push({
      id: uuidv4(),
      user_id: yaswanthId,
      orcid_id: '0000-0001-9999-999X',
      institution: 'VITUOR Research Lab',
      country: 'India',
      total_publications: 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    await queryInterface.bulkInsert('users', users);
    await queryInterface.bulkInsert('authentication_meta', authMetas);
    await queryInterface.bulkInsert('admins', roleProfiles.admins);
    await queryInterface.bulkInsert('eics', roleProfiles.eics);
    await queryInterface.bulkInsert('editors', roleProfiles.editors);
    await queryInterface.bulkInsert('reviewers', roleProfiles.reviewers);
    await queryInterface.bulkInsert('authors', roleProfiles.authors);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('authors', null, {});
    await queryInterface.bulkDelete('reviewers', null, {});
    await queryInterface.bulkDelete('editors', null, {});
    await queryInterface.bulkDelete('eics', null, {});
    await queryInterface.bulkDelete('admins', null, {});
    await queryInterface.bulkDelete('authentication_meta', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};