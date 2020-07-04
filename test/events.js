const assert = require('assert');
const IdreCache = require('..');

describe('IdreCache events', function () {
  let cache = new IdreCache();
  it('should trigger on push', function (done) {
      var value = 42;
      cache.addListener('push', (val) => {
          assert.equal(val, value);
          cache.removeAllListeners();
          done();
      });
      cache.push(value);
  });
  it('should be ok to open cache same cache and trigger change events', function () {
    return new Promise(async (done) => {
      await cache.open('./datafile_events', { delay: 0});
      cache.on('change', () => {
          cache.removeAllListeners();
          done();
      });
      // Different cache same file
      let cache3 = new IdreCache();
      await cache3.open('./datafile_events', { delay: 0});
      cache3.push(2);
    });
  });
  it('should be ok to clear cache twice and trigger clear events', function () {
    return new Promise(async (done) => {
      var cnt = 0;
      cache.on('clear', () => {
        if(++cnt == 2) {
          done();
        }
      });
      // This way we definately know that the file is removed
      await cache.clear();
      await cache.clear();
    });
  });
});
