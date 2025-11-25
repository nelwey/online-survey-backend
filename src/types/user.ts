export interface User {
  id: string;
  username: string;
  email?: string | null;
  name?: string | null;
  password: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  usernameOrEmail: string;
  password: string;
}

export interface UserStats {
  user_id: string;
  total_surveys_created: number;
  total_responses_submitted: number;
  surveys_created: Array<{
    id: string;
    title: string;
    created_at: Date;
    total_responses: number;
  }>;
  surveys_answered: Array<{
    survey_id: string;
    survey_title: string;
    responded_at: Date;
  }>;
}
