import pool from '../db/connection.js';
import type {
  Survey,
  SurveyWithQuestions,
  Question,
  CreateSurveyInput,
} from '../types/index.js';

export class SurveyModel {
  static async findAll(): Promise<SurveyWithQuestions[]> {
    try {
      const result = await pool.query(`
        SELECT 
          s.*,
          COALESCE(
            json_agg(
              json_build_object(
                'id', q.id,
                'survey_id', q.survey_id,
                'type', q.type,
                'question', q.question,
                'required', q.required,
                'options', q.options,
                'min_rating', q.min_rating,
                'max_rating', q.max_rating,
                'order_index', q.order_index,
                'created_at', q.created_at
              ) ORDER BY q.order_index
            ) FILTER (WHERE q.id IS NOT NULL),
            '[]'::json
          ) as questions
        FROM surveys s
        LEFT JOIN questions q ON s.id = q.survey_id
        WHERE s.is_published = true
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `);

      return result.rows.map((row) => ({
        ...row,
        questions: Array.isArray(row.questions) ? row.questions : [],
      }));
    } catch (error: any) {
      console.error('Error in SurveyModel.findAll:', error);
      throw error;
    }
  }

  static async findById(id: string): Promise<SurveyWithQuestions | null> {
    const result = await pool.query(`
      SELECT 
        s.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', q.id,
              'survey_id', q.survey_id,
              'type', q.type,
              'question', q.question,
              'required', q.required,
              'options', q.options,
              'min_rating', q.min_rating,
              'max_rating', q.max_rating,
              'order_index', q.order_index,
              'created_at', q.created_at
            ) ORDER BY q.order_index
          ) FILTER (WHERE q.id IS NOT NULL),
          '[]'::json
        ) as questions
      FROM surveys s
      LEFT JOIN questions q ON s.id = q.survey_id
      WHERE s.id = $1
      GROUP BY s.id
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      questions: row.questions || [],
    };
  }

  static async create(data: CreateSurveyInput): Promise<SurveyWithQuestions> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert survey
      const surveyResult = await client.query(`
        INSERT INTO surveys (title, description, user_id, author_id, author_name, is_published)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        data.title,
        data.description || null,
        data.user_id || null,
        data.author_id || null,
        data.author_name || null,
        data.is_published !== undefined ? data.is_published : true,
      ]);

      const survey = surveyResult.rows[0];

      // Insert questions
      if (data.questions && data.questions.length > 0) {
        const questionValues = data.questions.map((q, index) => [
          survey.id,
          q.type,
          q.question,
          q.required || false,
          q.options && q.options.length > 0 ? JSON.stringify(q.options) : null,
          q.min_rating || null,
          q.max_rating || null,
          index,
        ]);

        const questionPlaceholders = questionValues
          .map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`)
          .join(', ');

        const questionParams = questionValues.flat();

        await client.query(`
          INSERT INTO questions (survey_id, type, question, required, options, min_rating, max_rating, order_index)
          VALUES ${questionPlaceholders}
        `, questionParams);
      }

      await client.query('COMMIT');

      const createdSurvey = await this.findById(survey.id);
      return createdSurvey!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(
    id: string,
    data: Partial<CreateSurveyInput>
  ): Promise<SurveyWithQuestions | null> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update survey
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        updateValues.push(data.title);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(data.description || null);
      }
      if (data.is_published !== undefined) {
        updateFields.push(`is_published = $${paramIndex++}`);
        updateValues.push(data.is_published);
      }

      if (updateFields.length > 0) {
        updateValues.push(id);
        await client.query(`
          UPDATE surveys
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `, updateValues);
      }

      // Update questions if provided
      if (data.questions !== undefined) {
        // Delete existing questions
        await client.query('DELETE FROM questions WHERE survey_id = $1', [id]);

        // Insert new questions
        if (data.questions.length > 0) {
          const questionValues = data.questions.map((q, index) => [
            id,
            q.type,
            q.question,
            q.required || false,
            q.options && q.options.length > 0 ? JSON.stringify(q.options) : null,
            q.min_rating || null,
            q.max_rating || null,
            index,
          ]);

          const questionPlaceholders = questionValues
            .map((_, i) => `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`)
            .join(', ');

          const questionParams = questionValues.flat();

          await client.query(`
            INSERT INTO questions (survey_id, type, question, required, options, min_rating, max_rating, order_index)
            VALUES ${questionPlaceholders}
          `, questionParams);
        }
      }

      await client.query('COMMIT');

      const updatedSurvey = await this.findById(id);
      return updatedSurvey;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM surveys WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows.length > 0;
  }
}
