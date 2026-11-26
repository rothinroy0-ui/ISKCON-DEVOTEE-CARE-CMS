const { getApp } = require('../server/index');

module.exports = async (req, res) => {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error('Vercel serverless error:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err?.message || 'Server initialization failed',
      });
    }
  }
};
