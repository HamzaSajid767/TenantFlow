import request from 'supertest';
import { auth, cookiesOf, createTestModule, registerUser, resetDatabase } from './helpers';

describe('Auth (integration)', () => {
  let ctx: Awaited<ReturnType<typeof createTestModule>>;

  beforeAll(async () => {
    ctx = await createTestModule();
  });

  afterAll(async () => {
    if (ctx) {
      await ctx.app.close();
    }
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  it('registers and returns an access token', async () => {
    const user = await registerUser(ctx.server, { email: 'ada@example.com' });
    expect(user.accessToken).toBeTruthy();
    const me = await request(ctx.server).get('/auth/me').set(auth(user.accessToken)).expect(200);
    expect(me.body.email).toBe('ada@example.com');
  });

  it('rejects duplicate emails', async () => {
    await registerUser(ctx.server, { email: 'ada@example.com' });
    const response = await request(ctx.server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'supersecret1', name: 'Ada' })
      .expect(409);
    expect(response.body.code).toBe('EMAIL_TAKEN');
  });

  it('logs in with generic errors for bad credentials', async () => {
    await registerUser(ctx.server, { email: 'ada@example.com' });
    const response = await request(ctx.server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'wrong-password' })
      .expect(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates refresh tokens and rejects reuse', async () => {
    const created = await request(ctx.server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'supersecret1', name: 'Ada' })
      .expect(201);
    const firstCookie = cookiesOf(created);

    const refreshed = await request(ctx.server).post('/auth/refresh').set('Cookie', firstCookie).expect(201);
    expect(refreshed.body.accessToken).toBeTruthy();

    const reused = await request(ctx.server).post('/auth/refresh').set('Cookie', firstCookie).expect(401);
    expect(reused.body.code).toBe('UNAUTHENTICATED');
  });

  it('logs out and revokes the refresh family', async () => {
    const created = await request(ctx.server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'supersecret1', name: 'Ada' })
      .expect(201);

    await request(ctx.server)
      .post('/auth/logout')
      .set(auth(created.body.accessToken as string))
      .set('Cookie', cookiesOf(created))
      .expect(201);

    await request(ctx.server)
      .post('/auth/refresh')
      .set('Cookie', cookiesOf(created))
      .expect(401);
  });
});
