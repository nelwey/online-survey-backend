import pool from './connection.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migration...');
    
    await client.query('BEGIN');
    
    // Create tables in order
    // Create users table first
    console.log('Creating users table...');
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
    
    console.log('Creating surveys table...');
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
    
    console.log('Creating questions table...');
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
    
    console.log('Creating survey_responses table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        respondent_name VARCHAR(255),
        respondent_email VARCHAR(255),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating answers table...');
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
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_questions_survey_id ON questions(survey_id);
      CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
      CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON survey_responses(user_id);
      CREATE INDEX IF NOT EXISTS idx_answers_response_id ON answers(response_id);
      CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
      CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
    `);
    
    // Create function
    console.log('Creating update function...');
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
    console.log('Creating triggers...');
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
    
    await client.query('COMMIT');
    
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {
      // Ignore rollback errors
    });
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.code === '42P07' || error.code === '42710') {
      console.log('Note: Some objects already exist. This is normal if you run migration multiple times.');
    }
    if (error.code === '42P01') {
      console.error('Error: One of the referenced tables does not exist.');
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
