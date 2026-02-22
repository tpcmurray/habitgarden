/** @type {import('drizzle-kit').Config} */
module.exports = {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: 'postgresql://habitgarden_user:habitgarden_dev@localhost:5434/habitgarden',
  },
};
