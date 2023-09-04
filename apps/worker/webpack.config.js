module.exports = (options) => ({
  ...options,
  externals: {
    ...(typeof options.externals === 'object' && !Array.isArray(options.externals)
      ? options.externals
      : {}),
    pg: 'commonjs pg',
    ioredis: 'commonjs ioredis',
    bullmq: 'commonjs bullmq',
  },
});
