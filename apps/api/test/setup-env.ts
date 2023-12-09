process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://saasforge:saasforge@localhost:5432/saasforge_test?schema=public';
process.env.WEB_ORIGIN = 'http://localhost:5173';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-refresh-secret';
process.env.API_KEY_PEPPER = 'test-api-key-pepper';
process.env.APP_PUBLIC_URL = 'http://localhost:5173';
process.env.API_KEY_RATE_LIMIT = '3';
process.env.API_KEY_RATE_WINDOW_SEC = '60';
process.env.COOKIE_SECURE = 'false';
