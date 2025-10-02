const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
} = require('../../src/model/data/memory');

describe('Memory Tests', () => {
  const fragment = {
    id: 'test-fragment',
    ownerId: 'user123',
  };

  test('writeFragment', async () => {
    const result = writeFragment(fragment);
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBeUndefined();
    expect(typeof result).toBe('object');
  });

  test('ReadFragment', async () => {
    const result = readFragment(fragment.ownerId, fragment.id);
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toEqual(fragment);
    expect(typeof result).toBe('object');
  });

  test('writeFragmentData', async () => {
    const buffer = Buffer.from('ts ass');
    const result = writeFragmentData(fragment.ownerId, fragment.id, buffer);
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBeUndefined();
    expect(typeof result).toBe('object');
  });

  test('readFragmentData', async () => {
    const result = readFragmentData(fragment.ownerId, fragment.id);
    expect(result).toBeInstanceOf(Promise);
    const data = await result;
    expect(data).toBeInstanceOf(Buffer);
    expect(data.toString()).toBe('ts ass');
    expect(typeof result).toBe('object');
  });
});
