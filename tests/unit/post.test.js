// tests/unit/post.test.js
const request = require('supertest');
const app = require('../../src/app');
const hash = require('../../src/hash');

describe('POST /v1/fragments', () => {
  // Test unauthenticated requests
  test('unauthenticated requests are denied', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .send('test fragment content');

    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(401);
    expect(res.body.error.message).toBe('Unauthorized');
  });

  // Test incorrect credentials
  test('incorrect credentials are denied', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('invalid@email.com', 'incorrect_password')
      .set('Content-Type', 'text/plain')
      .send('test fragment content');

    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(401);
    expect(res.body.error.message).toBe('Unauthorized');
  });

  // Test authenticated user can create a plain text fragment
  test('authenticated users can create a plain text fragment', async () => {
    const fragmentData = 'This is a plain text fragment';
    const expectedOwnerId = hash('user1@email.com');

    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send(fragmentData);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');
    const fragment = res.body.fragment;
    expect(fragment).toHaveProperty('id');
    expect(fragment).toHaveProperty('ownerId');
    expect(fragment).toHaveProperty('created');
    expect(fragment).toHaveProperty('updated');
    expect(fragment).toHaveProperty('type');
    expect(fragment).toHaveProperty('size');
    expect(fragment.id).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    );
    expect(fragment.ownerId).toBe(expectedOwnerId);
    expect(fragment.type).toBe('text/plain');
    expect(fragment.size).toBe(fragmentData.length);
    expect(new Date(fragment.created)).toBeInstanceOf(Date);
    expect(new Date(fragment.updated)).toBeInstanceOf(Date);
    const createdTime = new Date(fragment.created).getTime();
    const updatedTime = new Date(fragment.updated).getTime();
    const timeDifference = Math.abs(updatedTime - createdTime);

    expect(timeDifference).toBeLessThanOrEqual(100);
  });

  // Test response includes Location header with full URL
  test('response includes Location header with full URL', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('test content');

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.headers.location).toBeDefined();
    // Validate it's a full URL (with protocol and host)
    expect(res.headers.location).toContain(`/v1/fragments/${res.body.fragment.id}`);
  });

  // Test unsupported content type returns error
  test('unsupported content type returns 415 error', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      // to make sure the content type is not some video or image (reads content type in binary)
      .set('Content-Type', 'application/octet-stream')
      .send('binary data');

    expect(res.status).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(415);
    expect(res.body.error.message).toMatch('Unsupported Content-Type');
  });

  // Test that application/json content type works
  test('authenticated users can create an application/json fragment', async () => {
    const fragmentData = '{"key": "value"}';
    const expectedOwnerId = hash('user1@email.com');

    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send(fragmentData);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');
    const fragment = res.body.fragment;
    expect(fragment.ownerId).toBe(expectedOwnerId);
    expect(fragment.type).toBe('application/json');
    expect(fragment.size).toBe(fragmentData.length);
  });
});
