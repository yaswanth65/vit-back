import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class EditorInChief extends Model {}

EditorInChief.init(
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

    // ==================== JURISDICTION ====================
    // Scope of editorial authority
    journal_scope: {
      type: DataTypes.STRING,
      defaultValue: 'Global',
      allowNull: false,
      comment:
        'Defines whether the EIC oversees specific sections or the entire journal',
    },

    // ==================== AUTHORITY & PERMISSIONS ====================
    // Granular permissions stored as JSONB for flexibility
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {
        canOverrideDecisions: true, // Final authority on publication decisions
        canBypassPeerReview: false, // Emergency override
        viewAuditLogs: true,        // Access to system-wide audit logs
      },
      comment: 'Editorial authority and override capabilities',
    },

    // ==================== DIGITAL SIGNATURE ====================
    digital_signature_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        'URL of the EIC’s digital signature used on publication certificates',
    },
  },
  {
    sequelize,
    modelName: 'EditorInChief',
    tableName: 'eics',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id'],
        unique: true,
        name: 'idx_eic_user_id',
      },
    ],
  }
);

export default EditorInChief;