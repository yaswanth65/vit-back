// models/review.model.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class Review extends Model { }

Review.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    assign_reviewer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'assign_reviewers', key: 'assign_reviewer_id' },
      onDelete: 'CASCADE',
    },
    // ==================== SCORING RUBRIC ====================
    originality_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    methodology_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    significance_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    clarity_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    language_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },

    // ==================== COMMENTS ====================
    comments_to_author: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Sanitized, constructive feedback for the Author',
    },

    confidential_comments_to_editor: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Private notes for the Editor and EIC',
    },

    // ==================== STATUS & DECISION ====================
    recommendation: {
      type: DataTypes.ENUM(
        'Accept',
        'Minor Revision',
        'Major Revision',
        'Reject'
      ),
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM('Draft', 'Submitted'),
      defaultValue: 'Draft',
      allowNull: false,
    },

    // ==================== ANNOTATIONS ====================
    annotations: {
      type: DataTypes.JSONB,
      defaultValue: [],
      comment: 'Array of { page_no: x, line_no: y, comment: "text"}',
    },

    // ==================== RELATIONS ====================
    manuscript_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'manuscripts', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    reviewer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'reviewers', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    is_visible_to_author: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this review is visible to author (controlled by EIC)',
    },
  },
  {
    sequelize,
    modelName: 'Review',
    tableName: 'reviews',
    timestamps: true,
    indexes: [
      { fields: ['manuscript_id'] },
      { fields: ['reviewer_id'] },
      {
        fields: ['manuscript_id', 'reviewer_id'],
        unique: true,
        name: 'idx_review_unique_reviewer_per_manuscript',
      },
    ],
  }
);

export default Review;