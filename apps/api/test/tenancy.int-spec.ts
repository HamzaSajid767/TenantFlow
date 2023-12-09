import request from 'supertest';
import { auth, createTestModule, registerUser, resetDatabase } from './helpers';

describe('Organizations and RBAC (integration)', () => {
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

  it('isolates tenants: user A cannot read org B projects', async () => {
    const userA = await registerUser(ctx.server, { email: 'a@example.com' });
    const userB = await registerUser(ctx.server, { email: 'b@example.com' });

    const orgA = await request(ctx.server)
      .post('/organizations')
      .set(auth(userA.accessToken))
      .send({ name: 'Org A' })
      .expect(201);
    const orgB = await request(ctx.server)
      .post('/organizations')
      .set(auth(userB.accessToken))
      .send({ name: 'Org B' })
      .expect(201);

    await request(ctx.server)
      .post(`/organizations/${orgB.body.id}/projects`)
      .set(auth(userB.accessToken))
      .send({ name: 'Secret' })
      .expect(201);

    const denied = await request(ctx.server)
      .get(`/organizations/${orgB.body.id}/projects`)
      .set(auth(userA.accessToken))
      .expect(403);
    expect(denied.body.code).toBe('FORBIDDEN');

    const own = await request(ctx.server)
      .get(`/organizations/${orgA.body.id}/projects`)
      .set(auth(userA.accessToken))
      .expect(200);
    expect(own.body.data).toEqual([]);
  });

  it('prevents developers from deleting an organization', async () => {
    const owner = await registerUser(ctx.server, { email: 'owner@example.com' });
    const developer = await registerUser(ctx.server, { email: 'dev@example.com' });
    const org = await request(ctx.server)
      .post('/organizations')
      .set(auth(owner.accessToken))
      .send({ name: 'Acme' })
      .expect(201);

    await ctx.prisma.client.membership.create({
      data: {
        userId: developer.user.id,
        organizationId: org.body.id as string,
        role: 'DEVELOPER',
      },
    });

    const denied = await request(ctx.server)
      .delete(`/organizations/${org.body.id}`)
      .set(auth(developer.accessToken))
      .expect(403);
    expect(denied.body.code).toBe('FORBIDDEN');
  });

  it('returns 404 for cross-tenant project IDs inside a valid org', async () => {
    const userA = await registerUser(ctx.server, { email: 'a@example.com' });
    const userB = await registerUser(ctx.server, { email: 'b@example.com' });
    const orgA = await request(ctx.server)
      .post('/organizations')
      .set(auth(userA.accessToken))
      .send({ name: 'Org A' })
      .expect(201);
    const orgB = await request(ctx.server)
      .post('/organizations')
      .set(auth(userB.accessToken))
      .send({ name: 'Org B' })
      .expect(201);
    const projectB = await request(ctx.server)
      .post(`/organizations/${orgB.body.id}/projects`)
      .set(auth(userB.accessToken))
      .send({ name: 'Other' })
      .expect(201);

    await request(ctx.server)
      .get(`/organizations/${orgA.body.id}/projects/${projectB.body.id}`)
      .set(auth(userA.accessToken))
      .expect(404);
  });
});
