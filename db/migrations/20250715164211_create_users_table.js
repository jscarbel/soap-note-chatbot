/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  knex.schema.createTable('users', function (table) {
    table.bigIncrements('id', { primaryKey: true }).primary();
    table.string('email').notNullable().unique();
    table.string('name').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('email');
  });

  knex.schema.createTable('oauths', function (table) {
    table.bigIncrements('id', { primaryKey: true });
    table.string('provider').notNullable(); // source, e.g. "google" or "facebook"
    table.string('external_id').notNullable(); // typically a UUID
    table.string('email').notNullable(); // guaranteed to be a valid email
    table.string('refresh_token').nullable(); // how the user refreshes their JWT

    table.index('email');
    table.unique(['provider', 'email']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('users');
};
