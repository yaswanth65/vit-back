import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class ReviewComment extends Model {}

ReviewComment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    review_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'reviews', key: 'id' },
      onDelete: 'CASCADE',
    },

    page_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    line_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    type: {
      type: DataTypes.ENUM('major', 'minor', 'suggestion'),
      defaultValue: 'minor',
    },
  },
  {
    sequelize,
    modelName: 'ReviewComment',
    tableName: 'review_comments',
    timestamps: true,
    indexes: [{ fields: ['review_id'] }, { fields: ['page_number'] }],
  }
);

export default ReviewComment;
