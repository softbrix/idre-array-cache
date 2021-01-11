# Idre-array-cache

An appendable only array with file persistance/listeners, producer/consumer and inter process capabilities.

It is designed to work as an import logger for the Shatabang-project. Imported items are added to the array-cache and eventually persisted to disk. Another process reading from the same file presents the array in a Rest-API's. The tail of the array holds the latest imported item and the clients can poll this from the server, only providing the index of the lastly fetched item gives the delta with new items.

Supports only strings and numbers.

Install the module with npm or yarn

```
npm i --save idre-array-cache
```

or

```
yarn add idre-array-cache
```

Create the array-cache instance by requiring the idre-array-cache module and create a
new instance of the object.

```
var IdreCache = require('idre-array-cache');
const cache = IdreCache();
```

### Append new items

To append new items to the cache use the push function:

`cache.push('NewItem')`

New items can be pushed simultaneously from multiple processes and the new items will be appended to the files asynchronously.

### Persistance

Persistance is handled only after the `open(filename, options)` method has been called.

* Filename argument is the path to the file where the array should be persisted.
* Options argument can configure `delay`(delay between file saves) and `encoding` (file encoding)

When you are completly done with the file you should call close to flush the changes and release the resources. The array-cache will hold an internal file cache so the same file will sync between instances in the same process.

TODO: Add info about event emmitter. Open request on github if needed.

# Why Idre?

Idre is a familly ski resort in the nothern Dalarna county in Sweden. It's a nice place for skiing both downhill and cross country. If you are lucky you see some raindeers running around the mountains eating lichen. It's also close to where my grand mother was born.
