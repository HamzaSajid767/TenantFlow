import request from 'supertest';
import { auth, createTestModule, registerUser, resetDatabase } from './helpers';

describe('API keys and invitations (integration)', () => {
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

  it('shows the API key secret once and rejects revoked keys', async () => {
    const owner = await registerUser(ctx.server, { email: 'owner@example.com' });
    const org = await request(ctx.server)
      .post('/organizations')
      .set(auth(owner.accessToken))
      .send({ name: 'Acme' })
      .expect(201);
    const project = await request(ctx.server)
      .post(`/organizations/${org.body.id}/projects`)
      .set(auth(owner.accessToken))
      .send({ name: 'Prod' })
      .expect(201);

    const created = await request(ctx.server)
      .post(`/organizations/${org.body.id}/api-keys`)
      .set(auth(owner.accessToken))
      .send({ name: 'CI', projectId: project.body.id })
      .expect(201);
    expect(created.body.secret).toMatch(/^sk_live_/);
    expect(created.body.keyPrefix).toBeTruthy();

    const listed = await request(ctx.server)
      .get(`/organizations/${org.body.id}/api-keys`)
      .set(auth(owner.accessToken))
      .expect(200);
    expect(listed.body[0].secret).toBeUndefined();

    await request(ctx.server)
      .post('/v1/events')
      .set({ Authorization: `Bearer ${created.body.secret}` })
      .send({ type: 'user.signup', payload: { plan: 'pro' } })
      .expect(201);

    await request(ctx.server)
      .delete(`/organizations/${org.body.id}/api-keys/${created.body.id}`)
      .set(auth(owner.accessToken))
      .expect(200);

    const revoked = await request(ctx.server)
      .post('/v1/events')
      .set({ Authorization: `Bearer ${created.body.secret}` })
      .send({ type: 'user.signup' })
      .expect(401);
    expect(revoked.body.code).toBe('API_KEY_REVOKED');
  });

  it('prevents duplicate pending invitations', async () => {
    const owner = await registerUser(ctx.server, { email: 'owner@example.com' });
    const org = await request(ctx.server)
      .post('/organizations')
      .set(auth(owner.accessToken))
      .send({ name: 'Acme' })
      .expect(201);

    await request(ctx.server)
      .post(`/organizations/${org.body.id}/invitations`)
      .set(auth(owner.accessToken))
      .send({ email: 'dev@example.com', role: 'DEVELOPER' })
      .expect(201);

    const duplicate = await request(ctx.server)
      .post(`/organizations/${org.body.id}/invitations`)
      .set(auth(owner.accessToken))
      .send({ email: 'dev@example.com', role: 'ADMIN' })
      .expect(409);
    expect(duplicate.body.code).toBe('CONFLICT');
  });

  it('returns 429 when an API key exceeds the rate limit', async () => {
    const owner = await registerUser(ctx.server, { email: 'owner@example.com' });
    const org = await request(ctx.server)
      .post('/organizations')
      .set(auth(owner.accessToken))
      .send({ name: 'Acme' })
      .expect(201);
    const project = await request(ctx.server)
      .post(`/organizations/${org.body.id}/projects`)
      .set(auth(owner.accessToken))
      .send({ name: 'Prod' })
      .expect(201);
    const created = await request(ctx.server)
      .post(`/organizations/${org.body.id}/api-keys`)
      .set(auth(owner.accessToken))
      .send({ name: 'CI', projectId: project.body.id })
      .expect(201);

    await request(ctx.server)
      .post('/v1/events')
      .set({ Authorization: `Bearer ${created.body.secret}` })
      .send({ type: 'a' })
      .expect(201);
    await request(ctx.server)
      .post('/v1/events')
      .set({ Authorization: `Bearer ${created.body.secret}` })
      .send({ type: 'b' })
      .expect(201);
    await request(ctx.server)
      .post('/v1/events')
      .set({ Authorization: `Bearer ${created.body.secret}` })
      .send({ type: 'c' })
      .expect(201);
    const limited = await request(ctx.server)
      .post('/v1/events')
      .set({ Authorization: `Bearer ${created.body.secret}` })
      .send({ type: 'd' })
      .expect(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
  });
});
