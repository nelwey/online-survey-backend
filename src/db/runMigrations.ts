import pool from './connection.js';

/**
 * Runs all database migrations in the correct order
 * This function is idempotent - safe to run multiple times
 */
export async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...');
    
    await client.query('BEGIN');
    
    // Migration 1: Main schema (creates all tables, indexes, triggers)
    console.log('📦 Running main schema migration...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS surveys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        author_id VARCHAR(255),
        author_name VARCHAR(255),
        is_published BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'multiple-choice', 'single-choice', 'rating', 'yes-no')),
        question TEXT NOT NULL,
        required BOOLEAN DEFAULT false,
        options JSONB,
        min_rating INTEGER,
        max_rating INTEGER,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        respondent_name VARCHAR(255),
        respondent_email VARCHAR(255),
        respondent_age INTEGER,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        answer JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_questions_survey_id ON questions(survey_id);
      CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
      CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON survey_responses(user_id);
      CREATE INDEX IF NOT EXISTS idx_answers_response_id ON answers(response_id);
      CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
      CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
    `);
    
    // Create update function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create triggers
    await client.query(`
      DROP TRIGGER IF EXISTS update_surveys_updated_at ON surveys;
      CREATE TRIGGER update_surveys_updated_at 
      BEFORE UPDATE ON surveys
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);
    
    // Migration 2: Ensure user_id columns exist (if they don't from main migration)
    console.log('👥 Ensuring user_id columns exist...');
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
    
    // Migration 3: Ensure password column exists
    console.log('🔐 Ensuring password column exists...');
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
    
    // Update existing users without passwords
    await client.query(`
      UPDATE users 
      SET password = '$2b$10$dummyhashforuserswithoutpassword' 
      WHERE password = '' OR password IS NULL;
    `);
    
    // Ensure password is NOT NULL
    await client.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' 
          AND column_name = 'password' 
          AND is_nullable = 'YES'
        ) THEN
          ALTER TABLE users ALTER COLUMN password SET NOT NULL;
        END IF;
      END $$;
    `);
    
    // Migration 4: Ensure respondent_age column exists
    console.log('📊 Ensuring respondent_age column exists...');
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
    
    console.log('✅ All database migrations completed successfully!');
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {
      // Ignore rollback errors
    });
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    // Don't throw - allow server to start even if migrations fail
    // (they might have already been run)
    if (error.code === '42P07' || error.code === '42710') {
      console.log('ℹ️  Some objects already exist. This is normal if migrations were already run.');
    } else {
      console.error('⚠️  Continuing server startup despite migration warnings...');
    }
  } finally {
    client.release();
  }
}

