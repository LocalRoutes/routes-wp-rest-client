import express, { Request, Response, NextFunction } from 'express';
import { WpApiClient } from './wp-api-client';
import { WPPost, WPPage, WPComment } from './types';

interface ApiError extends Error {
  status?: number;
}

const app = express();
const port = process.env.PORT || 3000;

// Initialize WordPress API client
const wpClient = new WpApiClient('http://geotourism.guide/wp-json', {
  auth: {
    type: 'jwt',
    token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2dlb3RvdXJpc20uZ3VpZGUiLCJpYXQiOjE3NDIyODMwNjksIm5iZiI6MTc0MjI4MzA2OSwiZXhwIjoxODk5OTYzMDY5LCJkYXRhIjp7InVzZXIiOnsiaWQiOjY0LCJkZXZpY2UiOiIiLCJwYXNzIjoiOWQ5NDZhOGEyNjU0MGQzMjQyYmI1OWJjNmQzYjY1NDUifX19.oe3g_aKGvKgdv5xbxU6SyrEs0eQQ3H1xfvGDrNHiins"
  }
});

// Middleware
app.use(express.json());

// Error handling middleware
const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
};

// Routes

// Posts endpoints
app.get('/api/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const posts = await wpClient.post<WPPost>().find();
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await wpClient.post<WPPost>().find(Number(req.params.id));
    res.json(post);
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newPost = await wpClient.post<WPPost>().create(req.body);
    res.status(201).json(newPost);
  } catch (error) {
    next(error);
  }
});


// Apply error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});