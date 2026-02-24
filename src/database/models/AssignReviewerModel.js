import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class AssignReviewer extends Model {}

AssignReviewer.init(
  {
    assign_reviewer_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // ================= RELATIONS =================
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

    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'editors', key: 'id' },
      comment: 'Editor who assigned reviewer',
    },

    // ================= VERSION =================
    manuscript_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    // ================= DEADLINE =================
    deadline: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    // ================= STATUS =================
    status: {
      type: DataTypes.ENUM(
        'assigned',
        'accepted',
        'rejected',
        'in_review',
        'completed'
      ),
      defaultValue: 'assigned',
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'AssignReviewer',
    tableName: 'assign_reviewers',
    timestamps: true,
    indexes: [
      { fields: ['manuscript_id'] },
      { fields: ['reviewer_id'] },
      { fields: ['status'] },
      {
        fields: ['manuscript_id', 'reviewer_id', 'manuscript_version'],
        unique: true,
        name: 'unique_assignment_per_version',
      },
    ],
  }
);

export default AssignReviewer;
