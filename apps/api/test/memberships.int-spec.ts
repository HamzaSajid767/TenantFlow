import request from 'supertest';
import { sha256 } from '../src/common/crypto/crypto.util';
import { auth, createTestModule, registerUser, resetDatabase } from './helpers';

describe('Memberships and invitations (integration)', () => {
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

  it('prevents a developer from inviting members', async () => {
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
      .post(`/organizations/${org.body.id}/invitations`)
      .set(auth(developer.accessToken))
      .send({ email: 'new@example.com', role: 'DEVELOPER' })
      .expect(403);
    expect(denied.body.code).toBe('FORBIDDEN');
  });

  it('returns a single member by id', async () => {
    const owner = await registerUser(ctx.server, { email: 'owner@example.com' });
    const org = await request(ctx.server)
      .post('/organizations')
      .set(auth(owner.accessToken))
      .send({ name: 'Acme' })
      .expect(201);
    const members = await request(ctx.server)
      .get(`/organizations/${org.body.id}/members`)
      .set(auth(owner.accessToken))
      .expect(200);
    const ownerMembership = (members.body as { id: string }[])[0];
    if (!ownerMembership) {
      throw new Error('expected an owner membership');
    }

    const found = await request(ctx.server)
      .get(`/organizations/${org.body.id}/members/${ownerMembership.id}`)
      .set(auth(owner.accessToken))
      .expect(200);
    expect(found.body.user.email).toBe('owner@example.com');
    expect(found.body.role).toBe('OWNER');
  });

  it('prevents a developer from changing member roles', async () => {
    const owner = await registerUser(ctx.server, { email: 'owner@example.com' });
    const developer = await registerUser(ctx.server, { email: 'dev@example.com' });
    const org = await request(ctx.server)
      .post('/organizations')
      .set(auth(owner.accessToken))
      .send({ name: 'Acme' })
      .expect(201);
    const membership = await ctx.prisma.client.membership.create({
      data: {
        userId: developer.user.id,
        organizationId: org.body.id as string,
        role: 'DEVELOPER',
      },
    });

    const denied = await request(ctx.server)
      .patch(`/organizations/${org.body.id}/members/${membership.id}`)
      .set(auth(developer.accessToken))
      .send({ role: 'OWNER' })
      .expect(403);
    expect(denied.body.code).toBe('FORBIDDEN');
  });

  it('prevents demoting the last owner', async () => {
    const owner = await registerUser(ctx.server, { email: 'owner@example.com' });
    const org = await request(ctx.server)
      .post('/organizations')
      .set(auth(owner.accessToken))
      .send({ name: 'Acme' })
      .expect(201);
    const members = await request(ctx.server)
      .get(`/organizations/${org.body.id}/members`)
      .set(auth(owner.accessToken))
      .expect(200);
    const ownerMembership = (members.body as { id: string; role: string }[]).find(
      (member) => member.role === 'OWNER',
    );
    expect(ownerMembership).toBeTruthy();

    const denied = await request(ctx.server)
      .patch(`/organizations/${org.body.id}/members/${ownerMembership?.id}`)
      .set(auth(owner.accessToken))
      .send({ role: 'ADMIN' })
      .expect(409);
    expect(denied.body.code).toBe('LAST_OWNER');

    const removeDenied = await request(ctx.server)
      .delete(`/organizations/${org.body.id}/members/${ownerMembership?.id}`)
      .set(auth(owner.accessToken))
      .expect(409);
    expect(removeDenied.body.code).toBe('LAST_OWNER');
  });

  it('rejects expired invitations', async () => {
    const owner = await registerUser(ctx.server, { email: 'owner@example.com' });
    const invitee = await registerUser(ctx.server, { email: 'invitee@example.com' });
    const org = await request(ctx.server)
      .post('/organizations')
      .set(auth(owner.accessToken))
      .send({ name: 'Acme' })
      .expect(201);
    const rawToken = 'a'.repeat(64);
    await ctx.prisma.client.invitation.create({
      data: {
        organizationId: org.body.id as string,
        email: 'invitee@example.com',
        role: 'DEVELOPER',
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() - 60_000),
        invitedByUserId: owner.user.id,
        status: 'PENDING',
      },
    });

    const expired = await request(ctx.server)
      .post('/invitations/accept')
      .set(auth(invitee.accessToken))
      .send({ token: rawToken })
      .expect(400);
    expect(expired.body.code).toBe('INVITATION_EXPIRED');
  });
});
