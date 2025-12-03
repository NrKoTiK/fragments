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

  // Comprehensive conversion tests
  test('converts JSON to YAML with .yaml extension', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send('{"name": "test", "value": 123}');

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.yaml`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/yaml');
    expect(res.text).toContain('name');
    expect(res.text).toContain('test');
  });

  test('converts JSON to plain text with .txt extension', async () => {
    const jsonData = '{"key": "value"}';
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send(jsonData);

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.txt`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toBe(jsonData);
  });

  test('converts CSV to JSON with .json extension', async () => {
    const csvData = 'name,age\nAlice,30\nBob,25';
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/csv')
      .send(csvData);

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.json`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const json = JSON.parse(res.text);
    expect(json).toBeInstanceOf(Array);
    expect(json[0]).toHaveProperty('name', 'Alice');
    expect(json[0]).toHaveProperty('age', '30');
  });

  test('converts HTML to plain text with .txt extension', async () => {
    const htmlData = '<h1>Title</h1><p>Content</p>';
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/html')
      .send(htmlData);

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.txt`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toBe(htmlData);
  });

  test('converts PNG image to JPEG with .jpg extension', async () => {
    const pngData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
      0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
      0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'image/png')
      .send(pngData);

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.jpg`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.body[0]).toBe(0xff);
    expect(res.body[1]).toBe(0xd8);
  });

  test('converts PNG image to WebP with .webp extension', async () => {
    const pngData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
      0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
      0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'image/png')
      .send(pngData);

    const fragmentId = postRes.body.fragment.id;

    const res = await request(app)
      .get(`/v1/fragments/${fragmentId}.webp`)
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/webp');
    // WebP starts with RIFF
    expect(res.body[0]).toBe(0x52);
    expect(res.body[1]).toBe(0x49);
  });
});
