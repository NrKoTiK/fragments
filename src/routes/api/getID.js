// src/routes/api/getID.js

const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const fullId = req.params.id;
    let fragmentId = fullId;

    let fragment;
    try {
      fragment = await Fragment.byId(req.user, fragmentId);
    } catch {
      logger.warn(`Fragment ${fragmentId} not found for user ${req.user}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    const fragmentData = await fragment.getData();

    res.set('Content-Type', fragment.type);
    res.status(200).send(fragmentData);
  } catch (error) {
    logger.error('Error getting fragment by ID:', error);
    res.status(500).json(createErrorResponse(500, 'Unable to get fragment'));
  }
};
