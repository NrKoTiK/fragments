// tests/unit/getID.test.js

const request = require('supertest');
const app = require('../../src/app');

describe('GET /v1/fragments/:id', () => {
  const createFragment = async (
    auth,
    contentType = 'text/plain; charset=utf-8',
    data = 'test fragment'
  ) => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(auth.email, auth.password)
      .set('Content-Type', contentType)
      .send(data);

    return res.body.fragment;
  };

  const testUser = { email: 'user1@email.com', password: 'password1' };

  test('unauthenticated requests are denied', async () => {
    const res = await request(app).get('/v1/fragments/123');

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(401);
    expect(res.body.error.message).toBe('Unauthorized');
  });

  test('incorrect credentials are denied', async () => {
    const res = await request(app)
      .get('/v1/fragments/123')
      .auth('invalid@email.com', 'incorrect_password');

    expect(res.status).toBe(401);
  });

  test('returns 404 for non-existent fragment ID', async () => {
    const res = await request(app)
      .get('/v1/fragments/non-existent-id')
      .auth(testUser.email, testUser.password);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(404);
    expect(res.body.error.message).toBe('Fragment not found');
  });

  test('returns fragment data for valid ID', async () => {
    const fragmentData = 'This is a test fragment';
    const fragment = await createFragment(testUser, 'text/plain', fragmentData);

    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}`)
      .auth(testUser.email, testUser.password);

    expect(res.status).toBe(200);
    expect(res.text).toBe(fragmentData);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  test('returns fragment with charset in content-type', async () => {
    const fragmentData = 'Fragment with charset';
    const fragment = await createFragment(testUser, 'text/plain; charset=utf-8', fragmentData);

    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}`)
      .auth(testUser.email, testUser.password);

    expect(res.status).toBe(200);
    expect(res.text).toBe(fragmentData);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  // Test empty fragment retrieval
  test('returns empty fragment correctly', async () => {
    const fragment = await createFragment(testUser, 'text/plain', '');

    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}`)
      .auth(testUser.email, testUser.password);

    expect(res.status).toBe(200);
    expect(res.text).toBe('');
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
  });

  test('user cannot access fragments from other users', async () => {
    const fragment = await createFragment(testUser, 'text/plain', 'user1 fragment');

    // Try to access as user2
    const res = await request(app)
      .get(`/v1/fragments/${fragment.id}`)
      .auth('user2@email.com', 'password2');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(404);
    expect(res.body.error.message).toBe('Fragment not found');
  });

  test('returns 404 for broken fragment ID', async () => {
    const res = await request(app).get('/v1/fragments/bad-id').auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(404);
  });

  test('converts markdown fragment to html with .html extension', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/markdown')
      .send('# Hello World\n\nThis is **bold** text.');

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.html`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('<h1>Hello World</h1>');
    expect(res.text).toContain('<strong>bold</strong>');
  });

  test('converts markdown fragment to plain text with .txt extension', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/markdown')
      .send('# Hello\n\nTest content.');

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.txt`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toBe('# Hello\n\nTest content.');
  });

  test('returns 415 for unsupported file extension', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('test content');

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.xyz`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(415);
    expect(res.body.error.message).toContain('Unsupported file extension');
  });

  test('returns 415 for impossible conversion', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('test content');

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.json`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(415);
    expect(res.body.error.message).toContain('Cannot convert');
  });

  test('handles conversion error gracefully', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}'); // Invalid JSON that will cause parsing error

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.yaml`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(415);
  });
});
