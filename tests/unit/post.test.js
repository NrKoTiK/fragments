// tests/unit/post.test.js
const request = require('supertest');
const app = require('../../src/app');
const hash = require('../../src/hash');

describe('POST /v1/fragments', () => {
  test('unauthenticated requests are denied', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'text/plain')
      .send('test fragment content');

    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(401);
    expect(res.body.error.message).toBe('Unauthorized');
  });

  // Test credentials
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

  test('response includes Location header with full URL', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('test content');

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.headers.location).toBeDefined();
    expect(res.headers.location).toContain(`/v1/fragments/${res.body.fragment.id}`);
  });

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

  test('returns 415 for missing Content Type header', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .send('test content');

    expect(res.status).toBe(415);
    expect(res.body.status).toBe('error');
  });

  test('returns 415 for invalid Content-Type header', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'invalid-content-type')
      .send('test content');

    expect(res.status).toBe(415);
    expect(res.body.status).toBe('error');
  });

  test('allows empty request body', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('');

    expect(res.status).toBe(201);
    expect(res.body.fragment.size).toBe(0);
  });

  test('supports all specified content types', async () => {
    const supportedTypes = [
      { type: 'text/plain', data: 'plain text' },
      { type: 'text/markdown', data: '# Markdown' },
      { type: 'text/html', data: '<p>HTML</p>' },
      { type: 'text/csv', data: 'name,value\ntest,123' },
      { type: 'application/json', data: '{"test": "json"}' },
      { type: 'application/yaml', data: 'test: yaml' },
    ];

    for (const { type, data } of supportedTypes) {
      const res = await request(app)
        .post('/v1/fragments')
        .auth('user1@email.com', 'password1')
        .set('Content-Type', type)
        .send(data);

      expect(res.status).toBe(201);
      expect(res.body.fragment.type).toBe(type);
    }
  });
});
