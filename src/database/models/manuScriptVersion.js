// models/manuscriptVersion.model.js
import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/database.js';

class ManuscriptVersion extends Model {}

ManuscriptVersion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    manuscript_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { 
        model: 'manuscripts', 
        key: 'id' 
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Links this version to its parent manuscript',
    },

    version_number: {
      type: DataTypes.FLOAT, // e.g., 1.0, 1.1
      allowNull: false,
      defaultValue: 1.0,
    },

    // ==================== FILE SNAPSHOTS ====================
    main_file: { 
      type: DataTypes.JSONB, 
      allowNull: false,
      comment: 'Snapshot of main manuscript file for this version',
    },

    main_file_pdf: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Optional PDF-rendered version of manuscript',
    },

    supplementary_files: { 
      type: DataTypes.JSONB, 
      defaultValue: [],
      comment: 'Version-specific supplementary materials',
    },

    // ==================== AUTHOR RESPONSE ====================
    author_response: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      comment: 'Point-by-point response to previous reviews',
    },

    // ==================== VERSION STATUS ====================
    is_finalized: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: false,
      comment: 'Whether this version is locked/final',
    },
  },
  {
    sequelize,
    modelName: 'ManuscriptVersion',
    tableName: 'manuscript_versions',
    timestamps: true,
    indexes: [
      {
        fields: ['manuscript_id'],
        name: 'idx_manuscript_version_manuscript_id',
      },
      {
        fields: ['manuscript_id', 'version_number'],
        unique: true,
        name: 'idx_manuscript_version_unique',
      },
    ],
  }
);

export default ManuscriptVersion;