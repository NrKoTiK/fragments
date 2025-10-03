// tests/unit/getID.test.js

const request = require('supertest');
const app = require('../../src/app');

describe('GET /v1/fragments/:id', () => {
  // Helper function to create a fragment and return its ID
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

  // Test unauthenticated requests
  test('unauthenticated requests are denied', async () => {
    const res = await request(app).get('/v1/fragments/123');

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(401);
    expect(res.body.error.message).toBe('Unauthorized');
  });

  // Test incorrect credentials
  test('incorrect credentials are denied', async () => {
    const res = await request(app)
      .get('/v1/fragments/123')
      .auth('invalid@email.com', 'incorrect_password');

    expect(res.status).toBe(401);
  });

  // Test fragment not found
  test('returns 404 for non-existent fragment ID', async () => {
    const res = await request(app)
      .get('/v1/fragments/non-existent-id')
      .auth(testUser.email, testUser.password);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(404);
    expect(res.body.error.message).toBe('Fragment not found');
  });

  // Test successful fragment retrieval
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

  // Test fragment with charset in content-type
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

  // Test user can only access their own fragments
  test('user cannot access fragments from other users', async () => {
    // Create fragment as user1
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

  // Test malformed fragment ID
  test('returns 404 for malformed fragment ID', async () => {
    const res = await request(app)
      .get('/v1/fragments/invalid-uuid-format')
      .auth(testUser.email, testUser.password);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(404);
  });
});
