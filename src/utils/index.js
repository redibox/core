/**
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Salakar
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
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
 *
 */

import { createHash } from 'crypto';
import { sep, join, resolve } from 'path';
import { Logger, transports } from 'winston';
import { existsSync, readFileSync } from 'fs';

/**
 * Generates from sha1 sum from an object.
 * @param data
 * @returns {*}
 */
export function sha1sum(data) {
  return createHash('sha1')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * Get the current timestamp, but way faster,
 * Caches the timestamp per 50ms or 1000 calls
 * @param date
 * @returns {number}
 */
let _timestamp;
let _ncalls = 0;
export function getTimeStamp() {
  if (!_timestamp || ++_ncalls > 1000) {
    _timestamp = Date.now();
    _ncalls = 0;
    setTimeout(() => {
      _timestamp = null;
    }, 50);
  }
  return _timestamp;
}

/**
 * Throttle a function call once per limit ms.
 * @param func
 * @param limit
 * @returns {Function}
 */
export function throttle(func, limit) {
  let wait = false;                    // Initially, we're not waiting
  return function _throttle(...args) { // We return a throttled function
    if (!wait) {                       // If we're not waiting
      func.call(this, ...args);        // Execute function
      wait = true;                     // Prevent future invocations
      setTimeout(() => {               // After a period of time
        wait = false;                  // And allow future invocations
      }, limit);
    }
  };
}

/**
 * Deep get a nested property from an object using a dot notation path
 * @param obj
 * @param path
 * @returns {*}
 */
export function deepGet(obj, path) {
  let tmpObj = obj;
  path.split('.').forEach(key => {
    if (!tmpObj || !hasOwnProperty.call(tmpObj, key)) {
      tmpObj = null;
      return;
    }
    tmpObj = tmpObj[key];
  });
  return tmpObj;
}

/**
 * @description Quick implementation of lodash's 'after' function
 * @param {number} n count
 * @param {Function} done  after count condition met callback
 * @returns {Function} After runner
 */
export function after(n, done) {
  let times = n;
  return () => {
    times = times - 1;
    if (times === 0) return typeof done === 'function' && done();
    return void 0;
  };
}

/**
 * Wrapper to only allow a function to run once
 * @param fn
 * @param context
 * @returns {Function}
 */
export function once(fn, context) {
  let called = false;
  return function onceInternal(...args) {
    if (!called) {
      called = true;
      fn.apply(context || this, args);
    }
  };
}

/**
 * Simple is function check
 * @param item
 * @returns {*|boolean}
 */
export function isFunction(item) {
  return (item && typeof item === 'function');
}

/**
 * Empty callback filler func.
 */
export function noop() {
}

/**
 * Allow promises or callbacks on native es6 promises - no prototyping because ew.
 * @param promise
 * @param callback
 * @returns {*}
 */
export function nodify(promise, callback) {
  if (callback) {
    // prevent any callback exceptions getting swallowed by the Promise handlers
    const queueThrow = e => {
      setTimeout(() => {
        throw e;
      }, 0);
    };
    promise.then(v => {
      try {
        callback(null, v);
      } catch (e) {
        queueThrow(e);
      }
    }).catch(r => {
      try {
        callback(r);
      } catch (e) {
        queueThrow(e);
      }
    });
  }
  return promise;
}

/**
 * Returns a new instance of winston logger with console transport only.
 * @param {Object} options logging level, defaults to warn
 * @returns {Logger} Winston Logger
 */
export function createLogger(options) {
  return new Logger({
    transports: [
      new (transports.Console)(options),
    ],
  });
}

/**
 * Simple is object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
}

/**
 * Generate a random integer between two numbers
 * @returns {number}
 */
export function randomInt() {
  return Math.floor(Math.random() * 0x100000000 | 0).toString(16);
}

/**
 * Deep merge two objects.
 * @param target
 * @param source
 */
export function mergeDeep(target, source) {
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    });
  }
  return target;
}

export function arrayChunks(array, chunkSize) {
  const results = [];
  for (let i = 0, len = array.length; i < len; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}

/**
 *
 * @param string
 * @returns {*}
 */
export function tryJSONParse(string) {
  try {
    return JSON.parse(string);
  } catch (jsonError) {
    return string;
  }
}

/**
 *
 * @param data
 * @returns {*}
 */
export function tryJSONStringify(data) {
  try {
    return JSON.stringify(data);
  } catch (jsonError) {
    return undefined;
  }
}

/**
 * Find package.json files.
 *
 * @param {String} root The root directory we should look in.
 * @returns {Object} Iterator interface.
 * @api public
 */
export function loadPackageJSON(root = process.cwd()) {
  if (root === sep) {
    return undefined;
  }

  const file = join(root, 'package.json');

  if (existsSync(file)) {
    return tryJSONParse(readFileSync(file));
  }

  // try go up one and look for a package.json
  // mainly for projects that compile to a sub folder in the project root.
  const fileUp = join(resolve(root, './../'), 'package.json');

  if (existsSync(fileUp)) {
    return tryJSONParse(readFileSync(fileUp));
  }

  return undefined;
}
