# Simultaneously Fetch URLs

Simultaneously fetch urls using Axios.

## Usage

This module export `doFetch` function with the following signature:

```js
/**
 * @param {array<string>} queues The queues
 * @param {completeCallback} callback Queue completion callback
 */
async function doFetch(queues, callback) {
}
```

The `queues` parameter can be a simple string array as of `['url', 'url', ...]` or a complex object.
For complex objects, the following property is recognized:

* `url`, the url to fetch.

* `method`, the method to use, either `get` or `post` is supported. If none specified it will be assumed as `get`.

* `params`, parameters which can includes request `headers`, URL parameters `params`, or anything else
  of Axios [Request Config](https://axios-http.com/docs/req_config).

The `callback` will be called once each queue completed. The callback function signature is described as:

```js
/**
 * @param {string|object} queue Fetched queue which is complete
 * @param {string|object} res Response content returned by axios
 * @param {object} headers Response headers returned by axios
 */
function callback(queue, res, headers) {
}
```

An additional configuration can be used to adjust `doFetch` behavior:

* The number of simultaneous workers by default set to 25 workers. To change the number of workers,
  call `doFetch.setMaxWoker()` with desired value, e.g. `doFetch.setMaxWoker(10)`.

* The callback by default will not be fired if the response is empty. To force to always to fire
  the callback regardless of the response, set with `doFetch.setCheckResult(false)`

* To enable debugging, set the debugger function such as `console.log` using `doFetch.setDebugger(console.log)`.

## Examples

### Fetch some urls

```js
const doFetch = require('@ntlab/sfetch');

(async function run() {
    await doFetch([
        'https://example.com/foo',
        'https://example.com/bar'
    ], function(url, res, headers) {
        if (res) {
            // do something here
        }
    });
})();
```

### Fetch some urls for further processing

```js
const doFetch = require('@ntlab/sfetch');

(async function run() {
    const headers: {
        'User-Agent': 'My-User-Agent/1.0'
    }
    await doFetch([
        {
            for: 'foo',
            url: 'https://example.com/foo',
            method: 'get',
            params: {
                headers,
                params: { data: 'foo' }
            }
        },
        {
            for: 'bar',
            url: 'https://example.com/bar',
            method: 'post',
            params: {
                headers,
                params: { data: 'bar' },
                data: { bar: 'baz' }
            }
        }
    ], function(queue, res, headers) {
        if (queue.for === 'foo') {
            // do something for foo
        }
        if (queue.for === 'bar') {
            // do something for bar
        }
    });
})();
```

### Queue more urls

```js
const doFetch = require('@ntlab/sfetch');

(async function run() {
    const queues = ['https://example.com/foo']; 
    await doFetch(queues, function(url, res) {
        // queue returned urls from JSON response
        if (res && res.urls) {
            queues.push(...res.urls);
        }
    });
})();
```
