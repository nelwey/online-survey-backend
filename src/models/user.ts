import pool from '../db/connection.js';
import bcrypt from 'bcrypt';
import type { User, CreateUserInput, UserStats } from '../types/user.js';

export class UserModel {
  static async findById(id: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    return result.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0] || null;
  }

  static async findByUsernameOrEmail(usernameOrEmail: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [usernameOrEmail]
    );
    
    return result.rows[0] || null;
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async create(data: CreateUserInput): Promise<User> {
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    
    const result = await pool.query(
      `INSERT INTO users (username, email, password, name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.username, data.email, hashedPassword, data.name || null]
    );
    
    return result.rows[0];
  }

  static async getStats(userId: string): Promise<UserStats> {
    // Get total surveys created
    const surveysCreatedResult = await pool.query(
      `SELECT COUNT(*) as count FROM surveys WHERE user_id = $1`,
      [userId]
    );
    const totalSurveysCreated = parseInt(surveysCreatedResult.rows[0].count);

    // Get total responses submitted
    const responsesResult = await pool.query(
      `SELECT COUNT(*) as count FROM survey_responses WHERE user_id = $1`,
      [userId]
    );
    const totalResponsesSubmitted = parseInt(responsesResult.rows[0].count);

    // Get surveys created by user with response counts
    const surveysCreatedQuery = await pool.query(
      `SELECT 
        s.id,
        s.title,
        s.created_at,
        COUNT(DISTINCT sr.id) as total_responses
      FROM surveys s
      LEFT JOIN survey_responses sr ON s.id = sr.survey_id
      WHERE s.user_id = $1
      GROUP BY s.id, s.title, s.created_at
      ORDER BY s.created_at DESC`,
      [userId]
    );

    const surveys_created = surveysCreatedQuery.rows.map((row) => ({
      id: row.id,
      title: row.title,
      created_at: row.created_at,
      total_responses: parseInt(row.total_responses),
    }));

    // Get surveys answered by user
    const surveysAnsweredQuery = await pool.query(
      `SELECT DISTINCT
        sr.survey_id,
        s.title as survey_title,
        MIN(sr.submitted_at) as responded_at
      FROM survey_responses sr
      JOIN surveys s ON sr.survey_id = s.id
      WHERE sr.user_id = $1
      GROUP BY sr.survey_id, s.title
      ORDER BY responded_at DESC`,
      [userId]
    );

    const surveys_answered = surveysAnsweredQuery.rows.map((row) => ({
      survey_id: row.survey_id,
      survey_title: row.survey_title,
      responded_at: row.responded_at,
    }));

    return {
      user_id: userId,
      total_surveys_created: totalSurveysCreated,
      total_responses_submitted: totalResponsesSubmitted,
      surveys_created,
      surveys_answered,
    };
  }

  static async getSurveysByUserId(userId: string) {
    const result = await pool.query(
      `SELECT * FROM surveys WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async getResponsesByUserId(userId: string) {
    const result = await pool.query(
      `SELECT * FROM survey_responses WHERE user_id = $1 ORDER BY submitted_at DESC`,
      [userId]
    );
    return result.rows;
  }
}
