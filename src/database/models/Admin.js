import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class Admin extends Model {}

Admin.init(
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

    // ==================== ADMIN PERMISSIONS ====================
    // Functional permissions stored as JSONB for flexibility
    access_level: {
      type: DataTypes.JSONB,
      defaultValue: {
        manageUsers: true,      // Role & user management
        managePayments: true,   // Payment gateway configuration
        manageCMS: true,        // Static content management
        viewSecurityLogs: true, // System-wide audit log access
      },
      comment: 'Granular admin capabilities and system controls',
    },

    // ==================== ADMIN AUDIT TRAIL ====================
    last_system_config_change: {
      type: DataTypes.DATE,
      allowNull: true,
      comment:
        'Timestamp of the last time this admin modified global system settings',
    },
  },
  {
    sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id'],
        unique: true,
        name: 'idx_admin_user_id',
      },
    ],
  }
);

export default Admin;