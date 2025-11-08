// tests/unit/getInfo.test.js

const request = require('supertest');
const app = require('../../src/app');

describe('GET /v1/fragments/:id/info', () => {
  // Test unauthenticated requests
  test('unauthenticated requests are denied', async () => {
    const res = await request(app).get('/v1/fragments/test-id/info');
    expect(res.statusCode).toBe(401);
  });

  // Test incorrect credentials
  test('incorrect credentials are denied', async () => {
    const res = await request(app)
      .get('/v1/fragments/test-id/info')
      .auth('invalid@email.com', 'incorrect_password');
    expect(res.statusCode).toBe(401);
  });

  // Test getting info for non-existent fragment
  test('returns 404 for non-existent fragment ID', async () => {
    const res = await request(app)
      .get('/v1/fragments/non-existent-id/info')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(404);
    expect(res.body.error.message).toBe('Fragment not found');
  });

  // Test getting info for existing fragment
  test('returns fragment metadata for valid ID', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('This is a test fragment');

    expect(postRes.statusCode).toBe(201);
    const fragmentId = postRes.body.fragment.id;

    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}/info`)
      .auth('user1@email.com', 'password1');

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.status).toBe('ok');
    expect(getRes.body.fragment).toBeDefined();

    const fragment = getRes.body.fragment;
    expect(fragment.id).toBe(fragmentId);
    expect(fragment).toHaveProperty('ownerId');
    expect(fragment).toHaveProperty('created');
    expect(fragment).toHaveProperty('updated');
    expect(fragment.type).toBe('text/plain');
    expect(fragment.size).toBe('This is a test fragment'.length);

    expect(new Date(fragment.created)).toBeInstanceOf(Date);
    expect(new Date(fragment.updated)).toBeInstanceOf(Date);
  });

  // Test getting info for fragment with different content types
  test('returns correct metadata for JSON fragment', async () => {
    const jsonData = '{"message": "hello", "type": "test"}';

    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send(jsonData);

    expect(postRes.statusCode).toBe(201);
    const fragmentId = postRes.body.fragment.id;

    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}/info`)
      .auth('user1@email.com', 'password1');

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.status).toBe('ok');

    const fragment = getRes.body.fragment;
    expect(fragment.id).toBe(fragmentId);
    expect(fragment.type).toBe('application/json');
    expect(fragment.size).toBe(jsonData.length);
  });

  // Test getting info with charset in content type
  test('returns fragment info with charset in content-type', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send('Test content with charset');

    expect(postRes.statusCode).toBe(201);
    const fragmentId = postRes.body.fragment.id;

    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}/info`)
      .auth('user1@email.com', 'password1');

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.status).toBe('ok');

    const fragment = getRes.body.fragment;
    expect(fragment.type).toBe('text/plain');
    expect(fragment.size).toBe('Test content with charset'.length);
  });

  // Test that user cannot access fragments from other users
  test('user cannot access fragment info from other users', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('User1 fragment');

    expect(postRes.statusCode).toBe(201);
    const fragmentId = postRes.body.fragment.id;

    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}/info`)
      .auth('user2@email.com', 'password2');

    expect(getRes.statusCode).toBe(404);
    expect(getRes.body.status).toBe('error');
    expect(getRes.body.error.message).toBe('Fragment not found');
  });
  test('returns 404 for malformed fragment ID', async () => {
    const res = await request(app)
      .get('/v1/fragments/invalid-uuid-format/info')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');
  });
});
