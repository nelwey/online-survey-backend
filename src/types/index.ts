export type QuestionType = 'text' | 'multiple-choice' | 'single-choice' | 'rating' | 'yes-no';

export interface Question {
  id: string;
  survey_id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[] | null;
  min_rating?: number | null;
  max_rating?: number | null;
  order_index: number;
  created_at: Date;
}

export interface Survey {
  id: string;
  title: string;
  description?: string | null;
  user_id?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SurveyWithQuestions extends Survey {
  questions: Question[];
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  user_id?: string | null;
  respondent_name?: string | null;
  respondent_email?: string | null;
  respondent_age?: number | null;
  submitted_at: Date;
}

export interface Answer {
  id: string;
  response_id: string;
  question_id: string;
  answer: string | string[] | number;
  created_at: Date;
}

export interface AnswerWithQuestion extends Answer {
  question: Question;
}

export interface ResponseWithAnswers extends SurveyResponse {
  answers: AnswerWithQuestion[];
}

export interface CreateSurveyInput {
  title: string;
  description?: string;
  questions: Omit<Question, 'id' | 'survey_id' | 'order_index' | 'created_at'>[];
  is_published?: boolean;
  user_id?: string;
  author_id?: string;
  author_name?: string;
}

export interface SubmitResponseInput {
  survey_id: string;
  answers: {
    question_id: string;
    answer: string | string[] | number;
  }[];
  user_id?: string;
  respondent_name?: string;
  respondent_email?: string;
  respondent_age?: number;
}

export interface QuestionStats {
  question_id: string;
  question: string;
  type: QuestionType;
  responses: Record<string, number>;
  average_rating?: number;
}

export interface SurveyStats {
  survey_id: string;
  total_responses: number;
  question_stats: QuestionStats[];
}
