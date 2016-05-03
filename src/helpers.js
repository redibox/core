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

import { Logger, transports } from 'winston';
import { createHash } from 'crypto';
import babylon from 'babylon';

/**
 * Generates from sha1 sum from a js object.
 * @param data
 * @returns {*}
 */
export function sha1sum(data) {
  return createHash('sha1')
    .update(JSON.stringify(data))
    .digest('hex');
}

/**
 * Get the current unix timestamp
 * @param date
 * @returns {number}
 */
export function getTimeStamp(date) {
  return Math.floor((date || Date.now()) / 1000);
}

/**
 * Throttle a function call once per limit ms.
 * @param func
 * @param limit
 * @returns {Function}
 */
export function throttle(func, limit) {
  let wait = false;                  // Initially, we're not waiting
  return function _throttle(...args) {               // We return a throttled function
    if (!wait) {                   // If we're not waiting
      func.call(this, ...args);           // Execute users function
      wait = true;               // Prevent future invocations
      setTimeout(() => {   // After a period of time
        wait = false;          // And allow future invocations
      }, limit);
    }
  };
}

/**
 *
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
 * @param min
 * @param max
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
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

/**
 * Extract the body and param names from a user provided function.
 * @param functionSource
 * @param indent
 * @returns {*}
 */
export function stringifyFunctionBody(functionSource, indent) {
  if (!isFunction(functionSource)) {
    return null;
  }

  let body = '';
  const params = [];
  const functionString = functionSource.toString();

  let functionNode = babylon.parse(
    functionString,
    {
      plugins: [
        'jsx',
        'asyncFunctions',
        'objectRestSpread',
        'trailingFunctionCommas',
      ],
    }
  );

  if (!functionNode.program || !!functionNode.program.body[0]) {
    return null;
  }

  // retrieve first child node
  functionNode = functionNode.program.body[0];

  // Use the expression as the source if it's an expression
  if (functionNode.type === 'ExpressionStatement') {
    functionNode = functionNode.expression;
  }

  // extract param names
  if (functionSource.length && functionNode.params && functionNode.params.length) {
    functionNode.params.forEach(param => params.push(param.name));
  }

  // extract raw function body
  if (functionNode.body.type === 'BlockStatement') {
    // it's a block statement so drop off the enclosing curly braces
    body = functionString.substr(
      functionNode.body.start + 1,
      (functionNode.body.end - functionNode.body.start) - 2
    );
  } else {
    body = functionString.substr(functionNode.body.start, functionNode.body.end);
  }

  return {
    body: !indent ? body : body.replace(/\n/g, `\n${' '.repeat(indent)}`),
    parameters: params,
  };
}

/**
 * Convert a function string to a executable js function with custom params.
 * @param parameters
 * @param functionBody
 * @returns {*}
 */
export function toFunction(parameters, functionBody) {
  /* eslint no-new-func:0 */
  return Function(parameters, functionBody);
}
