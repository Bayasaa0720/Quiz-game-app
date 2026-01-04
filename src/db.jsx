import { neon } from '@neondatabase/serverless';

// Change process.env to import.meta.env
// Change DATABASE_URL to VITE_DATABASE_URL to match your .env file
const sql = neon(import.meta.env.VITE_DATABASE_URL);

export default sql;