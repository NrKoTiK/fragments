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

  test('authenticated users can create image fragments', async () => {
    // Create a simple PNG buffer (1x1 red pixel)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d,
      0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
      0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'image/png')
      .send(pngBuffer);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment.type).toBe('image/png');
    expect(res.body.fragment.size).toBe(pngBuffer.length);
  });

  test('supports all image types', async () => {
    // Create minimal binary data for testing
    const imageBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    
    const imageTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/avif',
    ];

    for (const type of imageTypes) {
      const res = await request(app)
        .post('/v1/fragments')
        .auth('user1@email.com', 'password1')
        .set('Content-Type', type)
        .send(imageBuffer);

      expect(res.status).toBe(201);
      expect(res.body.fragment.type).toBe(type);
      expect(res.body.fragment.size).toBe(imageBuffer.length);
    }
  });
});
