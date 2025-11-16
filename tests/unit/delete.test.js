// tests/unit/delete.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('DELETE /v1/fragments/:id', () => {
  test('unauthenticated requests are denied', async () => {
    const res = await request(app).delete('/v1/fragments/test-id');
    expect(res.statusCode).toBe(401);
  });

  test('incorrect credentials are denied', async () => {
    const res = await request(app)
      .delete('/v1/fragments/test-id')
      .auth('invalid@email.com', 'incorrect_password');
    expect(res.statusCode).toBe(401);
  });

  test('deleting a non-existent fragment returns 404', async () => {
    const res = await request(app)
      .delete('/v1/fragments/nonexistent-id')
      .auth('user1@email.com', 'password1');
    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
  });

  test('authenticated user can delete their own fragment', async () => {
    // First create a fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('This is test fragment');

    expect(postRes.statusCode).toBe(201);
    const fragmentId = postRes.body.fragment.id;

    // Delete the fragment
    const deleteRes = await request(app)
      .delete(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1');

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.status).toBe('ok');

    // Try to get the deleted fragment - should return 404
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .auth('user1@email.com', 'password1');

    expect(getRes.statusCode).toBe(404);
  });

  test("user cannot delete another user's fragment", async () => {
    // User 1 creates a fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('User 1 fragment');

    expect(postRes.statusCode).toBe(201);
    const fragmentId = postRes.body.fragment.id;

    // User 2 tries to delete User 1's fragment
    const deleteRes = await request(app)
      .delete(`/v1/fragments/${fragmentId}`)
      .auth('user2@email.com', 'password2');

    expect(deleteRes.statusCode).toBe(404);
    expect(deleteRes.body.status).toBe('error');
  });
});
