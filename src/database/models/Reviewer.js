import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class Reviewer extends Model { }

Reviewer.init(
  {
    // ==================== CORE LINK TO USER (1-1) ====================
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'One-to-one link to base User record',
    },

    // ==================== EXPERTISE & MATCHING ====================
    // Used by AI matching to recommend reviewers to editors

    professional_bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment:
        'Professional biography of the author (education, experience, achievements)',
    },

    expertise_areas: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'Tags representing specific research fields (e.g. ["Immunology", "CRISPR"])',
    },

    specialties: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'e.g. ["Oncology", "Pediatrics"]',
    },

    preferred_journals: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'List of journals the reviewer prefers to work with',
    },

    // NEW: Language Proficiency
    languages: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: ['English'],
      comment: 'Languages the reviewer can fluently review in',
    },

    max_current_reviews: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: 'Maximum number of active reviews allowed at once',
    },

    assigned_category: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment:
        'The specific medical specialty this editor manages (e.g., Oncology)',
    },

    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Contact phone number (E.164 format recommended)',
    },

    // ==================== AVAILABILITY MANAGEMENT ====================
    availability_status: {
      type: DataTypes.ENUM('Available', 'Busy', 'Unavailable'),
      defaultValue: 'Available',
      allowNull: false,
      comment: 'Current availability for review invitations',
    },

    institution: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Academic affiliation (e.g., AIIMS, Mayo Clinic)',
    },

    department: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Department within the institution',
    },

    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Country of affiliation',
    },

    // ==================== PERFORMANCE SCORECARD ====================
    metrics: {
      type: DataTypes.JSONB,
      defaultValue: {
        totalCompletedReviews: 0,
        avgTurnaroundTime: 0.0,
        onTimeRate: 100.0,
        editorRating: 0.0,
      },
      comment:
        'Operational performance metrics used by editors before inviting',
    },
  },
  {
    sequelize,
    modelName: 'Reviewer',
    tableName: 'reviewers',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id'],
        unique: true,
        name: 'idx_reviewer_user_id',
      },
      {
        fields: ['availability_status'],
        name: 'idx_reviewer_availability',
      },
    ],
  }
);

export default Reviewer;
