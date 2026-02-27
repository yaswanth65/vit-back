/**
 * VITUOR Authentication Module
 * User Model - Common User Schema (Identity + Role Only)
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class User extends Model {
  /**
   * Check if the user is an Author (uses ORCID)
   */
  isAuthor() {
    return this.role === 'Author';
  }

  /**
   * Check if the user can invite others
   */
  canInvite() {
    return ['Editor', 'EditorInChief', 'Admin'].includes(this.role);
  }

  /**
   * Get safe user object (without sensitive data)
   * (now only strips fields that still exist on User)
   */
  toSafeObject() {
    const { ...safeUser } = this.toJSON();
    return safeUser;
  }
}

User.init(
  {
    // ==================== PRIMARY KEY ====================
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // ==================== IDENTITY (CORE USER FIELDS) ====================
    prefix: {
      type: DataTypes.ENUM('Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mx.'),
      allowNull: true,
      comment: 'Honorifics commonly used in academic publishing',
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'User',
      validate: {
        len: [0, 100],
      },
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'Profile',
      validate: {
        len: [0, 100],
      },
    },

    // ==================== CONTACT ====================
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue('email', value.toLowerCase().trim());
      },
    },

    // ==================== ROLE MANAGEMENT ====================
    role: {
      type: DataTypes.ENUM(
        'Author',
        'Reviewer',
        'Editor',
        'EditorInChief',
        'Admin'
      ),
      allowNull: false,
      comment: 'Defines the primary permission level',
    },
    // ==================== BASIC PROFILE ====================
    profile_image: {
      type: DataTypes.JSON, // Stores the whole object: { key, url, mimetype, size }
      allowNull: true,
    },
    specialties: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'Academic specialties/research areas',
    },

    
    // ==================== ACCOUNT STATUS (NON-AUTH) ====================
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether the account is active (false = suspended/deleted)',
    },
    deactivated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deactivated_reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    paranoid: false, // We use isActive for soft delete
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['orcid_id'], unique: true },
      { fields: ['role'] },
      { fields: ['is_active'] },
      { fields: ['created_at'] },
    ],
    hooks: {
      beforeCreate: (user) => {
        if (user.email) {
          user.email = user.email.toLowerCase().trim();
        }
      },
      beforeUpdate: (user) => {
        if (user.changed('email')) {
          user.email = user.email.toLowerCase().trim();
        }
      },
    },
  }
);

export default User;
