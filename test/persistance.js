const assert = require('assert');
const IdreCache = require('..');
const fs = require('fs');
const fsp = fs.promises;
const fork = require('child_process').fork;

const ITEMS = 20000;
const MIN_TIME = 946684799000;
const MAX_TIME = 33149740506000;

const DATA_FILE = './test/data/datafile';
const DATA_FILE_CLOSE = './test/data/datafile_close';
const DATA_FILE_SLICE = './test/data/testdata-slice';
const DATA_FILE_PROCESSING = './test/data/processing';

function nextVal() {
  return MIN_TIME + Math.floor(MAX_TIME * Math.random());
}

async function deleteFile(fName) {
  try {
    let stat = fs.statSync(fName);
    if (stat.isFile()) {
      fs.unlinkSync(fName);
    }
  } catch(e) {
    // console.log('err', e)
  }
}

const DELAY = 50;
describe('IdreCache with persistance', function () {

  before(() => {
    [DATA_FILE, DATA_FILE_CLOSE, DATA_FILE_SLICE, DATA_FILE_PROCESSING].forEach(deleteFile);
  });

  let cache = new IdreCache();
  it('should be ok to open cache', async function () {
    await cache.open(DATA_FILE, { delay: DELAY});
    await cache.clear();
  });
  it('should not be ok to open again', async function () {
    try {
      await cache.open(DATA_FILE);
      assert.fail('Should have trown error');
    } catch (e) {}
  });
  it('should be ok to add multiple numbers', function (done) {
      const FIRST = nextVal();
      cache.push(FIRST);
      for (var i = 1; i < ITEMS; ++i) {
        cache.push(nextVal());
      }
      setTimeout(async () => {
        let newCache = new IdreCache();
        await newCache.open(DATA_FILE, { delay: DELAY});
        assert.equal(newCache.length, ITEMS)
        assert.equal(FIRST, newCache.slice(0, 1));
        await newCache.close();
        done();
      }, DELAY * 4)
  });
  it('should be ok to clear cache and then push new items', async function () {
    await cache.clear();
    assert.equal(cache.length, 0)
    cache.push(nextVal());
    cache.push(nextVal());
    assert.equal(cache.length, 2)
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
  it('negative slice elements', async function () {
    await fsp.writeFile(DATA_FILE_SLICE, '8\n9');
    let sliceCache = new IdreCache();
    await sliceCache.open(DATA_FILE_SLICE);
    sliceCache.push(11);
    assert.deepEqual([11], sliceCache.slice(-1));
    assert.deepEqual([9,11], sliceCache.slice(-2));
    assert.deepEqual([9], sliceCache.slice(1, -1));
    assert.deepEqual([9], sliceCache.slice(-2, -1));
    assert.deepEqual([8,9,11], sliceCache.slice(0));
    assert.deepEqual([8,9], sliceCache.slice(0, -1));
    assert.deepEqual([9,11], sliceCache.slice(-2, 55));
    sliceCache.clear();
  });
  it('should save on close', async function () {
    let cache2 = new IdreCache();
    await cache2.open(DATA_FILE_CLOSE, { delay: 200});
    assert.equal(cache2.length, 0)
    cache2.push(nextVal());
    cache2.push(nextVal());
    assert.equal(cache2.length, 2)
    await cache2.close();
  });
  it('should clear file', async function () {
    let cache2 = new IdreCache();
    await cache2.open(DATA_FILE_CLOSE, { delay: 50});
    await cache2.clear();
    await cache2.close();
  });

  it('should be able to process in separate processes', async function () {
    // this.timeout(2000);
    const iterations = 40;
    var child1 = fork('./test_helpers/runner.js',[iterations, 0]);
    var child2 = fork('./test_helpers/runner.js',[iterations, 1000]);

    let onExit = function(prc) {
      return new Promise((resolve, reject) => {
        prc.on('exit', code => {
          (code === 0 ? resolve: reject)(code);
        })
      });
    };

    await Promise.all([onExit(child1), onExit(child2)])

    let cache2 = new IdreCache();
    await cache2.open(DATA_FILE_PROCESSING, { delay: 50});
    assert.equal(cache2.length, 2*iterations);
    await cache2.close();
  });
});
