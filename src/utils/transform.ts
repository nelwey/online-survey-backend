import type {
  SurveyWithQuestions,
  ResponseWithAnswers,
  Question,
  Answer,
} from '../types/index.js';

// Transform database models to API response format
export function transformSurvey(survey: SurveyWithQuestions) {
  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    questions: (survey.questions || []).map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      required: q.required,
      options: (() => {
        if (!q.options) return undefined;
        if (Array.isArray(q.options)) return q.options;
        if (typeof q.options === 'string') {
          try {
            return JSON.parse(q.options);
          } catch {
            return [q.options];
          }
        }
        return q.options;
      })(),
      minRating: q.min_rating || undefined,
      maxRating: q.max_rating || undefined,
    })),
    createdAt: survey.created_at.toISOString(),
    updatedAt: survey.updated_at.toISOString(),
    userId: survey.user_id || undefined,
    authorId: survey.author_id || undefined,
    authorName: survey.author_name || undefined,
    isPublished: survey.is_published,
  };
}

export function transformResponse(response: ResponseWithAnswers) {
  return {
    id: response.id,
    surveyId: response.survey_id,
    answers: response.answers.map((a) => {
      let answerValue = a.answer;
      if (typeof a.answer === 'string') {
        try {
          const parsed = JSON.parse(a.answer);
          answerValue =
            typeof parsed === 'object' ? parsed : parsed;
        } catch {
          answerValue = a.answer;
        }
      }

      return {
        questionId: a.question_id,
        answer: answerValue,
      };
    }),
    submittedAt: response.submitted_at.toISOString(),
    respondentName: response.respondent_name || undefined,
    respondentEmail: response.respondent_email || undefined,
    respondentAge:
      typeof response.respondent_age === 'number'
        ? response.respondent_age
        : undefined,
  };
}

export function transformStats(stats: any) {
  return {
    surveyId: stats.survey_id,
    totalResponses: stats.total_responses,
    questionStats: stats.question_stats.map((qs: any) => ({
      questionId: qs.question_id,
      question: qs.question,
      type: qs.type,
      responses: qs.responses,
      averageRating: qs.average_rating,
    })),
  };
}
