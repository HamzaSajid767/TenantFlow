module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@saasforge/shared$': '<rootDir>/../../packages/shared/src',
    '^@saasforge/database$': '<rootDir>/../../packages/database/src',
  },
};
