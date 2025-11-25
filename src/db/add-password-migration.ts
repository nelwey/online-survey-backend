import pool from './connection.js';

async function addPasswordMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting password migration...');
    
    await client.query('BEGIN');
    
    // Add password column to users table if it doesn't exist
    console.log('Adding password column to users table...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'password'
        ) THEN
          ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '';
        END IF;
      END $$;
    `);
    
    // Update existing users without passwords - they will need to reset
    console.log('Updating existing users...');
    await client.query(`
      UPDATE users 
      SET password = '$2b$10$dummyhashforuserswithoutpassword' 
      WHERE password = '' OR password IS NULL;
    `);
    
    // Make password NOT NULL after setting defaults
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN password SET NOT NULL;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Password migration completed successfully!');
    console.log('⚠️  Note: Existing users without passwords have been set with a dummy hash.');
    console.log('   They will need to reset their passwords or create new accounts.');
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

addPasswordMigration();
