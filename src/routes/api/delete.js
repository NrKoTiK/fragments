// src/routes/api/delete.js

const { createSuccessResponse, createErrorResponse } = require('../../response');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

/**
 * Delete a fragment for the current user by id
 */
module.exports = async (req, res) => {
  const { id } = req.params;
  const ownerId = req.user;

  logger.debug({ id, ownerId }, 'Attempting to delete fragment');

  try {
    // Try to get the fragment first to make sure it exists and belongs to this user
    await Fragment.byId(ownerId, id);
    
    // Delete the fragment
    await Fragment.delete(ownerId, id);
    
    logger.info({ id, ownerId }, 'Fragment deleted successfully');
    res.status(200).json(createSuccessResponse());
  } catch (err) {
    logger.warn({ err, id, ownerId }, 'Error deleting fragment');
    res.status(404).json(createErrorResponse(404, 'Fragment not found'));
  }
};
