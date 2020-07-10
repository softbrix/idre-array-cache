const fs = require('fs');
const onExit = require('signal-exit');
const events = require('events');


const FILE_ENCODING = 'utf8';
const idreEventEmitter = new events.EventEmitter();

// Throttle function: Input as function which needs to be throttled and delay is the time interval in milliseconds
var  throttle  =  function (func, delay) {
	if (this._tid) return;
	this._tid = setTimeout(() => { 
        func();	
        this._tid = undefined; 
    }, delay);
}

// Ensure file checks file access and creates the file if it does not exist
async function ensureFile(filePath) {
    try {
        // Access returns undefined if all ok, throws error otherwise
        await fs.promises.access(filePath, fs.constants.R_OK);
    } catch(e) {
        if (e.code !== 'ENOENT') { // Retrow if error is other than file does not exist
            throw e;
        }
        // Create file
        await fs.promises.writeFile(filePath, '');
    }
}

// Delete the file from the file system
async function deleteFile(filePath) {
    try {
        // File access is ok if response from access method is undefined, otherwise error is thrown
        await fs.promises.access(filePath, fs.constants.W_OK);
        await fs.promises.unlink(filePath);
    } catch (e) {
        if (e.code !== 'ENOENT') { // Retrow if error is other than file does not exist
            throw e;
        }
    }
}

// PersistArray will append the new items to the file
async function persistArray() {
    // if nothing to write then exit
    if (this._array.length === 0) {
        return;
    }

    // Read current file
    let newfArray = await readFileArray(this._fInfo.path, this._fInfo);

    // Append to file
    var wstream = fs.createWriteStream(this._fInfo.path, { encoding: FILE_ENCODING , flags: 'a'});
    this._array.forEach( function (item) {
        wstream.write(item + "\n");
    });
    wstream.end();

    // Update file array with both file array and appended information
    this._fInfo.array = newfArray.concat(this._array);
}

// Read file array will read the file and parse the content and return an array with items if successful
async function readFileArray(filePath, fInfo) {
    try {
        let stats = await fs.promises.stat(filePath);
        if (!stats.isFile()) {
            throw new Error('Expected ' + filePath + ' to be a file');
        }
        if (stats.mtimeMs > fInfo.lAccess) {
            // Open and read file
            let fileBuffer = await fs.promises.readFile(filePath, {flag: 'r', encoding: FILE_ENCODING});

            // Update last acces parameters
            fInfo.lAccess = stats.mtimeMs;

            let arr = fileBuffer.toString().split('\n');
            // Remove last if element is empty
            if (arr.length > 0 &&  arr[arr.length-1] === "") {
                arr.pop();
            }
            return arr;
        } else {
            return fInfo.array;
        }
    } catch(e) {
        if (e.code !== 'ENOENT') { // Retrow if error is other than file does not exist
            throw e;
        }
    }
    return [];
}

// File cache holds a global cache for opened files
var fileCache = {}

// The IdreCache constructor
function IdreCache() {
    this._array = [];
}

// Close the file if no more listeners otherwise just remove the listener
IdreCache.prototype.close = async function() {
    if (this._fInfo === undefined) {
        throw new Error("No file for this instance is open");
    }
    this._fInfo.cacheListeners--;
    if (this._fInfo.cacheListeners === 0) {
        if (this._fInfo.watcher !== undefined) {
            this._fInfo.watcher.close();
        }
        await persistArray.bind(this)();
        if (this._tid) {
            clearTimeout(this._tid);
        }
        delete fileCache[this._fInfo.path];
    }
    this._removeExitListener();

    this._removeExitListener = undefined;
    this._fInfo = undefined;
}

