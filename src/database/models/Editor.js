import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class Editor extends Model {}

Editor.init(
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

    // ==================== DOMAIN RESPONSIBILITY ====================
    // Only one editor per category (your stated business rule)
    assigned_category: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment:
        'The specific medical specialty this editor manages (e.g., Oncology)',
    },

    primary_specialty: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Main academic or medical field',
    },
    additional_specialties: {
      type: DataTypes.ARRAY(DataTypes.STRING),

      defaultValue: [],
      comment: 'List of secondary areas of expertise',
    },
    // ==================== DASHBOARD CONFIGURATION ====================
    // Persisted view settings for the Pipeline Management screen
    kanban_preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        showStagnationAlerts: true, // Highlight cards > 14 days
        defaultSort: 'submissionDate',
      },
      comment: 'UI/UX preferences for editor workflow dashboard',
    },

    // ==================== PERFORMANCE METRICS ====================
    // Real-time pipeline health indicators (cached)
    metrics: {
      type: DataTypes.JSONB,
      defaultValue: {
        activeManuscripts: 0,
        avgTimeToDecision: 0, // In days
        totalDecisionsMade: 0,
      },
      comment: 'Operational performance metrics for this editor',
    },
  },
  {
    sequelize,
    modelName: 'Editor',
    tableName: 'editors',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id'],
        unique: true,
        name: 'idx_editor_user_id',
      },
      {
        fields: ['assigned_category'],
        unique: true,
        name: 'idx_editor_assigned_category',
      },
    ],
  }
);

export default Editor;
