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

import { Method, AxiosRequestConfig, AxiosResponseHeaders } from "axios";

interface FetchQueue {
    /**
     * Queue URL.
     */
    url: string | FetchFunction;
    /**
     * Axios request method.
     */
    method?: Method;
    /**
     * Axios request configuration.
     */
    params?: AxiosRequestConfig;
}

type FetchFunction = (
    queue: FetchQueue | FetchFunction,
) => Promise<any> | any;

interface FetchOptions {
    /**
     * Maximum number of simultaneous workers (default 25).
     */
    worker?: number;
    /**
     * If enabled (default), only successfull Axios request will fire the callback.
     * To force to always fire the callback set to false, be careful to check the
     * result in the callback.
     */
    checkResult?: boolean;
    /**
     * Debugger function.
     */
    debug?: Function;
}

type FetchCallback = (
    queue: string | FetchQueue | FetchFunction,
    res?: any,
    headers?: AxiosResponseHeaders,
    req?: object
) => void;

/**
 * Perform simultaneous fetch.
 */
declare function doFetch(
    queues: Set<string | FetchQueue | FetchFunction>,
    callback: FetchCallback
): Promise<void>;

/**
 * Perform simultaneous fetch.
 */
declare function doFetch(
    queues: Set<string | FetchQueue | FetchFunction>,
    options: FetchOptions,
    callback: FetchCallback
): Promise<void>;

declare namespace doFetch {
    /**
     * Get maximum number of simultaneous workers.
     */
    function getMaxWorker(): number;
    /**
     * Set maximum number of simultaneous workers.
     */
    function setMaxWorker(worker: number): typeof doFetch;
    /**
     * Get fire callback only when request is successful or not enabled state.
     */
    function getCheckResult(): boolean;
    /**
     * Set fire callback only when request is successful or not enabled state.
     */
    function setCheckResult(enabled: boolean): typeof doFetch;
    /**
     * Set debugger function.
     */
    function setDebugger(dbg: Function): typeof doFetch;
}

export = doFetch;
