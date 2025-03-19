import express, { Request, Response, NextFunction } from 'express';
import { WpApiClient } from './wp-api-client';
import { WPPost, WPPage, WPComment, WPCategory, AuthPayload, AuthResponse } from './types';
import fetch from 'cross-fetch';
import { getAuthData, setAuthData, updateToken } from './cache';

interface ApiError extends Error {
  status?: number;
}

const app = express();
const port = process.env.PORT || 3000;

// Initialize WordPress API client
// const wpClient = new WpApiClient('http://geotourism.guide/wp-json', {
//   auth: {
//     type: 'jwt',
//     token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2dlb3RvdXJpc20uZ3VpZGUiLCJpYXQiOjE3NDIyODMwNjksIm5iZiI6MTc0MjI4MzA2OSwiZXhwIjoxODk5OTYzMDY5LCJkYXRhIjp7InVzZXIiOnsiaWQiOjY0LCJkZXZpY2UiOiIiLCJwYXNzIjoiOWQ5NDZhOGEyNjU0MGQzMjQyYmI1OWJjNmQzYjY1NDUifX19.oe3g_aKGvKgdv5xbxU6SyrEs0eQQ3H1xfvGDrNHiins"
//   }
// });

let wpClient: WpApiClient;

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Error handling middleware
const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
};

// Routes

// Authentication endpoint
async function refreshToken(): Promise<string> {
  const authData = getAuthData();
  if (!authData) {
    throw new Error('No authentication data found');
  }

  const { url, username, password } = authData;
  const response = await fetch(`${url}/jwt-auth/v1/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username,
      password
    })
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data: AuthResponse = await response.json();
  const { token } = data.data;
  updateToken(token);

  wpClient = new WpApiClient(url, {
    auth: {
      type: 'jwt',
      token
    }
  });

  return token;
}

async function handleApiRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  if (!wpClient) {
    const authData = getAuthData();
    if (!authData) {
      throw new Error('Authentication required. Please authenticate first.');
    }
    const { url, token } = authData;
    wpClient = new WpApiClient(url, {
      auth: {
        type: 'jwt',
        token
      }
    });
  }

  try {
    return await requestFn();
  } catch (error) {
    if (error instanceof Error && error.message.includes('authentication')) {
      try {
        await refreshToken();
        return await requestFn();
      } catch (refreshError) {
        throw new Error('Authentication failed after token refresh');
      }
    }
    throw error;
  }
}

app.post('/api/authenticate', async (req: Request<{}, {}, AuthPayload>, res: Response) => {
  try {
    const { url, username, password } = req.body;
    
    // Ensure URL doesn't already contain /wp-json
    const baseUrl = url.endsWith('/wp-json') ? url : `${url}/wp-json`;

    // Make request to WordPress JWT auth endpoint
    const response = await fetch(`${baseUrl}/jwt-auth/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    if (!response.ok) {
      // const errorData = await response.json().catch(() => null);
      let errorMessage = 'Authentication failed';
      
      switch (response.status) {
        case 403:
        case 401:
          errorMessage = 'Invalid username or password';
          break;
        case 404:
          errorMessage = 'WordPress authentication endpoint not found. Please check the site URL';
          break;
        case 500:
          errorMessage = 'WordPress server encountered an error. Please try again later';
          break;
        case 503:
          errorMessage = 'WordPress site is temporarily unavailable. Please try again later';
          break;
        default:
          errorMessage = `Authentication failed with status ${response.status}`;
      }
      
      throw new Error(errorMessage)
    }

    const data: AuthResponse = await response.json();
    const { token } = data.data;

    // Store credentials in cache with proper URL
    setAuthData({ url: baseUrl, username, password, token });

    // Create new WpApiClient instance with JWT token
    wpClient = new WpApiClient(baseUrl, {
      auth: {
        type: 'jwt',
        token
      }
    });

    const authResponse = {
      success: true,
      statusCode: 200,
      code: 'authentication_successful',
      message: 'Authentication successful',
    };

    res.json(authResponse);
  } catch (error) {
    const errorResponse = {
      success: false,
      statusCode: 500,
      code: 'authentication_failed',
      message: error instanceof Error ? error.message : 'Authentication failed',
    };
    res.status(errorResponse.statusCode).json(errorResponse);
  }
});

// Categories endpoints
app.get('/api/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await handleApiRequest(() => wpClient.postCategory<WPCategory>().find());
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

app.get('/api/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [category] = await handleApiRequest(() => wpClient.postCategory<WPCategory>().find(Number(req.params.id)));
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Posts endpoints
app.get('/api/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const posts = await handleApiRequest(() => wpClient.post<WPPost>().find());
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

app.get('/api/posts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [post] = await handleApiRequest(() => wpClient.post<WPPost>().find(Number(req.params.id)));
    res.json(post);
  } catch (error) {
    next(error);
  }
});

app.post('/api/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newPost = await handleApiRequest(() => wpClient.post<WPPost>().create(req.body));
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