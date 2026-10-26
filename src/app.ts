import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { CATEGORIES, STATUSES, UNITS } from './constants';
import { auth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { openApiDocument } from './openapi';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import shoppingListRoutes from './routes/shoppingList';
import userRoutes from './routes/users';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json());

  // API docs: interactive UI at /docs, raw spec at /docs.json.
  app.get('/docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { swaggerOptions: { persistAuthorization: true } }));

  // Public: /auth/login and /auth/register. /auth/me applies auth itself.
  app.use('/auth', authRoutes);

  // Everything below requires a valid token.
  app.use('/products', auth, productRoutes);
  app.use('/shopping-list', auth, shoppingListRoutes);
  app.use('/users', auth, userRoutes);
  app.get('/meta', auth, (_req, res) => {
    res.json({ categories: CATEGORIES, units: UNITS, statuses: STATUSES });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
