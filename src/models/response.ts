import pool from '../db/connection.js';
import type {
  ResponseWithAnswers,
  SubmitResponseInput,
} from '../types/index.js';

export class ResponseModel {
  static async findBySurveyId(surveyId: string): Promise<ResponseWithAnswers[]> {
    const result = await pool.query(`
      SELECT 
        sr.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'response_id', a.response_id,
              'question_id', a.question_id,
              'answer', a.answer,
              'created_at', a.created_at,
              'question', json_build_object(
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
              )
            ) ORDER BY q.order_index
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::json
        ) as answers
      FROM survey_responses sr
      LEFT JOIN answers a ON sr.id = a.response_id
      LEFT JOIN questions q ON a.question_id = q.id
      WHERE sr.survey_id = $1
      GROUP BY sr.id
      ORDER BY sr.submitted_at DESC
    `, [surveyId]);

    return result.rows.map((row) => ({
      ...row,
      answers: row.answers || [],
    }));
  }

  static async create(data: SubmitResponseInput): Promise<ResponseWithAnswers> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert survey response
      const responseResult = await client.query(`
        INSERT INTO survey_responses (survey_id, user_id, respondent_name, respondent_email, respondent_age)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        data.survey_id,
        data.user_id || null,
        data.respondent_name || null,
        data.respondent_email || null,
        data.respondent_age || null,
      ]);

      const response = responseResult.rows[0];

      // Insert answers
      if (data.answers && data.answers.length > 0) {
        const answerValues = data.answers.map((a) => [
          response.id,
          a.question_id,
          a.answer, // Pass directly - pg library will convert to JSONB
        ]);

        const answerPlaceholders = answerValues
          .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
          .join(', ');

        const answerParams = answerValues.flat();

        await client.query(`
          INSERT INTO answers (response_id, question_id, answer)
          VALUES ${answerPlaceholders}
        `, answerParams);
      }

      await client.query('COMMIT');

      const responses = await this.findBySurveyId(data.survey_id);
      const createdResponse = responses.find((r) => r.id === response.id);
      return createdResponse!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async countBySurveyId(surveyId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM survey_responses WHERE survey_id = $1',
      [surveyId]
    );

    return parseInt(result.rows[0].count);
  }
}
