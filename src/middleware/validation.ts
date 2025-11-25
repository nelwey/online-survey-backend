import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          message: error.errors.map((e) => e.message).join(', '),
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
}

// Validation schemas
export const createSurveySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  questions: z.array(
    z.object({
      type: z.enum(['text', 'multiple-choice', 'single-choice', 'rating', 'yes-no']),
      question: z.string().min(1, 'Question text is required'),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional(),
      min_rating: z.number().optional(),
      max_rating: z.number().optional(),
    })
  ).min(1, 'At least one question is required'),
  is_published: z.boolean().optional().default(true),
  author_id: z.string().optional(),
  author_name: z.string().optional(),
});

export const submitResponseSchema = z.object({
  surveyId: z.string().uuid('Invalid survey ID'),
  answers: z.array(
    z.object({
      questionId: z.string().uuid('Invalid question ID'),
      answer: z.union([
        z.string(),
        z.array(z.string()),
        z.number(),
      ]),
    })
  ).min(1, 'At least one answer is required'),
  userId: z.string().uuid().optional(),
  respondentName: z.string().min(1, 'Respondent name is required'),
  respondentEmail: z.string().email().optional().or(z.literal('')),
  respondentAge: z.number().int().min(1).max(150).optional(),
});
