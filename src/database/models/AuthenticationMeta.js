import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class AuthenticationMeta extends Model {}

AuthenticationMeta.init(
  {
    // ==================== CORE LINK TO USER (1-1) ====================
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

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

    // ==================== PASSWORD ====================
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Bcrypt encrypted password (12 rounds)',
    },

    // ==================== SECURITY & LOGIN TRACKING ====================
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last successful login',
    },

    // ==================== EMAIL VERIFICATION ====================
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether email has been verified',
    },

    //this email verification token will be used when verifying reviewer accounts, invited via email

    email_verification_token: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Token for email verification',
    },

    email_verification_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // ==================== MAGIC LINK LOGIN ====================
    magic_link_token: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Short-lived token for passwordless login',
    },

    magic_link_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    magic_link_token_used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Ensures a magic link is single-use only',
    },

    // ==================== STEP-WISE REGISTRATION (NEW) ====================
    registration_step: {
      type: DataTypes.ENUM('1', '2', '3', 'completed'),
      defaultValue: '1',
      comment: 'Tracks the current step of the author registration process',
    },

    // Step 2: 6-Digit OTP
    registration_otp: {
      type: DataTypes.STRING(6),
      allowNull: true,
      comment: '6-digit numeric code for email verification',
    },

    registration_otp_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    is_registration_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True once the 6-digit OTP is verified',
    },

    // Step 3: Temporary Academic Data Storage
    // Since Step 0/1 scrapes data but Step 3 saves it to the Author model, 
    // we store it here temporarily to "pre-fill" the final step.
    temp_academic_metrics: {
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Stores { h_index, total_citations, total_publications } temporarily',
    },

        // ==================== INSTITUTIONAL SSO ====================
    // sso_provider: {
    //   type: DataTypes.STRING(100),
    //   allowNull: true,
    //   comment: 'Name of the SSO provider or Institution (e.g., Harvard, OpenAthens)',
    // },
    // sso_external_id: {
    //   type: DataTypes.STRING(255),
    //   allowNull: true,
    //   unique: true,
    //   comment: 'The unique persistent identifier (PUID) sent by the Institution',
    // },
    // sso_attributes: {
    //   type: DataTypes.JSONB,
    //   allowNull: true,
    //   comment: 'Raw attributes returned by SSO (department, titles, etc.)',
    // },
    
    // ==================== INVITATIONS ====================
    //For Reviewer
    invitation_token: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Token for accepting role-based invitations',
    },

    invitation_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    invited_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      comment: 'User ID of the person who sent the invitation',
    },

    invited_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the user was invited',
    },

    // ==================== PASSWORD RESET ====================
    password_reset_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    password_reset_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // ==================== SESSION MANAGEMENT ====================
    current_refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Hashed refresh token for session validation',
    },

    refresh_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration time for current refresh token',
    },
  },
  {
    sequelize,
    modelName: 'AuthenticationMeta',
    tableName: 'authentication_meta',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id'],
        unique: true,
        name: 'idx_auth_meta_user_id',
      },
      {
        fields: ['invitation_token'],
        name: 'idx_auth_meta_invitation_token',
      },
      {
        fields: ['password_reset_token'],
        name: 'idx_auth_meta_password_reset_token',
      },
      {
        fields: ['email_verification_token'],
        name: 'idx_auth_meta_email_verification_token',
      },
      {
        fields: ['magic_link_token'],
        name: 'idx_auth_meta_magic_link_token',
      },
    ],
  }
);

export default AuthenticationMeta;
