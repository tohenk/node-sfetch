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

const assert = require('node:assert');
const test = require('node:test');
const axios = require('axios');
const HttpRequestMock = require('http-request-mock');
const doFetch = require('.');

axios.defaults.adapter = 'http';
/** @type {HttpRequestMock.Mocker} */
const mocker = HttpRequestMock.setupForUnitTest('node');

mocker
    .get('https://example.com/foo', () => {
        return 'foo';
    })
    .get('https://example.com/bar', () => {
        return 'bar';
    })
    .get('https://example.com/url', () => {
        return { urls: ['https://example.com/foo', 'https://example.com/bar'] };
    })
    .get('https://example.com/check?res=true', () => {
        return 'something';
    })
    .get('https://example.com/check?res=false', () => {
        return '';
    })
    .get('https://example.com/get', () => {
        return 'get';
    })
    .post('https://example.com/post', (req, res) => {
        if (req.query.test === 'true') {
            const body = JSON.parse(req.body);
            return body.content;
        }
    })
    .get('https://example.com/headers', (req, res) => {
        res.headers['my-header-reply'] = 'true';
        return req.headers['my-header'];
    })
;

test('fluent interface', async (t) => {
    await t.test('set or get max worker', () => {
        const nworker = doFetch.setMaxWorker(5).getMaxWorker();
        assert.strictEqual(nworker, 5);
    });
    await t.test('set or get check result', () => {
        const checkres = doFetch.setCheckResult(false).getCheckResult();
        assert.strictEqual(checkres, false);
    });
});
test('simple url queuing', async (t) => {
    await t.test('empty queue', async () => {
        await doFetch([], (url, res) => {});
        assert.ok(true, 'fetch can process empty queue');
    });
    await t.test('fetch queues', async () => {
        const result = [];
        await doFetch(['https://example.com/foo', 'https://example.com/bar'], (url, res) => {
            result.push(res);
        });
        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(result, ['foo', 'bar']);
    });
    await t.test('dynamic queuing', async () => {
        const result = [];
        const queues = ['https://example.com/url'];
        await doFetch(queues, (url, res) => {
            if (typeof res === 'object' && res.urls) {
                queues.push(...res.urls);
            } else {
                result.push(res);
            }
        });
        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(result, ['foo', 'bar']);
    });
    await t.test('check result set to true skip empty response', async () => {
        const result = [];
        doFetch.setCheckResult(true);
        await doFetch(['https://example.com/check?res=true', 'https://example.com/check?res=false'], (url, res) => {
            result.push(res);
        });
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result, ['something']);
    });
    await t.test('check result set to false include empty response', async () => {
        const result = [];
        doFetch.setCheckResult(false);
        await doFetch(['https://example.com/check?res=true', 'https://example.com/check?res=false'], (url, res) => {
            result.push(res);
        });
        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(result, ['something', '']);
    });
});
test('complex url queuing', async (t) => {
    await t.test('fetch method', async () => {
        const result = [];
        await doFetch([
            {
                url: 'https://example.com/get'
            },
            {
                url: 'https://example.com/post',
                method: 'post',
                params: {
                    params: { test: 'true' },
                    data: { content: 'test' }
                }
            }
        ], (url, res) => {
            result.push(res);
        });
        assert.strictEqual(result.length, 2);
        assert.deepStrictEqual(result, ['get', 'test']);
    });
    await t.test('response headers', async () => {
        let myheader;
        const result = [];
        await doFetch([
            {
                url: 'https://example.com/headers',
                params: {
                    headers: {
                        'My-Header': 'test'
                    }
                }
            }
        ], (url, res, headers) => {
            if (headers['my-header-reply']) {
                myheader = headers['my-header-reply'];
            }
            result.push(res);
        });
        assert.deepStrictEqual(result, ['test']);
        assert.strictEqual(myheader, 'true');
    });
});
