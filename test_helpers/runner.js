const IdreCache = require('..');

const DELAY = 20;
const FILE = './test/data/processing'

if (process.argv.length < 3) {
  console.log('Missing parameters iteration {firstValue}')
  process.exit(12);
}

let val = process.argv[3] || 0;
function nextVal() {
  return val++;
}

let cache = new IdreCache();
async function main(iterations) {
  await cache.open(FILE, { delay: DELAY });
  let cnt = 1;
  let runner = async function() {
    cache.push(nextVal());
    if (cnt++ >= iterations) {
      await cache.close();
      return;
    }
    setTimeout(runner, Math.round(Math.random()*20));
  }
  runner();
}
main(process.argv[2]);