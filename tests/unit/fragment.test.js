const { Fragment } = require('../../src/model/fragment');

// Wait for a certain number of ms (default 50). Feel free to change this value
// if it isn't long enough for your test runs. Returns a Promise.
const wait = async (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

const validTypes = [
  `text/plain`,
  `text/markdown`,
  `text/html`,
  `text/csv`,
  `application/json`,
  `application/yaml`,
];

describe('Fragment class', () => {
  test('common formats are supported', () => {
    validTypes.forEach((format) => expect(Fragment.isSupportedType(format)).toBe(true));
  });

  describe('Fragment()', () => {
    test('ownerId and type are required', () => {
      expect(() => new Fragment({})).toThrow();
    });

    test('ownerId is required', () => {
      expect(() => new Fragment({ type: 'text/plain', size: 1 })).toThrow();
    });

    test('type is required', () => {
      expect(() => new Fragment({ ownerId: '1234', size: 1 })).toThrow();
    });

    test('type can be a simple media type', () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 });
      expect(fragment.type).toEqual('text/plain');
    });

    test('type can include a charset', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain; charset=utf-8',
        size: 0,
      });
      expect(fragment.type).toEqual('text/plain; charset=utf-8');
    });

    test('size gets set to 0 if missing', () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain' });
      expect(fragment.size).toBe(0);
    });

    test('size must be a number', () => {
      expect(() => new Fragment({ ownerId: '1234', type: 'text/plain', size: '1' })).toThrow();
    });

    test('size can be 0', () => {
      expect(() => new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 })).not.toThrow();
    });

    test('size cannot be negative', () => {
      expect(() => new Fragment({ ownerId: '1234', type: 'text/plain', size: -1 })).toThrow();
    });

    test('invalid types throw', () => {
      expect(
        () => new Fragment({ ownerId: '1234', type: 'application/msword', size: 1 })
      ).toThrow();
    });

    test('valid types can be set', () => {
      validTypes.forEach((format) => {
        const fragment = new Fragment({ ownerId: '1234', type: format, size: 1 });
        expect(fragment.type).toEqual(format);
      });
    });

    test('fragments have an id', () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 1 });
      expect(fragment.id).toMatch(
        /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/
      );
    });

    test('fragments use id passed in if present', () => {
      const fragment = new Fragment({
        id: 'id',
        ownerId: '1234',
        type: 'text/plain',
        size: 1,
      });
      expect(fragment.id).toEqual('id');
    });

    test('fragments get a created datetime string', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain',
        size: 1,
      });
      expect(Date.parse(fragment.created)).not.toBeNaN();
    });

    test('fragments get an updated datetime string', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain',
        size: 1,
      });
      expect(Date.parse(fragment.updated)).not.toBeNaN();
    });
  });

  describe('isSupportedType()', () => {
    test('common text types are supported, with and without charset', () => {
      expect(Fragment.isSupportedType('text/plain')).toBe(true);
      expect(Fragment.isSupportedType('text/plain; charset=utf-8')).toBe(true);
      expect(Fragment.isSupportedType('text/markdown')).toBe(true);
      expect(Fragment.isSupportedType('text/html')).toBe(true);
      expect(Fragment.isSupportedType('text/csv')).toBe(true);
      expect(Fragment.isSupportedType('application/json')).toBe(true);
      expect(Fragment.isSupportedType('application/yaml')).toBe(true);
    });

    test('image types are supported', () => {
      expect(Fragment.isSupportedType('image/png')).toBe(true);
      expect(Fragment.isSupportedType('image/jpeg')).toBe(true);
      expect(Fragment.isSupportedType('image/webp')).toBe(true);
      expect(Fragment.isSupportedType('image/gif')).toBe(true);
      expect(Fragment.isSupportedType('image/avif')).toBe(true);
    });

    test('other types are not supported', () => {
      expect(Fragment.isSupportedType('application/octet-stream')).toBe(false);
      expect(Fragment.isSupportedType('application/msword')).toBe(false);
      expect(Fragment.isSupportedType('audio/webm')).toBe(false);
      expect(Fragment.isSupportedType('video/ogg')).toBe(false);
    });
  });

  describe('mimeType, isText', () => {
    test('mimeType returns the mime type without charset', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain; charset=utf-8',
        size: 0,
      });
      expect(fragment.type).toEqual('text/plain; charset=utf-8');
      expect(fragment.mimeType).toEqual('text/plain');
    });

    test('mimeType returns the mime type if charset is missing', () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 });
      expect(fragment.type).toEqual('text/plain');
      expect(fragment.mimeType).toEqual('text/plain');
    });

    test('isText return expected results', () => {
      // Text fragment
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain; charset=utf-8',
        size: 0,
      });
      expect(fragment.isText).toBe(true);
    });
  });

  describe('formats', () => {
    test('formats returns the expected result for plain text', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain; charset=utf-8',
        size: 0,
      });
      expect(fragment.formats).toEqual(['text/plain']);
    });

    test('formats returns expected results for markdown', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/markdown',
        size: 0,
      });
      expect(fragment.formats).toEqual(['text/markdown', 'text/html', 'text/plain']);
    });

    test('formats returns expected results for json', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'application/json',
        size: 0,
      });
      expect(fragment.formats).toEqual(['application/json', 'application/yaml', 'text/plain']);
    });

    test('formats returns empty array for unsupported types', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain',
        size: 0,
      });
      Object.defineProperty(fragment, 'mimeType', {
        get: () => 'unsupported/type',
      });
      expect(fragment.formats).toEqual([]);
    });
  });

  describe('mimeTypeForExtension()', () => {
    test('returns correct mime types for extensions', () => {
      expect(Fragment.mimeTypeForExtension('.txt')).toBe('text/plain');
      expect(Fragment.mimeTypeForExtension('.html')).toBe('text/html');
      expect(Fragment.mimeTypeForExtension('.json')).toBe('application/json');
      expect(Fragment.mimeTypeForExtension('.yaml')).toBe('application/yaml');
      expect(Fragment.mimeTypeForExtension('.yml')).toBe('application/yaml');
    });

    test('returns null for unsupported extensions', () => {
      expect(Fragment.mimeTypeForExtension('.xyz')).toBe(null);
      expect(Fragment.mimeTypeForExtension('.png')).toBe(null);
    });
  });

  describe('convertTo()', () => {
    test('returns same data if no conversion needed', async () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain',
        size: 0,
      });
      const data = Buffer.from('hello');
      const result = await fragment.convertTo(data, 'text/plain');
      expect(result).toEqual(data);
    });

    test('converts markdown to html', async () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/markdown',
        size: 0,
      });
      const data = Buffer.from('# Hello World\n\nThis is **bold** text.');
      const result = await fragment.convertTo(data, 'text/html');
      expect(result.toString()).toContain('<h1>Hello World</h1>');
      expect(result.toString()).toContain('<strong>bold</strong>');
    });

    test('converts csv to json', async () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/csv',
        size: 0,
      });
      const data = Buffer.from('name,age\nJohn,25\nJane,30');
      const result = await fragment.convertTo(data, 'application/json');
      const parsed = JSON.parse(result.toString());
      expect(parsed).toEqual([
        { name: 'John', age: '25' },
        { name: 'Jane', age: '30' },
      ]);
    });

    test('converts json to yaml', async () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'application/json',
        size: 0,
      });
      const data = Buffer.from('{"name": "John", "age": 25}');
      const result = await fragment.convertTo(data, 'application/yaml');
      expect(result.toString()).toContain('name: John');
      expect(result.toString()).toContain('age: 25');
    });

    test('converts any type to plain text', async () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'application/json',
        size: 0,
      });
      const data = Buffer.from('{"test": "data"}');
      const result = await fragment.convertTo(data, 'text/plain');
      expect(result).toEqual(data);
    });

    test('throws error for unsupported conversion', async () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain',
        size: 0,
      });
      const data = Buffer.from('hello');
      await expect(fragment.convertTo(data, 'application/json')).rejects.toThrow(
        'Cannot convert from text/plain to application/json'
      );
    });

    test('throws error for unimplemented conversion', async () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/markdown',
        size: 0,
      });
      const data = Buffer.from('# test');
      await expect(fragment.convertTo(data, 'unsupported/type')).rejects.toThrow(
        'Cannot convert from text/markdown to unsupported/type'
      );
    });
  });

  describe('save(), getData(), setData(), byId(), byUser(), delete()', () => {
    test('byUser() returns an empty array if there are no fragments for this user', async () => {
      expect(await Fragment.byUser('1234')).toEqual([]);
    });

    test('a fragment can be created and save() stores a fragment for the user', async () => {
      const data = Buffer.from('hello');
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 });
      await fragment.save();
      await fragment.setData(data);

      const fragment2 = await Fragment.byId('1234', fragment.id);
      expect(fragment2).toEqual(fragment);
      expect(await fragment2.getData()).toEqual(data);
    });

    test('save() updates the updated date/time of a fragment', async () => {
      const ownerId = '7777';
      const fragment = new Fragment({ ownerId, type: 'text/plain', size: 0 });
      const modified1 = fragment.updated;
      await wait();
      await fragment.save();
      const fragment2 = await Fragment.byId(ownerId, fragment.id);
      expect(Date.parse(fragment2.updated)).toBeGreaterThan(Date.parse(modified1));
    });

    test('setData() updates the updated date/time of a fragment', async () => {
      const data = Buffer.from('hello');
      const ownerId = '7777';
      const fragment = new Fragment({ ownerId, type: 'text/plain', size: 0 });
      await fragment.save();
      const modified1 = fragment.updated;
      await wait();
      await fragment.setData(data);
      await wait();
      const fragment2 = await Fragment.byId(ownerId, fragment.id);
      expect(Date.parse(fragment2.updated)).toBeGreaterThan(Date.parse(modified1));
    });

    test("a fragment is added to the list of a user's fragments", async () => {
      const data = Buffer.from('hello');
      const ownerId = '5555';
      const fragment = new Fragment({ ownerId, type: 'text/plain', size: 0 });
      await fragment.save();
      await fragment.setData(data);

      expect(await Fragment.byUser(ownerId)).toEqual([fragment.id]);
    });

    test('full fragments are returned when requested for a user', async () => {
      const data = Buffer.from('hello');
      const ownerId = '6666';
      const fragment = new Fragment({ ownerId, type: 'text/plain', size: 0 });
      await fragment.save();
      await fragment.setData(data);

      expect(await Fragment.byUser(ownerId, true)).toEqual([fragment]);
    });

    test('setData() throws if not give a Buffer', () => {
      const fragment = new Fragment({ ownerId: '123', type: 'text/plain', size: 0 });
      expect(() => fragment.setData()).rejects.toThrow();
    });

    test('setData() updates the fragment size', async () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 });
      await fragment.save();
      await fragment.setData(Buffer.from('a'));
      expect(fragment.size).toBe(1);

      await fragment.setData(Buffer.from('aa'));
      const { size } = await Fragment.byId('1234', fragment.id);
      expect(size).toBe(2);
    });

    test('a fragment can be deleted', async () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 });
      await fragment.save();
      await fragment.setData(Buffer.from('a'));

      await Fragment.delete('1234', fragment.id);
      expect(() => Fragment.byId('1234', fragment.id)).rejects.toThrow();
    });
  });
});
