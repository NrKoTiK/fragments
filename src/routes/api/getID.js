// src/routes/api/getID.js

const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const logger = require('../../logger');
const path = require('path');

module.exports = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(createErrorResponse(401, 'Unauthorized'));
    }

    const fullId = req.params.id;
    
    // Parse the ID and extension
    const ext = path.extname(fullId);
    const fragmentId = ext ? fullId.slice(0, -ext.length) : fullId;
    
    // Get the fragment
    let fragment;
    try {
      fragment = await Fragment.byId(req.user, fragmentId);
    } catch {
      logger.warn(`Fragment ${fragmentId} not found for user ${req.user}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Get fragment data
    let fragmentData = await fragment.getData();
    let contentType = fragment.type;

    // Handle format conversion if extension is provided
    if (ext) {
      const targetType = Fragment.mimeTypeForExtension(ext);
      
      if (!targetType) {
        logger.warn(`Unsupported extension: ${ext}`);
        return res.status(415).json(createErrorResponse(415, `Unsupported file extension: ${ext}`));
      }
      
      // Check if conversion is possible
      if (!fragment.formats.includes(targetType)) {
        logger.warn(`Cannot convert ${fragment.type} to ${targetType}`);
        return res.status(415).json(
          createErrorResponse(415, `Cannot convert ${fragment.type} to ${targetType}`)
        );
      }
      
      try {
        fragmentData = await fragment.convertTo(fragmentData, targetType);
        contentType = targetType;
        logger.info(`Converted fragment ${fragmentId} from ${fragment.type} to ${targetType}`);
      } catch (conversionError) {
        logger.error(`Conversion error: ${conversionError.message}`);
        return res.status(415).json(
          createErrorResponse(415, `Cannot convert fragment: ${conversionError.message}`)
        );
      }
    }

    res.set('Content-Type', contentType);
    res.status(200).send(fragmentData);
  } catch (error) {
    logger.error('Error getting fragment by ID:', error);
    res.status(500).json(createErrorResponse(500, 'Unable to get fragment'));
  }
};
