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
} = require('./data/memory');
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
   * @returns Promise<Array<Fragment>>
   */
  static async byUser(ownerId, expand = false) {
    const fragments = await listFragments(ownerId, expand);
    if (expand) {
      logger.debug(`Expanding fragments for user ${ownerId}`);
      return fragments.map((fragmentData) => new Fragment({ ...JSON.parse(fragmentData) }));
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
    const supportedTypes = ['text/plain'];
    return supportedTypes;
  }

  /**
   * Returns true if we know how to work with this content type
   * @param {string} value a Content-Type value (e.g., 'text/plain' or 'text/plain: charset=utf-8')
   * @returns {boolean} true if we support this Content-Type (i.e., type/subtype)
   */
  static isSupportedType(value) {
    // List of supported MIME types
    const supportedTypes = ['text/plain'];

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
