'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. USERS TABLE
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      prefix: {
        type: Sequelize.ENUM('Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mx.'),
        allowNull: true,
      },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      role: {
        type: Sequelize.ENUM(
          'Author',
          'Reviewer',
          'Editor',
          'EditorInChief',
          'Admin'
        ),
        allowNull: false,
      },
      profile_image: { type: Sequelize.JSON, allowNull: true },
      specialties: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      deactivated_at: { type: Sequelize.DATE, allowNull: true },
      deactivated_reason: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 2. AUTHENTICATION META TABLE
    await queryInterface.createTable('authentication_meta', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      password_hash: { type: Sequelize.STRING(255), allowNull: true },
      last_login: { type: Sequelize.DATE, allowNull: true },
      is_email_verified: { type: Sequelize.BOOLEAN, defaultValue: false },
      email_verification_token: { type: Sequelize.STRING, allowNull: true },
      email_verification_token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      magic_link_token: { type: Sequelize.STRING, allowNull: true },
      magic_link_token_expires_at: { type: Sequelize.DATE, allowNull: true },
      magic_link_token_used: { type: Sequelize.BOOLEAN, defaultValue: false },
      registration_step: {
        type: Sequelize.ENUM('1', '2', '3', 'completed'),
        defaultValue: '1',
      },
      registration_otp: { type: Sequelize.STRING(6), allowNull: true },
      registration_otp_expires_at: { type: Sequelize.DATE, allowNull: true },
      is_registration_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      temp_academic_metrics: { type: Sequelize.JSONB, allowNull: true },
      invitation_token: { type: Sequelize.STRING, allowNull: true },
      invitation_token_expires_at: { type: Sequelize.DATE, allowNull: true },
      invited_by: {
        type: Sequelize.UUID,
        references: { model: 'users', key: 'id' },
        allowNull: true,
      },
      invited_at: { type: Sequelize.DATE, allowNull: true },
      password_reset_token: { type: Sequelize.STRING, allowNull: true },
      password_reset_token_expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      current_refresh_token: { type: Sequelize.TEXT, allowNull: true },
      refresh_token_expires_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 3. AUTHORS TABLE
    await queryInterface.createTable('authors', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
      },
      orcid_id: { type: Sequelize.STRING(50), allowNull: true },
      google_scholar_id: { type: Sequelize.STRING(100), allowNull: true },
      saml_student_id: { type: Sequelize.STRING(100), allowNull: true },
      institution: { type: Sequelize.STRING(255), allowNull: true },
      department: { type: Sequelize.STRING(255), allowNull: true },
      country: { type: Sequelize.STRING(100), allowNull: true },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      research_interests: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      total_publications: { type: Sequelize.INTEGER, defaultValue: 0 },
      acceptance_rate: { type: Sequelize.FLOAT, defaultValue: 0.0 },
      total_citations: { type: Sequelize.INTEGER, defaultValue: 0 },
      h_index: { type: Sequelize.INTEGER, defaultValue: 0 },
      billing_name: { type: Sequelize.STRING(255), allowNull: true },
      billing_address: { type: Sequelize.TEXT, allowNull: true },
      invoice_email: { type: Sequelize.STRING(255), allowNull: true },
      tax_id: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 4. REVIEWERS TABLE
    await queryInterface.createTable('reviewers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        // Map from reviewer_id in model for consistency
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      professional_bio: { type: Sequelize.TEXT, allowNull: true },
      expertise_areas: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      specialties: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      preferred_journals: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      languages: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: ['English'],
      },
      max_current_reviews: { type: Sequelize.INTEGER, defaultValue: 3 },
      assigned_category: { type: Sequelize.STRING, allowNull: false },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      availability_status: {
        type: Sequelize.ENUM('Available', 'Busy', 'Unavailable'),
        defaultValue: 'Available',
      },
      institution: { type: Sequelize.STRING(255), allowNull: true },
      department: { type: Sequelize.STRING(255), allowNull: true },
      country: { type: Sequelize.STRING(100), allowNull: true },
      metrics: { type: Sequelize.JSONB, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 5. EDITORS TABLE
    await queryInterface.createTable('editors', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
      },
      assigned_category: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      primary_specialty: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Main academic or medical field',
      },
      additional_specialties: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        comment: 'List of secondary areas of expertise',
      },
      kanban_preferences: { type: Sequelize.JSONB, defaultValue: {} },
      metrics: { type: Sequelize.JSONB, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 6. EICs TABLE
    await queryInterface.createTable('eics', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
      },
      journal_scope: { type: Sequelize.STRING, defaultValue: 'Global' },
      permissions: { type: Sequelize.JSONB, defaultValue: {} },
      digital_signature_url: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 7. ADMINS TABLE
    await queryInterface.createTable('admins', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
      },
      access_level: { type: Sequelize.JSONB, defaultValue: {} },
      last_system_config_change: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_manuscripts_status') THEN
          CREATE TYPE "public"."enum_manuscripts_status" AS ENUM('Draft', 'Submitted', 'Editor Review', 'Under Review', 'Revision Required', 'Accepted', 'Published', 'Rejected');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_manuscripts_eic_decision') THEN
          CREATE TYPE "public"."enum_manuscripts_eic_decision" AS ENUM('Accept', 'Minor Revision', 'Major Revision', 'Reject', 'Pending');
        END IF;
        
        -- Add any other ENUMs here (e.g., for User roles or Issue status)
      END $$;
    `);

    // 8. MANUSCRIPTS TABLE
    await queryInterface.createTable('manuscripts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      author_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'authors', key: 'id' },
      },
      reviewer_ids: { type: Sequelize.ARRAY(Sequelize.UUID), defaultValue: [] },
      category: { type: Sequelize.STRING, allowNull: false },
      manuscript_type: { type: Sequelize.STRING, allowNull: false },
      status: {
        type: Sequelize.ENUM(
          'Draft',
          'Submitted',
          'Editor Review',
          'Under Review',
          'Revision Required',
          'Accepted',
          'Published',
          'Rejected'
        ),
        defaultValue: 'Draft',
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Untitled Manuscript',
      },
      abstract: { type: Sequelize.TEXT, allowNull: true },
      keywords: { type: Sequelize.ARRAY(Sequelize.STRING), defaultValue: [] },
      authors: { type: Sequelize.JSONB, allowNull: true },
      main_file: { type: Sequelize.JSONB, allowNull: true },
      cover_letter: { type: Sequelize.JSONB, allowNull: true },
      supplementary_files: { type: Sequelize.JSONB, defaultValue: [] },
      declarations: { type: Sequelize.JSONB, defaultValue: {} },
      version: { type: Sequelize.INTEGER, defaultValue: 1 },
      eic_decision: {
        type: Sequelize.ENUM(
          'Accept',
          'Minor Revision',
          'Major Revision',
          'Reject',
          'Pending'
        ),
        defaultValue: 'Pending',
      },
      eic_decision_note: { type: Sequelize.TEXT, allowNull: true },
      eic_internal_notes: { type: Sequelize.TEXT, allowNull: true },
      eic_decision_date: { type: Sequelize.DATE, allowNull: true },
      visible_comments_to_author: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        defaultValue: [],
      },
      max_reviewer_limit: { type: Sequelize.INTEGER, defaultValue: 3 },
      editor_final_decision: { type: Sequelize.JSONB, allowNull: true },
      editor_submitted_to_eic: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 9. ASSIGN REVIEWERS TABLE
    await queryInterface.createTable('assign_reviewers', {
      assign_reviewer_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      manuscript_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'manuscripts', key: 'id' },
      },
      reviewer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'reviewers', key: 'id' },
      },
      assigned_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'editors', key: 'id' },
      },
      manuscript_version: { type: Sequelize.INTEGER, defaultValue: 1 },
      deadline: { type: Sequelize.DATE, allowNull: false },
      status: {
        type: Sequelize.ENUM(
          'assigned',
          'accepted',
          'rejected',
          'in_review',
          'completed'
        ),
        defaultValue: 'assigned',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 10. REVIEWS TABLE
    await queryInterface.createTable('reviews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      assign_reviewer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'assign_reviewers', key: 'assign_reviewer_id' },
      },
      manuscript_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'manuscripts', key: 'id' },
      },
      reviewer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'reviewers', key: 'id' },
      },
      originality_score: { type: Sequelize.INTEGER, allowNull: false },
      methodology_score: { type: Sequelize.INTEGER, allowNull: false },
      significance_score: { type: Sequelize.INTEGER, allowNull: false },
      clarity_score: { type: Sequelize.INTEGER, allowNull: false },
      language_score: { type: Sequelize.INTEGER, allowNull: false },
      comments_to_author: { type: Sequelize.TEXT, allowNull: false },
      confidential_comments_to_editor: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      recommendation: {
        type: Sequelize.ENUM(
          'Accept',
          'Minor Revision',
          'Major Revision',
          'Reject'
        ),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('Draft', 'Submitted'),
        defaultValue: 'Draft',
      },
      annotations: { type: Sequelize.JSONB, defaultValue: [] },
      is_visible_to_author: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 11. MANUSCRIPT VERSIONS TABLE
    await queryInterface.createTable('manuscript_versions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      manuscript_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'manuscripts', key: 'id' },
      },
      version_number: { type: Sequelize.FLOAT, defaultValue: 1.0 },
      main_file: { type: Sequelize.JSONB, allowNull: false },
      main_file_pdf: { type: Sequelize.JSONB, allowNull: true },
      supplementary_files: { type: Sequelize.JSONB, defaultValue: [] },
      author_response: { type: Sequelize.TEXT, allowNull: true },
      is_finalized: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 12. REVIEW COMMENTS TABLE
    await queryInterface.createTable('review_comments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      review_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'reviews', key: 'id' },
      },
      page_number: { type: Sequelize.INTEGER, allowNull: false },
      line_number: { type: Sequelize.INTEGER, allowNull: true },
      comment: { type: Sequelize.TEXT, allowNull: false },
      type: {
        type: Sequelize.ENUM('major', 'minor', 'suggestion'),
        defaultValue: 'minor',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 13. ISSUES TABLE
    await queryInterface.createTable('issues', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      manuscripts_ids: {
        type: Sequelize.ARRAY(Sequelize.UUID),
        defaultValue: [],
      },
      volume_number: { type: Sequelize.INTEGER, allowNull: false },
      issue_number: { type: Sequelize.INTEGER, allowNull: false },
      planned_publication_date: { type: Sequelize.DATE, allowNull: true },
      issue_title: { type: Sequelize.STRING, allowNull: true },
      description: { type: Sequelize.STRING, allowNull: true },
      cover_image_url: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM('Draft', 'Scheduled', 'Published'),
        defaultValue: 'Draft',
      },
      published_at: { type: Sequelize.DATE, allowNull: true },
      doi: { type: Sequelize.STRING, unique: true, allowNull: true },
      final_files_received: { type: Sequelize.BOOLEAN, allowNull: true },
      copyright_agreement_completed: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      metadata_validated: { type: Sequelize.BOOLEAN, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // 14. SUPPORT TICKETS TABLE
    await queryInterface.createTable('support_tickets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      reviewer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'reviewers', key: 'id' },
      },
      admin_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      }, // Linked to user record of admin
      manuscript_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'manuscripts', key: 'id' },
      },
      category: { type: Sequelize.STRING(100), allowNull: false },
      subject: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      attachment: { type: Sequelize.JSONB, allowNull: true },
      status: {
        type: Sequelize.ENUM('open', 'in_progress', 'closed'),
        defaultValue: 'open',
      },
      admin_response: { type: Sequelize.TEXT, allowNull: true },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop in REVERSE order to avoid constraint errors
    await queryInterface.dropTable('support_tickets');
    await queryInterface.dropTable('issues');
    await queryInterface.dropTable('review_comments');
    await queryInterface.dropTable('manuscript_versions');
    await queryInterface.dropTable('reviews');
    await queryInterface.dropTable('assign_reviewers');
    await queryInterface.dropTable('manuscripts');
    await queryInterface.dropTable('admins');
    await queryInterface.dropTable('eics');
    await queryInterface.dropTable('editors');
    await queryInterface.dropTable('reviewers');
    await queryInterface.dropTable('authors');
    await queryInterface.dropTable('authentication_meta');
    await queryInterface.dropTable('users');
  },
};
