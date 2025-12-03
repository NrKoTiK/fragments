// tests/unit/put.test.js
const request = require('supertest');
const app = require('../../src/app');
//const hash = require('../../src/hash');

describe('PUT /v1/fragments/:id', () => {
  test('unauthenticated requests are denied', async () => {
    const res = await request(app)
      .put('/v1/fragments/123')
      .set('Content-Type', 'text/plain')
      .send('updated content');

    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(401);
    expect(res.body.error.message).toBe('Unauthorized');
  });

  test('incorrect credentials are denied', async () => {
    const res = await request(app)
      .put('/v1/fragments/123')
      .auth('invalid@email.com', 'incorrect_password')
      .set('Content-Type', 'text/plain')
      .send('updated content');

    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(401);
    expect(res.body.error.message).toBe('Unauthorized');
  });

  test('updating a non-existent fragment returns 404', async () => {
    const res = await request(app)
      .put('/v1/fragments/nonexistent-id')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('updated content');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');
  });

  test('authenticated user can update their own fragment', async () => {
    // First create a fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('original content');

    expect(postRes.status).toBe(201);
    const fragmentId = postRes.body.fragment.id;
    const originalCreated = postRes.body.fragment.created;

    // Wait a bit to ensure updated timestamp is different
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Update the fragment
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('updated content');

    expect(putRes.status).toBe(200);
    expect(putRes.body.status).toBe('ok');
    expect(putRes.body.fragment.id).toBe(fragmentId);
    expect(putRes.body.fragment.type).toBe('text/plain');
    expect(putRes.body.fragment.size).toBe('updated content'.length);
    expect(putRes.body.fragment.created).toBe(originalCreated);
    expect(putRes.body.fragment.updated).not.toBe(originalCreated);

    // Verify the content was actually updated
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1');

    expect(getRes.status).toBe(200);
    expect(getRes.text).toBe('updated content');
  });

  test('cannot change fragment type on update', async () => {
    // Create a text/plain fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('original text');

    expect(postRes.status).toBe(201);
    const fragmentId = postRes.body.fragment.id;

    // Try to update with different content type
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/markdown')
      .send('# Markdown content');

    expect(putRes.status).toBe(400);
    expect(putRes.body.status).toBe('error');
    expect(putRes.body.error.message).toContain('Cannot change fragment type');
  });

  test("user cannot update another user's fragment", async () => {
    // User1 creates a fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('user1 content');

    expect(postRes.status).toBe(201);
    const fragmentId = postRes.body.fragment.id;

    // User2 tries to update it
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth('user2@email.com', 'password2')
      .set('Content-Type', 'text/plain')
      .send('user2 content');

    expect(putRes.status).toBe(404);
    expect(putRes.body.status).toBe('error');
  });

  test('returns 415 for unsupported content type', async () => {
    // Create a fragment first
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('original');

    const fragmentId = postRes.body.fragment.id;

    // Try to update with unsupported type
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/octet-stream')
      .send('binary data');

    expect(putRes.status).toBe(415);
    expect(putRes.body.status).toBe('error');
    expect(putRes.body.error.message).toMatch('Unsupported Content-Type');
  });

  test('can update fragment with empty content', async () => {
    // Create a fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('original content');

    const fragmentId = postRes.body.fragment.id;

    // Update with empty content
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('');

    expect(putRes.status).toBe(200);
    expect(putRes.body.fragment.size).toBe(0);

    // Verify empty content
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1');

    expect(getRes.status).toBe(200);
    expect(getRes.text).toBe('');
  });

  test('can update JSON fragment', async () => {
    const originalData = { name: 'original', value: 1 };
    const updatedData = { name: 'updated', value: 2, extra: true };

    // Create JSON fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(originalData));

    const fragmentId = postRes.body.fragment.id;

    // Update JSON fragment
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(updatedData));

    expect(putRes.status).toBe(200);
    expect(putRes.body.fragment.size).toBe(JSON.stringify(updatedData).length);

    // Verify updated content
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1');

    expect(getRes.status).toBe(200);
    expect(JSON.parse(getRes.text)).toEqual(updatedData);
  });

  test('can update markdown fragment', async () => {
    // Create markdown fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/markdown')
      .send('# Original');

    const fragmentId = postRes.body.fragment.id;

    // Update markdown
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/markdown')
      .send('# Updated\n\n## With more content');

    expect(putRes.status).toBe(200);
    expect(putRes.body.fragment.type).toBe('text/markdown');

    // Verify content
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1');

    expect(getRes.text).toBe('# Updated\n\n## With more content');
  });

  test('can update image fragment', async () => {
    // Create a simple PNG buffer
    const originalPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52,
    ]);

    const updatedPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    ]);

    // Create image fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'image/png')
      .send(originalPng);

    const fragmentId = postRes.body.fragment.id;

    // Update image
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'image/png')
      .send(updatedPng);

    expect(putRes.status).toBe(200);
    expect(putRes.body.fragment.size).toBe(updatedPng.length);

    // Verify updated binary content
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1');

    expect(getRes.status).toBe(200);
    expect(Buffer.compare(getRes.body, updatedPng)).toBe(0);
  });

  test('updated timestamp changes but created timestamp stays the same', async () => {
    // Create fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('original');

    const fragmentId = postRes.body.fragment.id;
    const created = postRes.body.fragment.created;
    const initialUpdated = postRes.body.fragment.updated;

    // Wait to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Update fragment
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('updated');

    expect(putRes.body.fragment.created).toBe(created);
    expect(putRes.body.fragment.updated).not.toBe(initialUpdated);
    expect(new Date(putRes.body.fragment.updated).getTime()).toBeGreaterThan(
      new Date(initialUpdated).getTime()
    );
  });
});
