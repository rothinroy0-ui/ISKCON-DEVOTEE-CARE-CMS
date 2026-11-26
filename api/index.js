const { getApp } = require('../server/index');

module.exports = async (req, res) => {
  const app = await getApp();
  return app(req, res);
};
