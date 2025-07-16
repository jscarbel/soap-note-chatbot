require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST ?? 'localhost',
      user: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'password',
      database: process.env.DATABASE_NAME ?? 'soape',
      port: process.env.DATABASE_PORT ? parseInt(process.env.DB_PORT) : 5432,
    },
    migrations: {
      directory: './db/migrations',
      tableName: 'knex_migrations',
    },
  },

  staging: {
    client: 'pg',
    connection: {
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT
        ? parseInt(process.env.DATABASE_PORT)
        : undefined,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations',
      extension: 'js',
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      database: process.env.DATABASE_NAME ?? 'soape',
      user: process.env.DATABASE_USER ?? 'username',
      password: process.env.DATABASE_PASSWORD ?? 'password',
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT
        ? parseInt(process.env.DATABASE_PORT)
        : undefined,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations',
      extension: 'js',
    },
  },
};
