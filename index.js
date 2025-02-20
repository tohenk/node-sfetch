/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2024-2025 Toha <tohenk@yahoo.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const axios = require('axios')

/**
 * A callback when fetch queue is completely done.
 *
 * To check for successful operation simply check if res is not undefined.
 *
 * @callback completeCallback
 * @param {string|object} queue Fetched queue which is complete
 * @param {string|object} res Response content returned by axios
 * @param {object} headers Response headers returned by axios
 */

/**
 * @type {number}
 */
let nworker = 25;

/**
 * @type {boolean}
 */
let checkResult = true;

/**
 * @type {any}
 */
let debug;

/**
 * Queued url fetch.
 *
 * @param {array<string>} queues The queues
 * @param {completeCallback} cb Queue completion callback
 */
async function doFetch(queues, cb) {
    let finish;
    let n = Math.min(nworker, queues.length);
    const workers = [];
    const adjustWorker = () => {
        if (queues.length > workers.length && workers.length < nworker) {
            let nw = Math.min(nworker, queues.length);
            if (n < nw) {
                n = nw;
                createWorker();
            }
        }
    }
    const createWorker = () => {
        while (workers.length < n) {
            startWorker();
        }
        return workers.length > 0;
    }
    const startWorker = () => {
        const worker = () => {
            if (queues.length) {
                const queue = queues.shift();
                const done = (res, headers) => {
                    if ((checkResult && res) || !checkResult) {
                        cb(queue, res, headers);
                        adjustWorker();
                    }
                    worker();
                }
                const url = typeof queue === 'string' ? queue : queue.url;
                const method = typeof queue === 'object' && queue.method ? queue.method : 'get';
                const params = typeof queue === 'object' && queue.params ? queue.params : {};
                const args = [];
                if (method !== 'request') {
                    args.push(url);
                    if (['get', 'delete', 'head', 'options'].indexOf(method) < 0) {
                        if (params.data !== undefined) {
                            args.push(params.data);
                        }
                    }
                } else {
                    params.url = url;
                }
                args.push(params);
                // request({})
                // (get|delete|head|options)(url, {})
                // (post|put|patch|postForm|putForm|patchForm)(url, data, {})
                if (typeof debug === 'function') {
                    debug(`fetch %s with %s`, url, JSON.stringify(params));
                }
                axios[method](...args)
                    .then(response => {
                        done(response.data, response.headers);
                    })
                    .catch(err => {
                        console.error(`Unable to fetch ${url}: ${err.message}!`);
                        done();
                    })
            } else {
                workers.splice(workers.indexOf(worker), 1);
                if (workers.length === 0) {
                    (function f() {
                        if (typeof finish === 'function') {
                            finish();
                        } else {
                            process.nextTick(f);
                        }
                    })();
                }
            }
        }
        workers.push(worker);
        worker();
    }
    if (createWorker()) {
        await new Promise(resolve => finish = resolve);
    }
}

Object.assign(doFetch, {
    getMaxWorker() {
        return nworker;
    },
    setMaxWorker(n) {
        nworker = n;
        return doFetch;
    },
    getCheckResult() {
        return checkResult;
    },
    setCheckResult(enabled) {
        checkResult = enabled;
        return doFetch;
    },
    setDebugger(dbg) {
        debug = dbg;
        return doFetch;
    }
});
module.exports = doFetch;