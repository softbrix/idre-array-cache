const assert = require('assert');
const IdreCache = require('..');

const MIN_TIME = 946684799000;
const MAX_TIME = 33149740506000;
function nextVal() {
  return MIN_TIME + Math.floor(MAX_TIME * Math.random());
}

const DELAY = 50;
describe('IdreCache with persistance', function () {
  let cache = new IdreCache();
  it('should be ok to open cache', async function () {
    await cache.open('./datafile', { delay: DELAY});
    await cache.clear();
  });
  it('should not be ok to open again', async function () {
    try {
      await cache.open('./datafile2');
      assert.fail('Should have trown error');
    } catch (e) {}
  });
  it('should be ok to add multiple numbers', function (done) {
      const ITEMS = 20000;
      const FIRST = nextVal();
      cache.push(FIRST);
      for (var i = 1; i < ITEMS; ++i) {
        cache.push(nextVal());
      }
      setTimeout(async () => {
        let newCache = new IdreCache();
        await newCache.open('./datafile', { delay: DELAY});
        assert.equal(newCache.length, ITEMS)
        assert.equal(FIRST, newCache.slice(0, 1));
        await newCache.close();
        done();
      }, DELAY * 4)
  });
  it('should be ok to clear cache twice', async function () {
    // This way we definately know that the file is removed
    await cache.clear();
    return cache.clear();
  });
  it('should not be ok to close twice', async function () {
    await cache.close();
    try {
      await cache.close();
      assert.fail('Should throw error');
    } catch(e) {

    }
  });
});
