// models/Issue.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class Issue extends Model { }

Issue.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    manuscripts_ids: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
      comment: 'Array of manuscript IDs assigned to this issue',
    },

    // ==================== IDENTIFICATION & HIERARCHY ====================
    volume_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment:
        'The year-based volume, e.g., Volume 12 (2026)',
    },

    issue_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Bimonthly issue number (1-6)',
    },

    planned_publication_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    issue_title: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        'Optional special theme title, e.g., "Nanoparticle Breakthroughs"',
    },

    description: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // ==================== VISUAL BRANDING ====================
    cover_image_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        'URL to the AI-generated or uploaded cover image',
    },

    // ==================== STATUS & PUBLICATION ====================
    status: {
      type: DataTypes.ENUM('Draft', 'Scheduled', 'Published'),
      defaultValue: 'Draft',
      allowNull: false,
      comment: 'Current lifecycle state of the issue',
    },

    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when issue becomes live on public frontend',
    },

    // ==================== GLOBAL METADATA ====================
    doi: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      comment: 'Digital Object Identifier for the entire issue',
    },

    final_files_received: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    copyright_agreement_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    metadata_validated: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
  },
  {
    sequelize,
    modelName: 'Issue',
    tableName: 'issues',
    timestamps: true,
    indexes: [
      {
        fields: ['volume_number', 'issue_number'],
        unique: true,
        name: 'idx_issue_volume_issue_unique',
      },
      {
        fields: ['status'],
        name: 'idx_issue_status',
      },
      {
        fields: ['published_at'],
        name: 'idx_issue_published_at',
      },
    ],
  }
);

export default Issue;