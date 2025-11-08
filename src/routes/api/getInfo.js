// src/routes/api/getInfo.js

const { Fragment } = require('../../model/fragment');
const { createErrorResponse, createSuccessResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const fragmentId = req.params.id;
    
    // Get the fragment
    let fragment;
    try {
      fragment = await Fragment.byId(req.user, fragmentId);
    } catch {
      logger.warn(`Fragment ${fragmentId} not found for user ${req.user}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Return fragment metadata
    const fragmentInfo = {
      id: fragment.id,
      ownerId: fragment.ownerId,
      created: fragment.created,
      updated: fragment.updated,
      type: fragment.type,
      size: fragment.size,
    };

    logger.info(`Retrieved metadata for fragment ${fragmentId} for user ${req.user}`);
    res.status(200).json(createSuccessResponse({ fragment: fragmentInfo }));
  } catch (error) {
    logger.error('Error getting fragment info:', error);
    res.status(500).json(createErrorResponse(500, 'Unable to get fragment info'));
  }
};