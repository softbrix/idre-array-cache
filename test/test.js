const assert = require('assert');
const IdreCache = require('..');

describe('IdreCache', function () {
  describe('add', function () {
    let cache = new IdreCache();
    it('should throw error if wrong type is added', function () {
      try {
        cache.add({'a' : 'Object not allowed'});
        fail('Should throw error');
      } catch (e) {
        assert.ok(e, "Error must be defined");
      }
    });
    it('should be ok to add number', function () {
        var size = cache.length;
        cache.push(1);
        cache.push(2);
        assert.equal(cache.length, size + 2, "Two new elements should be added")
    });
  });
  describe('length', function () {
    let cache = new IdreCache();
    it('should be 0 when initialized', function () {
        assert.equal(cache.length, 0);
    });
    it('increase when adding', function () {
        var size = cache.length;
        cache.push(1);
        assert.equal(cache.length, size + 1, "One new element should be added")
    });
    it('reset after clear', function () {
      var size = cache.length;
      cache.push(11);
      cache.clear();
      assert.equal(cache.length, 0, "Reset after clear")
  });
  });
  describe('slice', function () {
    let cache = new IdreCache();
    it('empty', function () {
      cache.clear();
      assert.equal(cache.length, 0, "Cache should be empty")
      assert.deepEqual([], cache.slice(0, 5));
    });
    it('elements', function () {
      cache.clear();
      cache.push(4);
      cache.push(5);
      cache.push(6);
      assert.deepEqual([4,5,6], cache.slice(0, 5));
      assert.deepEqual([4,5,6], cache.slice(0));
      assert.deepEqual([5], cache.slice(1, 2));
      assert.deepEqual([5,6], cache.slice(1,3));
      assert.deepEqual([6], cache.slice(2));
    });
    it('elements negative index', function () {
      cache.clear();
      cache.push(8);
      cache.push(9);
      cache.push(11);
      assert.deepEqual([11], cache.slice(-1));
      assert.deepEqual([9,11], cache.slice(-2));
      assert.deepEqual([9], cache.slice(1, -1));
      assert.deepEqual([9], cache.slice(-2, -1));
      assert.deepEqual([8,9], cache.slice(0, -1));
      assert.deepEqual([9,11], cache.slice(-2, 55));
    });
  });
});
