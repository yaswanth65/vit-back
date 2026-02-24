import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class Manuscript extends Model { }

Manuscript.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // ==================== CORE RELATION ====================
    author_id: {
      type: DataTypes.UUID,
      allowNull: false, // Strictly required as per workflow
      references: {
        model: 'authors', // Matches tableName in Author model
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Permanent link to the primary content creator',
    },

    reviewer_ids: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Array of Reviewer IDs assigned to this manuscript',
    },


    // ==================== IDENTITY & STATUS ====================

    category: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Medical specialty, e.g., Oncology, Cardiology',
    },
    manuscript_type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'eg. Original research article', //medicine, oncology, neurology, surgery, genetics, cardiology
    },

    status: {
      type: DataTypes.ENUM(
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
      allowNull: false,
      comment: 'Tracks the pipeline stage',
    },

    // ==================== METADATA ====================
    title: {
      type: DataTypes.STRING,
      allowNull: false, // Required before final submit
      defaultValue: 'Untitled Manuscript',
    },

    abstract: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    keywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },

    // =======================AUTHORS=====================
    authors: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // ==================== FILE MANAGEMENT ====================
    // Main Manuscript (DOCX)
    main_file: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isDocx(value) {
          if (
            value &&
            value.mimetype !==
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ) {
            throw new Error(
              'Only DOCX files are allowed for the main manuscript submission.'
            );
          }
        },
      },
      comment: 'Restricted to DOCX for AI parsing',
    },

    // Cover Letter
    cover_letter: {
      type: DataTypes.JSONB,
      allowNull: true, // Nullable initially (draft), required at validation step
      comment: '{ url: "s3://...", textContent: "Dear Editor..." }',
    },

    // Supplementary Files
    supplementary_files: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment:
        'Array of objects: [{ url: "...", type: "Image/PDF", description: "Figure 1" }]',
    },

    // ==================== COMPLIANCE & ETHICS ====================
    declarations: {
      type: DataTypes.JSONB,
      defaultValue: {
        hasEthicsApproval: false,
        hasConflictOfInterest: false,
        isOriginalWork: false,
        fundingSource: null,
      },
    },

    // ==================== VERSIONING ====================
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Increments on every revision upload (v1.0 → v1.1)',
    },
    
    // ==================== EIC DECISION FIELDS ====================
    eic_decision: {
      type: DataTypes.ENUM('Accept', 'Minor Revision', 'Major Revision', 'Reject', 'Pending'),
      defaultValue: 'Pending',
      allowNull: false,
      comment: 'Final decision by Editor-in-Chief',
    },

    eic_decision_note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Note to author about the decision',
    },

    eic_internal_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes from EIC for editors',
    },

    eic_decision_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When EIC made the decision',
    },

    visible_comments_to_author: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Array of review comment IDs to show to author during revision',
    },

    max_reviewer_limit: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      allowNull: false,
      comment: 'Maximum number of reviewers that can be assigned',
    },

    editor_final_decision: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Stores editor final decision: { decision: "", letter: "", internal_notes: "" }',
    },

    editor_submitted_to_eic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Flag indicating editor has submitted to EIC',
    },
  },
  {
    sequelize,
    modelName: 'Manuscript',
    tableName: 'manuscripts',
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['readable_id'] },
      { fields: ['author_id'] }, // useful for joins
    ],
  }
);

export default Manuscript;