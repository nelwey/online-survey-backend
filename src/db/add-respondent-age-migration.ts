import pool from './connection.js';

async function addRespondentAgeMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting respondent age migration...');
    
    await client.query('BEGIN');
    
    // Add age column to survey_responses table if it doesn't exist
    console.log('Adding age column to survey_responses table...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'survey_responses' AND column_name = 'respondent_age'
        ) THEN
          ALTER TABLE survey_responses ADD COLUMN respondent_age INTEGER;
        END IF;
      END $$;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Respondent age migration completed successfully!');
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

addRespondentAgeMigration();
