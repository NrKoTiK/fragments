const { Fragment } = require('../../model/fragment');
const contentType = require('content-type');
const logger = require('../../logger');
const { createSuccessResponse, createErrorResponse } = require('../../response');

module.exports = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Unauthenticated request to create fragment');
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

    // Parse content type
    const { type } = contentType.parse(req.get('Content-Type'));

    // Create new fragment
    const fragment = new Fragment({
      ownerId: req.user,
      type: type,
    });

    // Save fragment metadata and data
    await fragment.save();
    await fragment.setData(req.body);

    // Create Location header URL
    const apiUrl = process.env.API_URL || `http://${req.headers.host}`;
    const location = `${apiUrl}/v1/fragments/${fragment.id}`;

    logger.info(`Created fragment ${fragment.id} for user ${req.user}`);

    // Return success response
    res
      .status(201)
      .location(location)
      .json(
        createSuccessResponse({
          fragment: {
            id: fragment.id,
            ownerId: fragment.ownerId,
            created: fragment.created,
            updated: fragment.updated,
            type: fragment.type,
            size: fragment.size,
          },
          location: location,
        })
      );
  } catch (error) {
    logger.error('Error creating fragment:', error);
    res.status(500).json(createErrorResponse(500, 'Unable to create fragment'));
  }
};
