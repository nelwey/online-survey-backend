import { Router } from 'express';
import { z } from 'zod';
import { UserModel } from '../models/user.js';
import { signToken } from '../utils/jwt.js';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

const serializeUser = (user: any) => ({
  id: user.id,
  username: user.username,
  email: user.email || undefined,
  name: user.name || undefined,
  createdAt: user.created_at.toISOString(),
});

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUsername = await UserModel.findByUsername(validatedData.username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Conflict', message: 'Username already exists' });
    }

    const existingEmail = await UserModel.findByEmail(validatedData.email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Conflict', message: 'Email already exists' });
    }

    const user = await UserModel.create(validatedData);
    const token = signToken(user.id);

    res.status(201).json({
      token,
      user: serializeUser(user),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', message: error.errors.map((e) => e.message).join(', ') });
    }
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await UserModel.findByUsernameOrEmail(validatedData.usernameOrEmail);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid username/email or password' });
    }

    const isPasswordValid = await UserModel.verifyPassword(validatedData.password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid username/email or password' });
    }

    const token = signToken(user.id);

    res.json({
      token,
      user: serializeUser(user),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', message: error.errors.map((e) => e.message).join(', ') });
    }
    next(error);
  }
});

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Not found', message: 'User not found' });
    }

    res.json(serializeUser(user));
  } catch (error) {
    next(error);
  }
});

// Get user statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const stats = await UserModel.getStats(req.params.id);

    res.json({
      userId: stats.user_id,
      totalSurveysCreated: stats.total_surveys_created,
      totalResponsesSubmitted: stats.total_responses_submitted,
      surveysCreated: stats.surveys_created.map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.created_at.toISOString(),
        totalResponses: s.total_responses,
      })),
      surveysAnswered: stats.surveys_answered.map((s) => ({
        surveyId: s.survey_id,
        surveyTitle: s.survey_title,
        respondedAt: s.responded_at.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;