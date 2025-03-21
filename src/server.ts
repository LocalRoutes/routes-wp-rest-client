import express, { Request, Response, NextFunction } from 'express';
import { WpApiClient } from './wp-api-client';
import { WPPost, WPPage, WPComment, WPCategory, AuthPayload, AuthResponse, GDTaxonomyTerm } from './types';
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


// GD Categories endpoints
// app.get('/api/gd-categories/:postType', async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { postType } = req.params;
//     const { page, per_page } = req.query;

//     const categories = await handleApiRequest(() => wpClient.gdCategories(postType, {
//       page: page ? Number(page) : undefined,
//       per_page: per_page ? Number(per_page) : undefined
//     }));
//     res.json(categories);
//   } catch (error) {
//     next(error);
//   }
// });

// GD Posts endpoints
app.get('/api/gd-posts/:postType', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postType } = req.params;
    const query = new URLSearchParams();

    // Add all available query parameters
    const {
      category, tags, status, author, author_exclude,
      after, before, include, exclude, offset,
      category_exclude, tags_exclude, order, orderby,
      parent, parent_exclude, slug, page, per_page,
      search, latitude, longitude
    } = req.query;

    if (category) query.set(`gd_${postType}category`, category as string);
    if (tags) query.set(`gd_${postType}_tags`, tags as string);
    if (status) query.set('status', status as string);
    if (author) query.set('author', author as string);
    if (author_exclude) query.set('author_exclude', author_exclude as string);
    if (after) query.set('after', after as string);
    if (before) query.set('before', before as string);
    if (include) query.set('include', include as string);
    if (exclude) query.set('exclude', exclude as string);
    if (offset) query.set('offset', offset as string);
    if (category_exclude) query.set(`gd_${postType}category_exclude`, category_exclude as string);
    if (tags_exclude) query.set(`gd_${postType}_tags_exclude`, tags_exclude as string);
    if (order) query.set('order', order as string);
    if (orderby) query.set('orderby', orderby as string);
    if (parent) query.set('parent', parent as string);
    if (parent_exclude) query.set('parent_exclude', parent_exclude as string);
    if (slug) query.set('slug', slug as string);
    if (page) query.set('page', page as string);
    if (per_page) query.set('per_page', per_page as string);
    if (search) query.set('search', search as string);
    if (latitude) query.set('latitude', latitude as string);
    if (longitude) query.set('longitude', longitude as string);

    const posts = await handleApiRequest(() => wpClient.gdPosts(postType).find(query));
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

app.get('/api/gd-posts/:postType/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postType, id } = req.params;
    const [post] = await handleApiRequest(() => wpClient.gdPosts(postType).find(Number(id)));
    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json(post);
  } catch (error) {
    next(error);
  }
});

app.post('/api/gd-posts/:postType', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postType } = req.params;
    req.body['post_type'] = postType;
    const newPost = await handleApiRequest(() => wpClient.gdPosts(postType).create(req.body));
    res.status(201).json(newPost);
  } catch (error) {
    next(error);
  }
});

app.put('/api/gd-posts/:postType/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postType, id } = req.params;
    const updatedPost = await handleApiRequest(() => wpClient.gdPosts(postType).customUpdate(Number(id),req.body));
    if (!updatedPost) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json(updatedPost);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/gd-posts/:postType/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postType, id } = req.params;
    const force = req.query.force === 'true';
    const deletedPost = await handleApiRequest(() => wpClient.gdPosts(postType).customDelete(Number(id), force));
    if (!deletedPost) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json({ message: 'Post deleted successfully', post: deletedPost });
  } catch (error) {
    next(error);
  }
});

// Reviews endpoints
app.get('/api/gd-reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = new URLSearchParams();
    const {
      post_type, author, author_exclude, author_email,
      after, before, include, exclude, offset,
      order, orderby, parent, parent_exclude, post,
      page, per_page, type, password, status
    } = req.query;

    if (post_type) query.set('post_type', post_type as string);
    if (author) query.set('author', author as string);
    if (author_exclude) query.set('author_exclude', author_exclude as string);
    if (author_email) query.set('author_email', author_email as string);
    if (after) query.set('after', after as string);
    if (before) query.set('before', before as string);
    if (include) query.set('include', include as string);
    if (exclude) query.set('exclude', exclude as string);
    if (offset) query.set('offset', offset as string);
    if (order) query.set('order', order as string);
    if (orderby) query.set('orderby', orderby as string);
    if (parent) query.set('parent', parent as string);
    if (parent_exclude) query.set('parent_exclude', parent_exclude as string);
    if (post) query.set('post', post as string);
    if (page) query.set('page', page as string);
    if (per_page) query.set('per_page', per_page as string);
    if (type) query.set('type', type as string);
    if (password) query.set('password', password as string);
    if (status) query.set('status', status as string);

    const reviews = await handleApiRequest(() => wpClient.gdReviews().find(query));
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

app.get('/api/gd-reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [review] = await handleApiRequest(() => wpClient.gdReviews().find(Number(req.params.id)));
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.json(review);
  } catch (error) {
    next(error);
  }
});

