require('dotenv').config();

const baseDefine = {
  underscored: true,
  underscoredAll: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const config = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vituor_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    define: baseDefine,
    dialectOptions: {
      ssl:
        process.env.DB_SSL === 'true'
          ? { require: true, rejectUnauthorized: false }
          : false,
    },
    logging: console.log,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    define : baseDefine,
    dialectOptions: {
      ssl:
        process.env.DB_SSL === 'true'
          ? { require: true, rejectUnauthorized: false }
          : false,
    },
    logging: false,
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vituor_test_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    define: baseDefine,
    logging: false,
  },
};

module.exports = config;
