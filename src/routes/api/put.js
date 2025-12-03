const { Fragment } = require('../../model/fragment');
const contentType = require('content-type');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

module.exports = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Unauthenticated request to update fragment');
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    // Check if body was parsed (Buffer means supported type, {} means unsupported)
    if (!Buffer.isBuffer(req.body)) {
      const contentTypeHeader = req.get('Content-Type') || 'unknown';
      logger.error(`Unsupported Content-Type: ${contentTypeHeader}`);
      return res
        .status(415)
        .json(createErrorResponse(415, `Unsupported Content-Type: ${contentTypeHeader}`));
    }

    const fullContentType = req.get('Content-Type');
    // Parse content type
    const { type } = contentType.parse(fullContentType);

    // validate content type is supported
    if (!Fragment.isSupportedType(type)) {
      logger.error(`Unsupported Content-Type: ${type}`);
      return res.status(415).json(createErrorResponse(415, `Unsupported Content-Type: ${type}`));
    }

    // get the fragmnet by id
    const { id } = req.params;
    let fragment;
    try {
      fragment = await Fragment.byId(req.user, id);
    } catch (err) {
      logger.warn(`Fragment not found: ${id}`, { err });
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Check if the mime type matches the existing fragmentss mime type
    if (fragment.mimeType !== type) {
      logger.error(
        `Cannot change fragment type from ${fragment.mimeType} to ${type} for fragment ${id}`
      );
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            `Cannot change fragment type from ${fragment.mimeType} to ${type}`
          )
        );
    }

    await fragment.setData(req.body);

    logger.info(`Updated fragment ${id} for user ${req.user}`);

    // Return success response with updated fragment metadata
    res.status(200).json(
      createSuccessResponse({
        fragment: {
          id: fragment.id,
          ownerId: fragment.ownerId,
          created: fragment.created,
          updated: fragment.updated,
          type: fragment.type,
          size: fragment.size,
        },
      })
    );
  } catch (err) {
    logger.error({ err }, 'Error updating fragment');
    res.status(500).json(createErrorResponse(500, 'Unable to update fragment'));
  }
};