app.post('/api/gd-reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newReview = await handleApiRequest(() => wpClient.gdReviews().create(req.body));
    res.status(201).json(newReview);
  } catch (error) {
    next(error);
  }
});

app.put('/api/gd-reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedReview = await handleApiRequest(() => wpClient.gdReviews().customUpdate(Number(req.params.id), req.body));
    if (!updatedReview) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.json(updatedReview);
  } catch (error) {
    next(error);
  }
});



// GD Post Types endpoint
app.get('/api/gd-post-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postTypes = await handleApiRequest(() => wpClient.gdPostTypes());
    res.json(postTypes);
  } catch (error) {
    next(error);
  }
});

// GD Countries endpoints
app.get('/api/gd-countries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const countries = await handleApiRequest(() => wpClient.gdCountries().find());
    res.json(countries);
  } catch (error) {
    next(error);
  }
});

app.get('/api/gd-countries/:iso2', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { iso2 } = req.params;
    const [country] = await handleApiRequest(() => wpClient.gdCountries().find(Number(iso2)));
    if (!country) {
      res.status(404).json({ error: 'Country not found' });
      return;
    }
    res.json(country);
  } catch (error) {
    next(error);
  }
});

// GD Settings endpoints
app.get('/api/gd-settings-groups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await handleApiRequest(() => wpClient.getGDSettingsGroups().find());
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

app.get('/api/gd-settings-groups/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settingsGroup = await handleApiRequest(() => wpClient.getGDSettingsGroups().findOne(req.params.id));
    if (!settingsGroup) {
      res.status(404).json({ error: 'Settings group not found' });
      return;
    }
    res.json(settingsGroup);
  } catch (error) {
    next(error);
  }
});

app.get('/api/gd-settings/:group/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { group, id } = req.params;
    const settings = await handleApiRequest(() => wpClient.GDSettings(group, id).find());
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

app.put('/api/gd-settings/:group/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { group, id } = req.params;
    const updatedSettings = await handleApiRequest(() => wpClient.GDSettings(group, id).customUpdate(id, req.body));
    res.json(updatedSettings);
  } catch (error) {
    next(error);
  }
});

// GD System Status endpoint
app.get('/api/gd-system-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const systemStatus = await handleApiRequest(() => wpClient.GDSystemStatus()());
    res.json(systemStatus);
  } catch (error) {
    next(error);
  }
});

// GD System Status Tools endpoints
app.get('/api/gd-system-status/tools', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tools = await handleApiRequest(() => wpClient.GDSystemStatusTool().find());
    res.json(tools);
  } catch (error) {
    next(error);
  }
});

app.get('/api/gd-system-status/tools/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tool = await handleApiRequest(() => wpClient.GDSystemStatusTool().findOne(id));
    if (!tool) {
      res.status(404).json({ error: 'System status tool not found' });
      return;
    }
    res.json(tool);
  } catch (error) {
    next(error);
  }
});

app.put('/api/gd-system-status/tools/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updatedTool = await handleApiRequest(() => wpClient.GDSystemStatusTool().customUpdate(id, req.body));
    res.json(updatedTool);
  } catch (error) {
    next(error);
  }
});

// GD Taxonomy endpoints
app.get('/api/gd-taxonomies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taxonomies = await handleApiRequest(() => wpClient.gdTaxonomies().find());
    res.json(taxonomies);
  } catch (error) {
    next(error);
  }
});

app.get('/api/gd-taxonomies/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const taxonomy = await handleApiRequest(() => wpClient.gdTaxonomies().findOne(slug));
    if (!taxonomy) {
      res.status(404).json({ error: 'Taxonomy not found' });
      return;
    }
    res.json(taxonomy);
  } catch (error) {
    next(error);
  }
});

// GD Map Markers endpoints
app.get('/api/gd-map-markers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      post_type,
      term,
      tag,
      post,
      search
    } = req.query;

    if (!post_type) {
      res.status(400).json({ error: 'post_type parameter is required' });
      return;
    }

    const query = new URLSearchParams();
    query.set('post_type', post_type.toString());
    if (term) query.set('term', term.toString());
    if (tag) query.set('tag', tag.toString());
    if (post) query.set('post', post.toString());
    if (search) query.set('search', search.toString());

    const markers = await handleApiRequest(() => wpClient.gdMapMarkers().find(query));
    res.json(markers);
  } catch (error) {
    next(error);
  }
});

app.get('/api/gd-map-markers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const marker = await handleApiRequest(() => wpClient.gdMapMarkers().findOne(Number(req.params.id)));
    if (!marker) {
      res.status(404).json({ error: 'Marker not found' });
      return;
    }
    res.json(marker);
  } catch (error) {
    next(error);
  }
});

