import pool from './connection.js';

async function addUsersMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting users migration...');
    
    await client.query('BEGIN');
    
    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add user_id column to surveys table if it doesn't exist
    console.log('Adding user_id to surveys table...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'surveys' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE surveys ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    
    // Add user_id column to survey_responses table if it doesn't exist
    console.log('Adding user_id to survey_responses table...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'survey_responses' AND column_name = 'user_id'
        ) THEN
          ALTER TABLE survey_responses ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    
    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
      CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON survey_responses(user_id);
    `);
    
    // Create trigger for users updated_at
    console.log('Creating trigger for users table...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Users migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {
      // Ignore rollback errors
    });
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addUsersMigration();