// When opening a file for the array the stored items in the file adds to the start of this cache instance
IdreCache.prototype.open = async function(filePath, options) {
    if (typeof filePath !== "string") {
        throw new Error("parameter filePath is wrong type, expected string");
    }
    if (this._fInfo !== undefined) {
        throw new Error("A file for this instance is already open");
    }
    this._op = Object.assign({}, {delay: 200}, options);
    if (fileCache[filePath] === undefined) {
        let fInfo = { // The fInfo object stores informaiton about the file
            path: filePath,
            lAccess: 0, // Last access to file
            array: [], // File data
            cacheListeners: 0
        };
        // Create file if not exists
        await ensureFile(filePath);
        // Read current file
        fInfo.array = await readFileArray(filePath, fInfo);
        // Start watching file changes, this will probably trigger on self made updates
        fInfo.watcher = fs.watch(filePath, {persistent: false});
        fInfo.watcher.on('change', async () => {
            fInfo.array = await readFileArray(filePath, fInfo);
            idreEventEmitter.emit('change');
        });
        fInfo.watcher.on('error', (error) => {
            idreEventEmitter.emit('error', error);
        });

        fileCache[filePath] = fInfo;
    }
    this._fInfo = fileCache[filePath];
    this._fInfo.cacheListeners++;
    // Save current array to file
    if (this._array.length > 0) {
        throttle.bind(this)(persistArray.bind(this), 0);
    }
    // Bind the process exit event so we can write the instance to the file, one listener per instance
    this._removeExitListener = onExit(() => {
        persistArray.bind(this);
    });
}

// Push a new value to the array
IdreCache.prototype.push = function(value) {
    if (typeof value !== "number" && typeof value !== "string") {
        throw new Error("Argument is wrong type, expected number or string");
    }
    if (typeof value === "string" && value.indexOf('\n') >= 0) {
        throw new Error("Argument is not allowed to include 'newline' character");
    }
    this._array.push(value);
    
    if (this._fInfo) {
        throttle.bind(this)(persistArray.bind(this), this._op.delay);
    }
    idreEventEmitter.emit('push', value);
}

// Return a subarray with values
IdreCache.prototype.slice = function(start, end) {
    let itms = [];
    const length = this._array.length + (this._fInfo ? this._fInfo.array.length : 0);
    end = end || length;  // Init optional parameter
    // Translate negative parameters to positive
    if (start < 0) {
        start += length;
    }
    if (end < 0) {
        end += length;
    }

    // Handle the fInfo.array as a prefixed array
    if (this._fInfo && this._fInfo.array) {
        let arr = this._fInfo.array;
        if (start < arr.length) {
            itms = arr.slice(start, end)
        }
        start -= arr.length;
        end -= arr.length;
    }
    if (end > 0) {
        itms = itms.concat(this._array.slice(start, end));
    }

    return itms;
}

// Clear the current instance and remove the persisted values, if multiple instances with same file then all instances
// needs to be cleared to ensure full removal
IdreCache.prototype.clear = async function() {
    this._array.length = 0;
    if (this._fInfo) {
        this._fInfo.array.length = 0;
        this._fInfo.lAccess = 0;
        this._fInfo.lSeek = 0;
        await deleteFile(this._fInfo.path);
    }
    idreEventEmitter.emit('clear');
}

// Return the instance lenght as a read only property
Object.defineProperty(IdreCache.prototype, "length", {
    get: function() { return (this._fInfo !== undefined ? this._fInfo.array.length : 0) + this._array.length; }
});

// Add listeners API
IdreCache.prototype.on = idreEventEmitter.on.bind(idreEventEmitter);
IdreCache.prototype.off = idreEventEmitter.off.bind(idreEventEmitter);
IdreCache.prototype.once = idreEventEmitter.once.bind(idreEventEmitter);
IdreCache.prototype.addListener = idreEventEmitter.addListener.bind(idreEventEmitter);
IdreCache.prototype.prependListener = idreEventEmitter.prependListener.bind(idreEventEmitter);
IdreCache.prototype.prependOnceListener = idreEventEmitter.prependOnceListener.bind(idreEventEmitter);
IdreCache.prototype.removeListener = idreEventEmitter.removeListener.bind(idreEventEmitter);
IdreCache.prototype.removeAllListeners = idreEventEmitter.removeAllListeners.bind(idreEventEmitter);

// Debug function
function logListenersCount(eventName) {
    var eventListeners = require('events').EventEmitter.listenerCount
   (idreEventEmitter, eventName);
    console.log(`${eventListeners} Listner(s) listening to ${eventName} event`);
}

module.exports = IdreCache;