import { Router } from 'express';
import { SurveyModel } from '../models/survey.js';
import { ResponseModel } from '../models/response.js';
import { StatsModel } from '../models/stats.js';
import { validate, createSurveySchema, submitResponseSchema } from '../middleware/validation.js';
import { transformSurvey, transformResponse, transformStats } from '../utils/transform.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get all surveys
router.get('/', async (req, res, next) => {
  try {
    const surveys = await SurveyModel.findAll();
    // Always return an array, even if empty
    res.json(surveys.map(transformSurvey));
  } catch (error: any) {
    console.error('Error fetching surveys:', error);
    next(error);
  }
});

// Get survey by ID
router.get('/:id', async (req, res, next) => {
  try {
    const survey = await SurveyModel.findById(req.params.id);
    
    if (!survey) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Survey not found',
      });
    }

    res.json(transformSurvey(survey));
  } catch (error) {
    next(error);
  }
});

// Create survey
router.post('/', requireAuth, validate(createSurveySchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    // Transform frontend format to backend format
    const surveyData = {
      title: req.body.title,
      description: req.body.description,
      questions: req.body.questions.map((q: any) => ({
        type: q.type,
        question: q.question,
        required: q.required || false,
        options: q.options || undefined,
        min_rating: q.minRating || undefined,
        max_rating: q.maxRating || undefined,
      })),
      is_published: req.body.isPublished !== undefined ? req.body.isPublished : true,
      author_id: req.body.authorId,
      author_name: req.body.authorName,
      user_id: userId,
    };

    const survey = await SurveyModel.create(surveyData);
    res.status(201).json(transformSurvey(survey));
  } catch (error) {
    next(error);
  }
});

// Update survey
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const existingSurvey = await SurveyModel.findById(req.params.id);
    if (!existingSurvey) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Survey not found',
      });
    }

    if (existingSurvey.user_id && existingSurvey.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to modify this survey',
      });
    }

    const updateData: any = {};

    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.isPublished !== undefined) updateData.is_published = req.body.isPublished;
    
    if (req.body.questions !== undefined) {
      updateData.questions = req.body.questions.map((q: any) => ({
        type: q.type,
        question: q.question,
        required: q.required || false,
        options: q.options || undefined,
        min_rating: q.minRating || undefined,
        max_rating: q.maxRating || undefined,
      }));
    }

    const survey = await SurveyModel.update(req.params.id, updateData);
    
    if (!survey) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Survey not found',
      });
    }

    res.json(transformSurvey(survey));
  } catch (error) {
    next(error);
  }
});

// Delete survey
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    const existingSurvey = await SurveyModel.findById(req.params.id);

    if (!existingSurvey) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Survey not found',
      });
    }

    if (existingSurvey.user_id && existingSurvey.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to delete this survey',
      });
    }

    const deleted = await SurveyModel.delete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Survey not found',
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Submit survey response
router.post('/responses', validate(submitResponseSchema), async (req, res, next) => {
  try {
    const responseData = {
      survey_id: req.body.surveyId,
      answers: req.body.answers.map((a: any) => ({
        question_id: a.questionId,
        answer: a.answer,
      })),
      user_id: req.body.userId,
      respondent_name: req.body.respondentName,
      respondent_email: req.body.respondentEmail,
      respondent_age: req.body.respondentAge ? parseInt(req.body.respondentAge) : undefined,
    };

    const response = await ResponseModel.create(responseData);
    res.status(201).json(transformResponse(response));
  } catch (error) {
    next(error);
  }
});

// Get survey responses
router.get('/:id/responses', async (req, res, next) => {
  try {
    const responses = await ResponseModel.findBySurveyId(req.params.id);
    res.json(responses.map(transformResponse));
  } catch (error) {
    next(error);
  }
});

// Get survey statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const stats = await StatsModel.getSurveyStats(req.params.id);
    res.json(transformStats(stats));
  } catch (error) {
    next(error);
  }
});

export default router;