// GD Fields endpoints
app.get('/api/gd-fields', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      name,
      post_type,
      post,
      package: pkg,
      default: defaultValue,
      access,
      location,
      order,
      orderby,
      page,
      per_page
    } = req.query;

    const query = new URLSearchParams();
    if (status) query.set('status', status.toString());
    if (name) query.set('name', name.toString());
    if (post_type) query.set('post_type', post_type.toString());
    if (post) query.set('post', post.toString());
    if (pkg) query.set('package', pkg.toString());
    if (defaultValue) query.set('default', defaultValue.toString());
    if (access) query.set('access', access.toString());
    if (location) query.set('location', location.toString());
    if (order) query.set('order', order.toString());
    if (orderby) query.set('orderby', orderby.toString());
    if (page) query.set('page', page.toString());
    if (per_page) query.set('per_page', per_page.toString());

    const fields = await handleApiRequest(() => wpClient.gdFields().find(query));
    res.json(fields);
  } catch (error) {
    next(error);
  }
});

app.get('/api/gd-fields/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [field] = await handleApiRequest(() => wpClient.gdFields().find(Number(req.params.id)));
    if (!field) {
      res.status(404).json({ error: 'Field not found' });
      return;
    }
    res.json(field);
  } catch (error) {
    next(error);
  }
});

// GD Taxonomy Term endpoints
app.get('/api/gd-taxonomy/:postType/:taxonomy', async (req: Request<{ taxonomy: string, postType: string }>, res: Response, next: NextFunction) => {
  try {
    const { postType , taxonomy } = req.params;
    const {
      include,
      exclude,
      offset,
      order = 'desc',
      orderby = 'name',
      hide_empty = 'false',
      parent,
      post,
      slug,
      page = '1',
      per_page = '10'
    } = req.query as Record<string, string>;

    const queryParams = new URLSearchParams();
    if (include) queryParams.set('include', include);
    if (exclude) queryParams.set('exclude', exclude);
    if (offset) queryParams.set('offset', offset);
    if (order) queryParams.set('order', order);
    if (orderby) queryParams.set('orderby', orderby);
    if (hide_empty) queryParams.set('hide_empty', hide_empty);
    if (parent) queryParams.set('parent', parent);
    if (post) queryParams.set('post', post);
    if (slug) queryParams.set('slug', slug);
    if (page) queryParams.set('page', page);
    if (per_page) queryParams.set('per_page', per_page);

    const terms = await handleApiRequest(() => wpClient.gdTaxonomyTerm().find(`${postType + '/' +taxonomy}`, queryParams));
    res.json(terms);
  } catch (error) {
    next(error);
  }
});

app.get('/api/gd-taxonomy/:postType/:taxonomy/:termId', async (req: Request<{ postType: string , taxonomy: string; termId: string }>, res: Response, next: NextFunction) => {
  try {
    const {postType, taxonomy, termId } = req.params;
    const term = await handleApiRequest(() => wpClient.gdTaxonomyTerm().findOne(`${postType + '/' +taxonomy}`, parseInt(termId)));
    if (!term) {
      res.status(404).json({ error: 'Term not found' });
      return;
    }
    res.json(term);
  } catch (error) {
    next(error);
  }
});

app.post('/api/gd-taxonomy/:postType/:taxonomy', async (req: Request<{ postType: string, taxonomy: string }>, res: Response, next: NextFunction) => {
  try {
    const { postType, taxonomy } = req.params;
    const { name, slug, description, parent } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: 'Term name is required' });
      return
    }

    const termData = {
      name,
      slug: slug?.trim() || undefined,
      taxonomy,
      description: description?.trim() || undefined,
      parent: parent ? parseInt(parent) : undefined
    };

    const term = await handleApiRequest(() => wpClient.gdTaxonomyTerm().create(`${postType + '/' +taxonomy}`, termData as GDTaxonomyTerm));
    res.status(201).json(term);
  } catch (error) {
    next(error);
  }
});

app.put('/api/gd-taxonomy/:postType/:taxonomy/:termId', async (req: Request<{ postType: string, taxonomy: string; termId: string }>, res: Response, next: NextFunction) => {
  try {
    const { postType, taxonomy, termId } = req.params;
    const { name, slug, description, parent } = req.body;

    if (!name?.trim()) {
      res.status(400).json({ error: 'Term name is required' });
      return 
    }

    const termData = {
      name,
      slug: slug?.trim() || undefined,
      description: description?.trim() || undefined,
      parent: parent ? parseInt(parent) : undefined
    };

    const term = await handleApiRequest(() => wpClient.gdTaxonomyTerm().update(`${postType + '/' +taxonomy}`, parseInt(termId), termData as GDTaxonomyTerm));
    if (!term) {
      res.status(404).json({ error: 'Term not found' });
      return;
    }
    res.json(term);
  } catch (error) {
    next(error);
  }
});

// Apply error handling middleware

// Apply error handling middleware

app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});