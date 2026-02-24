import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class Author extends Model {}

Author.init(
  {
    // Foreign Key to the Common User Table
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users', // Matches tableName in User.js
        key: 'id',
      },
    },

    // Oauth identifiers (stored here for author-specific queries)
    //For now author can have anyone, In future we can allow them to have more than one
    orcid_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'ORCID identifier from OAuth',
    },

    google_scholar_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Google Scholar profile ID',
    },

    saml_student_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Student ID obtained via SAML authentication',
    },

    institution: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Academic affiliation (e.g., AIIMS, Mayo Clinic)',
    },

    department: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Department within the institution',
    },

    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Country of affiliation',
    },

    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Contact phone number (E.164 format recommended)',
    },

    // 1. Professional Metadata [cite: 795, 796]
    research_interests: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Postgres supports Arrays natively
      allowNull: true,
      comment: 'e.g. ["Oncology", "Cardiology"]',
    },

    // // 3. Publication Preferences [cite: 1648]
    // default_license_type: {
    //   type: DataTypes.ENUM('CC-BY', 'CC-BY-NC', 'CC-BY-ND'),
    //   defaultValue: 'CC-BY',
    //   comment: 'Default Creative Commons license for their papers',
    // },

    // 4. Impact Stats (Cached for Dashboard) [cite: 1661, 1563]
    // We store these here to avoid expensive calculations on every page load
    total_publications: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    acceptance_rate: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      comment: 'Calculated percentage of accepted vs submitted',
    },
    total_citations: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    h_index: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // ... existing fields (user_id, orcid_id, etc.)

    // 5. Billing Information
    billing_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Legal name for billing/invoices',
    },

    billing_address: {
      type: DataTypes.TEXT, // Using TEXT to allow for multi-line formatting
      allowNull: true,
      comment: 'Full billing address (Street, City, Postcode, etc.)',
    },

    invoice_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true, // Sequelize built-in validation
      },
      comment: 'Recipient email specifically for invoices',
    },

    tax_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'TAX, VAT, or GST ID for the author or their institution',
    },

// ... rest of the model config
  },
  {
    sequelize,
    modelName: 'Author',
    tableName: 'authors',
    timestamps: true,
  }
);

export default Author;
