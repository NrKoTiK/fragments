// src/routes/api/get.js
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse } = require('../../response');

module.exports = async (req, res) => {
  const expand = req.query.expand == 'true';

  const frags = await Fragment.byUser(req.user, expand);
  res.status(200).json(createSuccessResponse({ fragments: frags }));
};
