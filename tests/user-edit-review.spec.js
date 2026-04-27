const { test, expect } = require('@playwright/test');
const app = require('../index');

const PORT = process.env.PORT || 5000;
const baseURL = `http://localhost:${PORT}/api/v1`;

test.describe('User Edit Review System Test', () => {
  let server;
  let user1Token;
  let user2Token;
  let campgroundId;
  let bookingId;
  let reviewId;
  const uniqueId = Date.now();

  test.beforeAll(async ({ request }) => {
    server = await new Promise((resolve, reject) => {
      const instance = app.listen(PORT, (err) => {
        if (err) return reject(err);
        resolve(instance);
      });
    });

    // Register and login user1
    const user1Response = await request.post(`${baseURL}/auth/register`, {
      data: {
        name: 'Test User 1',
        email: `testuser1+${uniqueId}@example.com`,
        password: 'password123',
        tel: '0812345678',
        role: 'user',
      },
    });
    expect(user1Response.ok()).toBeTruthy();

    const login1Response = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: `testuser1+${uniqueId}@example.com`,
        password: 'password123',
      },
    });
    expect(login1Response.ok()).toBeTruthy();
    const login1Data = await login1Response.json();
    user1Token = login1Data.token;

    // Register and login user2
    const user2Response = await request.post(`${baseURL}/auth/register`, {
      data: {
        name: 'Test User 2',
        email: `testuser2+${uniqueId}@example.com`,
        password: 'password123',
        tel: '0812345679',
        role: 'user',
      },
    });
    expect(user2Response.ok()).toBeTruthy();

    const login2Response = await request.post(`${baseURL}/auth/login`, {
      data: {
        email: `testuser2+${uniqueId}@example.com`,
        password: 'password123',
      },
    });
    expect(login2Response.ok()).toBeTruthy();
    const login2Data = await login2Response.json();
    user2Token = login2Data.token;

    // Get a campground
    const campgroundsResponse = await request.get(`${baseURL}/campgrounds`);
    expect(campgroundsResponse.ok()).toBeTruthy();
    const campgroundsData = await campgroundsResponse.json();
    expect(Array.isArray(campgroundsData.data)).toBeTruthy();
    expect(campgroundsData.data.length).toBeGreaterThan(0);
    campgroundId = campgroundsData.data[0]._id;

    // Create a booking for user1 with past dates
    const bookingResponse = await request.post(`${baseURL}/campgrounds/${campgroundId}/bookings`, {
      data: {
        bookDate: '2023-01-01',
        bookEndDate: '2023-01-02',
      },
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });
    expect(bookingResponse.ok()).toBeTruthy();
    const bookingData = await bookingResponse.json();
    bookingId = bookingData.data._id;

    const addReviewResponse = await request.post(`${baseURL}/bookings/${bookingId}/review`, {
      data: {
        rating: 4,
        comment: 'Great place!',
      },
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });
    expect(addReviewResponse.ok()).toBeTruthy();
    const reviewData = await addReviewResponse.json();
    reviewId = reviewData.data._id;
  });

  test('Given the user is logged in and has a review When the user edits his review Then the review is updated', async ({ request }) => {
    // Edit the review
    const editResponse = await request.put(`${baseURL}/bookings/${bookingId}/review`, {
      data: {
        rating: 5,
        comment: 'Amazing place!'
      },
      headers: {
        'Authorization': `Bearer ${user1Token}`
      }
    });
    expect(editResponse.ok()).toBeTruthy();
    const editData = await editResponse.json();
    expect(editData.data.rating).toBe(5);
    expect(editData.data.comment).toBe('Amazing place!');
  });

  test.afterAll(async () => {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  test('Given the user is logged in and another user has a review When the user navigates to the review component of the other user Then the user can only view the review and can\'t edit it', async ({ request }) => {
    // Try to edit the review as user2
    const editResponse = await request.put(`${baseURL}/bookings/${bookingId}/review`, {
      data: {
        rating: 1,
        comment: 'Bad place!',
      },
      headers: {
        Authorization: `Bearer ${user2Token}`,
      },
    });
    expect(editResponse.status()).toBe(401); // Unauthorized
  });
});