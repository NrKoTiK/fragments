const request = require('supertest');

const app = require('../../src/app');

describe('404 Middleware', () => {
  test('responds with 404 JSON message when route is not found', async () => {
    const res = await request(app).get('/nonexistent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      status: 'error',
      error: {
        message: 'not found',
        code: 404,
      },
    });
  });
  // Might add more tests later... for app.js (such as for 500 error-handling middleware)
});
