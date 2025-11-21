// Use crypto.randomUUID() to create unique IDs, see:
// https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
const { randomUUID } = require('crypto');
// Use https://www.npmjs.com/package/content-type to create/parse Content-Type headers
const contentType = require('content-type');

// Functions for working with fragment metadata/data using our DB
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');
const logger = require('../logger');

class Fragment {
  constructor({ id, ownerId, created, updated, type, size = 0 }) {
    if (ownerId == null || type == null) {
      throw new Error('ownerId and type are required');
    } else {
      if (!Fragment.isSupportedType(type)) {
        throw new Error('Type is not supported');
      } else {
        if (typeof size !== 'number' || size < 0 || !Number.isInteger(size)) {
          throw new Error('size must be a non-negative integer');
        } else {
          this.id = id || randomUUID();
          this.ownerId = ownerId;
          this.created = created || new Date().toISOString();
          this.updated = updated || new Date().toISOString();
          this.type = type;
          this.size = size;
        }
      }
    }
  }

  /**
   * Get all fragments (id or full) for the given user
   * @param {string} ownerId user's hashed email
   * @param {boolean} expand whether to expand ids to full fragments
   * @returns Promise<Array<string|Object>> array of fragment ids or full fragment metadata
   */
  static async byUser(ownerId, expand = false) {
    const fragments = await listFragments(ownerId, expand);
    if (expand) {
      logger.debug(`Expanding fragments for user ${ownerId}`);
      return fragments.map((fragmentData) => {
        const fragment = new Fragment({ ...fragmentData });
        return {
          id: fragment.id,
          ownerId: fragment.ownerId,
          created: fragment.created,
          updated: fragment.updated,
          type: fragment.type,
          size: fragment.size,
        };
      });
    } else {
      return fragments;
    }
  }

  /**
   * Gets a fragment for the user by the given id.
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<Fragment>
   */
  static async byId(ownerId, id) {
    // TODO
    // TIP: make sure you properly re-create a full Fragment instance after getting from db.
    const newFragment = await readFragment(ownerId, id);
    return new Fragment({ ...newFragment });
  }

  /**
   * Delete the user's fragment data and metadata for the given id
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<void>
   */
  static delete(ownerId, id) {
    return deleteFragment(ownerId, id);
  }

  /**
   * Saves the current fragment (metadata) to the database
   * @returns Promise<void>
   */
  save() {
    this.updated = new Date().toISOString();
    return writeFragment(this);
  }

  /**
   * Gets the fragment's data from the database`
   * @returns Promise<Buffer>
   */
  getData() {
    return readFragmentData(this.ownerId, this.id);
  }

  /**
   * Set's the fragment's data in the database
   * @param {Buffer} data
   * @returns Promise<void>
   */
  async setData(data) {
    if (data == null || typeof data !== 'object' || !Buffer.isBuffer(data)) {
      throw new Error('data must be a non-null Buffer');
    }

    this.size = data.length;
    this.updated = new Date().toISOString();
    await this.save();
    return writeFragmentData(this.ownerId, this.id, data);
  }

  /**
   * Returns the mime type (e.g., without encoding) for the fragment's type:
   * "text/html; charset=utf-8" -> "text/html"
   * @returns {string} fragment's mime type (without encoding)
   */
  get mimeType() {
    const { type } = contentType.parse(this.type);
    return type;
  }

  /**
   * Returns true if this fragment is a text/* mime type
   * @returns {boolean} true if fragment's type is text/*
   */
  get isText() {
    if (!this.mimeType.startsWith('text/')) {
      return false;
    }
    return true;
  }

  /**
   * Returns the formats into which this fragment type can be converted
   * @returns {Array<string>} list of supported mime types
   */
  get formats() {
    const conversionMap = {
      'text/plain': ['text/plain'],
      'text/markdown': ['text/markdown', 'text/html', 'text/plain'],
      'text/html': ['text/html', 'text/plain'],
      'text/csv': ['text/csv', 'text/plain', 'application/json'],
      'application/json': ['application/json', 'application/yaml', 'text/plain'],
      'application/yaml': ['application/yaml', 'text/plain'],
    };

    return conversionMap[this.mimeType] || [];
  }

  /**
   * Returns the MIME type for a given file extension
   * @param {string} ext file extension (e.g., '.txt', '.html')
   * @returns {string|null} MIME type or null if unsupported
   */
  static mimeTypeForExtension(ext) {
    const extensionMap = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.yaml': 'application/yaml',
      '.yml': 'application/yaml',
    };

    return extensionMap[ext] || null;
  }

  /**
   * Converts fragment data to the specified MIME type
   * @param {Buffer} data fragment data
   * @param {string} targetType target MIME type
   * @returns {Buffer} converted data
   */
  async convertTo(data, targetType) {
    const sourceType = this.mimeType;

    // If target type is the same as source, no conversion needed
    if (sourceType === targetType) {
      return data;
    }

    // Check if conversion is supported
    if (!this.formats.includes(targetType)) {
      throw new Error(`Cannot convert from ${sourceType} to ${targetType}`);
    }

    const text = data.toString();

    // Handle conversions
    switch (sourceType) {
      case 'text/markdown':
        if (targetType === 'text/html') {
          // Simple markdown to HTML conversion (for demo purposes)
          // In real implementation, you'd use a proper markdown parser
          const html = text
            .replace(/^# (.*)/gm, '<h1>$1</h1>')
            .replace(/^## (.*)/gm, '<h2>$1</h2>')
            .replace(/^### (.*)/gm, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
          return Buffer.from(html);
        }
        break;

      case 'text/csv':
        if (targetType === 'application/json') {
          // Simple CSV to JSON conversion (for demo purposes)
          const lines = text.trim().split('\n');
          const headers = lines[0].split(',');
          const result = lines.slice(1).map((line) => {
            const values = line.split(',');
            const obj = {};
            headers.forEach((header, index) => {
              obj[header.trim()] = values[index]?.trim() || '';
            });
            return obj;
          });
          return Buffer.from(JSON.stringify(result, null, 2));
        }
        break;

      case 'application/json':
        if (targetType === 'application/yaml') {
          // Simple JSON to YAML conversion (for demo purposes)
          const obj = JSON.parse(text);
          const yaml = JSON.stringify(obj, null, 2)
            .replace(/[{}]/g, '')
            .replace(/"/g, '')
            .replace(/,/g, '')
            .trim();
          return Buffer.from(yaml);
        }
        break;
    }

    // Default conversion to text/plain (just return as-is)
    if (targetType === 'text/plain') {
      return data;
    }

    throw new Error(`Conversion from ${sourceType} to ${targetType} not implemented`);
  }

  /**
   * Returns true if we know how to work with this content type
   * @param {string} value a Content-Type value (e.g., 'text/plain' or 'text/plain: charset=utf-8')
   * @returns {boolean} true if we support this Content-Type (i.e., type/subtype)
   */
  static isSupportedType(value) {
    // List of supported MIME types
    const supportedTypes = [
      'text/plain',
      'text/markdown',
      'text/html',
      'text/csv',
      'application/json',
      'application/yaml',
    ];

    // Parse the content type to get just the media type (without charset)
    try {
      const { type } = contentType.parse(value);
      return supportedTypes.includes(type);
    } catch {
      // If parsing fails, return false
      return false;
    }
  }
}

module.exports.Fragment = Fragment;
