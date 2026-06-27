/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2024-2026 Toha <tohenk@yahoo.com>
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

const axios = require('axios');

const defaultConfig = {
    worker: 25,
    checkResult: true,
    debug: null,
}

/**
 * A callback when fetch queue is completely done.
 *
 * To check for successful operation simply check if res is not undefined.
 *
 * @callback completeCallback
 * @param {string|object} queue Fetched queue which is complete
 * @param {?string|object} res Response content returned by Axios
 * @param {?object} headers Response headers returned by Axios
 * @param {?object} req Last request object returned by Axios
 */

/**
 * Queued url fetch.
 *
 * @param {array<string|object>} queues The queues
 * @param {object} options The options
 * @param {number} options.worker Maximum number of simultaneous workers
 * @param {boolean} options.checkResult Fire callback only when request is successful or not
 * @param {Function} options.debug Debugger function
 * @param {completeCallback} callback Queue completion callback
 */
async function doFetch(queues, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    for (const k of Object.keys(defaultConfig)) {
        if (options[k] === undefined) {
            options[k] = defaultConfig[k];
        }
    }
    const nworker = options.worker;
    const checkResult = options.checkResult;
    const debug = options.debug;
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
                processQueue(queue, async (res) => {
                    let data;
                    if (!(res instanceof axios.AxiosError)) {
                        data = res.data;
                    }
                    if ((checkResult && data) || !checkResult) {
                        await callOrResolve(callback, queue, data, res.headers, res.request);
                        adjustWorker();
                    }
                    worker();
                });
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
    const processQueue = async (queue, done) => {
        const args = [];
        /** @type {axios.Method} */
        const method = typeof queue === 'object' && queue.method ? queue.method.toString().toLowerCase() : 'get';
        /** @type {axios.AxiosRequestConfig} */
        const params = typeof queue === 'object' && queue.params ? { ...queue.params } : {};
        if (params.headers) {
            params.headers = await callOrResolve(params.headers, queue);
        }
        const url = await callOrResolve(typeof queue === 'object' && queue.url ? queue.url : queue, queue);
        if (!url) {
            throw new Error('Queue does not contains an URL!');
        }
        if (method !== 'request') {
            args.push(url);
            if (!['get', 'delete', 'head', 'options'].includes(method)) {
                if (params.data) {
                    args.push(await callOrResolve(params.data, queue));
                    delete params.data;
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
                done(response);
            })
            .catch(err => {
                console.error(`Unable to fetch ${url}: ${err.message}!`);
                done(err);
            })
    }
    const callOrResolve = async (...args) => {
        if (args.length) {
            let data = args.shift();
            if (typeof data === 'function') {
                data = data(...args);
            }
            if (data instanceof Promise) {
                data = await data;
            }
            return data;
        }
    }
    if (createWorker()) {
        await new Promise(resolve => finish = resolve);
    }
}

Object.assign(doFetch, {
    getMaxWorker() {
        return defaultConfig.worker;
    },
    setMaxWorker(n) {
        defaultConfig.worker = n;
        return doFetch;
    },
    getCheckResult() {
        return defaultConfig.checkResult;
    },
    setCheckResult(enabled) {
        defaultConfig.checkResult = enabled;
        return doFetch;
    },
    setDebugger(dbg) {
        defaultConfig.debug = dbg;
        return doFetch;
    }
});

module.exports = doFetch;