import pool from '../db/connection.js';
import type { SurveyStats, QuestionStats } from '../types/index.js';

export class StatsModel {
  static async getSurveyStats(surveyId: string): Promise<SurveyStats> {
    // Get total responses count
    const totalCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM survey_responses WHERE survey_id = $1',
      [surveyId]
    );
    const totalResponses = parseInt(totalCountResult.rows[0].count);

    // Get all questions for this survey
    const questionsResult = await pool.query(
      'SELECT id, type, question FROM questions WHERE survey_id = $1 ORDER BY order_index',
      [surveyId]
    );

    const questions = questionsResult.rows;
    const questionStats: QuestionStats[] = [];

    for (const question of questions) {
      // Get all answers for this question
      const answersResult = await pool.query(
        `SELECT answer FROM answers a
         JOIN survey_responses sr ON a.response_id = sr.id
         WHERE a.question_id = $1 AND sr.survey_id = $2`,
        [question.id, surveyId]
      );

      const answers = answersResult.rows.map((row) => {
        let value = row.answer;
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            // leave as string
          }
        }
        return value;
      });

      if (answers.length === 0) {
        questionStats.push({
          question_id: question.id,
          question: question.question,
          type: question.type,
          responses: {},
        });
        continue;
      }

      let stats: QuestionStats;

      if (question.type === 'rating') {
        // Calculate average rating
        const numericAnswers = answers
          .map((a) => {
            if (typeof a === 'number') return a;
            if (typeof a === 'string') {
              const parsed = Number(a);
              return Number.isNaN(parsed) ? undefined : parsed;
            }
            return undefined;
          })
          .filter((a): a is number => typeof a === 'number');
        const sum = numericAnswers.reduce((acc, val) => acc + val, 0);
        const average = numericAnswers.length > 0 ? sum / numericAnswers.length : 0;

        // Count each rating
        const ratingCounts: Record<string, number> = {};
        numericAnswers.forEach((rating) => {
          const key = String(rating);
          ratingCounts[key] = (ratingCounts[key] || 0) + 1;
        });

        stats = {
          question_id: question.id,
          question: question.question,
          type: question.type,
          responses: ratingCounts,
          average_rating: average,
        };
      } else if (
        question.type === 'multiple-choice' ||
        question.type === 'single-choice' ||
        question.type === 'yes-no'
      ) {
        // Count responses for each option
        const responseCounts: Record<string, number> = {};

        answers.forEach((answer) => {
          if (answer === null || answer === undefined || answer === '') {
            return;
          }
          if (Array.isArray(answer)) {
            // Multiple choice - each option in the array
            answer.forEach((option) => {
              if (option === null || option === undefined || option === '') {
                return;
              }
              const key = String(option);
              responseCounts[key] = (responseCounts[key] || 0) + 1;
            });
          } else {
            // Single choice or yes-no
            const key = String(answer);
            responseCounts[key] = (responseCounts[key] || 0) + 1;
          }
        });

        stats = {
          question_id: question.id,
          question: question.question,
          type: question.type,
          responses: responseCounts,
        };
      } else {
        // Text questions - we don't aggregate these in stats
        stats = {
          question_id: question.id,
          question: question.question,
          type: question.type,
          responses: {},
        };
      }

      questionStats.push(stats);
    }

    return {
      survey_id: surveyId,
      total_responses: totalResponses,
      question_stats: questionStats,
    };
  }
}
