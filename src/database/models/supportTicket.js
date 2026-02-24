import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class SupportTicket extends Model {}

SupportTicket.init(
  {
    // ==================== PRIMARY KEY ====================
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Unique identifier for the support ticket',
    },

    // ==================== RELATIONS ====================

    // Reviewer who raised the ticket
    reviewer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'reviewers',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Reviewer who created the ticket',
    },

    // Admin assigned to resolve the ticket
    admin_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'admins',
        key: 'user_id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Admin assigned to resolve the ticket',
    },

    // Related manuscript
    manuscript_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'manuscripts',
        key: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Related manuscript reference',
    },

    // ==================== TICKET DETAILS ====================

    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Category of support ticket (Technical, Review Issue, File Issue, etc)',
    },

    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Short title/subject of the issue',
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Detailed description of the issue',
    },

    // ==================== ATTACHMENT ====================

    attachment: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: '{ url, mimetype, filename, size }',
      validate: {
        isPdf(value) {
          if (value && value.mimetype !== 'application/pdf') {
            throw new Error('Only PDF attachments are allowed.');
          }
        },
      },
    },

    // ==================== STATUS ====================

    status: {
      type: DataTypes.ENUM(
        'open',
        'in_progress',
        'closed'
      ),
      allowNull: false,
      defaultValue: 'open',
      comment: 'Current state of the support ticket',
    },

    // ==================== ADMIN RESPONSE ====================

    admin_response: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Resolution or response provided by admin',
    },

    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when ticket was resolved',
    },
  },
  {
    sequelize,
    modelName: 'SupportTicket',
    tableName: 'support_tickets',
    timestamps: true,

    indexes: [
      {
        fields: ['reviewer_id'],
        name: 'idx_support_ticket_reviewer',
      },
      {
        fields: ['admin_id'],
        name: 'idx_support_ticket_admin',
      },
      {
        fields: ['manuscript_id'],
        name: 'idx_support_ticket_manuscript',
      },
      {
        fields: ['status'],
        name: 'idx_support_ticket_status',
      },
      {
        fields: ['created_at'],
        name: 'idx_support_ticket_created_at',
      },
    ],
  }
);

export default SupportTicket;