const { loadPackageJSON,
  tryJSONStringify,
  tryJSONParse,
  arrayChunks,
  mergeDeep,
  isObject,
  createLogger,
  queueThrow,
  nodify,
  noop,
  isFunction,
  once,
  after,
  deepGet,
  throttle,
  getTimeStamp,
  sha1sum,
} = require('../../utils/');

const { dateNow, throwError } = require('../../utils/aliases');

jest.mock('../../utils/aliases');

describe('utils', () => {
  describe('sha1sum', () => {
    it('Returns a sha1 hash from a passed object', () => {
      expect(sha1sum({ test: 'hello-test' }))
        .toEqual('f92c4be69dec078332c2997b4534c971f193c9fd');
    });
  });

  describe('getTimeStamp', () => {
    it('caches and returns the current timestamp for 50ms or 1000 calls', (done) => {
      dateNow.mockImplementation(() => +new Date('2017-07-17'));
      getTimeStamp();
      getTimeStamp();
      expect(getTimeStamp()).toEqual(1500249600000);
      expect(dateNow).toHaveBeenCalledTimes(1);

      let limit = 1001;
      while (limit > 0) {
        getTimeStamp();
        limit -= 1;
      }
      expect(dateNow).toHaveBeenCalledTimes(2);

      setTimeout(() => {
        getTimeStamp();
        getTimeStamp();
        expect(dateNow).toHaveBeenCalledTimes(3);
        done();
      }, 60);
    });
  });

  describe('throttle', () => {
    it('throttles calls to a passed function by a defined time limit', (done) => {
      const mockFn = jest.fn();
      const limit = 50;
      const throttled = throttle(mockFn, limit);
      throttled('test1');
      throttled('test2');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('test1');
      setTimeout(() => {
        throttled('test3');
        throttled('test4');
        expect(mockFn).toHaveBeenCalledTimes(2);
        expect(mockFn).toHaveBeenCalledWith('test3');
        done();
      }, limit + 10);
    });
  });


  describe('deepGet', () => {
    const testObj = { a: 'testValA', b: { c: { d: 'testValD' } } };

    it('returns the value for an object property based on dot-notation path', () => {
      expect(deepGet(testObj, 'a')).toEqual('testValA');
      expect(deepGet(testObj, 'b.c.d')).toEqual('testValD');
    });

    it('returns "null" when passed no object', () => {
      expect(deepGet(testObj, 'd')).toBeNull();
    });
  });

  describe('after', () => {
    it('calls the callback after a set call-count threshold has elapsed', () => {
      const mockFn = jest.fn();
      const threshold = 2;
      const wrapper = after(threshold, mockFn);
      wrapper();
      expect(mockFn).toHaveBeenCalledTimes(0);
      wrapper();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('once', () => {
    it('allows the callback to be called once only', () => {
      const mockFn = jest.fn();
      const wrapper = once(mockFn);
      wrapper('arg1', 'arg2');
      wrapper('foo', 'bar');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('can take context', () => {
      const mockFn = jest.fn();
      const testContext = { foo: 'test' };
      const wrapper = once(mockFn, testContext);
      wrapper('arg1', 'arg2');
      expect(mockFn.mock.instances[0]).toEqual(testContext);
    });
  });

  describe('isFunction', () => {
    it('returns true if function', () => {
      expect(isFunction(jest.fn())).toBe(true);
      expect(isFunction('not-a-function')).toBe(false);
    });
  });

  describe('noop', () => {
    it('returns undefined', () => {
      expect(noop()).toBeUndefined();
      expect(noop(1)).toBeUndefined();
    });

    it('doesn\'t call any passed functions', () => {
      const mockFn = jest.fn();
      noop(mockFn);
      expect(mockFn).not.toBeCalled();
    });
  });

  describe('queueThrow', () => {
    it('takes and throws an error within a setTimeout', (done) => {
      throwError.mockImplementation(e => e);
      const errorValue = 'test-error';
      queueThrow(errorValue);
      setTimeout(() => {
        expect(throwError).toHaveBeenCalledWith(errorValue);
        done();
      }, 10);
    });
  });

  describe('nodify', () => {
    it('if no callback passed returns the promise', () => {
      const testPromise = Promise.resolve();
      expect(nodify(testPromise)).toBe(testPromise);
    });

    it('calls the callback with resolved promise value', (done) => {
      const successValue = 'success';
      const testPromise = Promise.resolve(successValue);
      const cb = jest.fn();
      nodify(testPromise, cb);
      setTimeout(() => {
        expect(cb).toHaveBeenCalledWith(null, successValue);
        done();
      }, 20);
    });

    it('handles errors in the callback, passing them to queueThrow', (done) => {
      const testPromise = Promise.resolve();
      const cb = true;
      const qt = jest.fn();
      nodify(testPromise, cb, qt);
      setTimeout(() => {
        expect(qt).toHaveBeenCalled();
        done();
      }, 20);
    });

    it('handles rejected promises calling the callback with the rejection', (done) => {
      const rejectValue = 'promise-rejected';
      const rejectedPromise = Promise.reject(rejectValue);
      const cb = jest.fn();
      nodify(rejectedPromise, cb);
      setTimeout(() => {
        expect(cb).toHaveBeenCalledWith(rejectValue);
        done();
      }, 20);
    });

    it('handles rejected promises and queueing errors thrown by the callback', (done) => {
      const rejectedPromise = Promise.reject();
      const cb = true;
      const qt = jest.fn();
      nodify(rejectedPromise, cb, qt);
      setTimeout(() => {
        expect(qt).toHaveBeenCalled();
        done();
      }, 20);
    });
  });

  describe('createLogger', () => {
    it('returns a new instance of winston logger with console transport only', () => {
      expect(createLogger().transports).toMatchObject({
        console: {
          silent: false,
        },
      });
    });

    it('takes an options object that can be used to override transport defaults', () => {
      const options = {
        silent: true,
      };
      expect(createLogger(options).transports).toMatchObject({
        console: {
          silent: true,
        },
      });
    });
  });

  describe('isObject', () => {
    it('returns true if arg is an object', () => {
      expect(isObject({})).toBe(true);
      expect(isObject([])).toBe(false);
    });
  });

  describe('mergeDeep', () => {
    it('deep merges two objects', () => {
      const target = {
        a: 'test-a',
        b: {
          c: 'test-c',
        },
      };
      const source = {
        one: 'test-one',
        two: {
          three: 'test-three',
        },
      };
      const expected = {
        a: 'test-a',
        b: {
          c: 'test-c',
        },
        one: 'test-one',
        two: {
          three: 'test-three',
        },
      };
      expect(mergeDeep(target, source)).toEqual(expected);
    });
  });

  describe('arrayChunks', () => {
    it('returns an array of chunks each with a length matching the chunkSize', () => {
      const arr = [1, 2, 3, 4, 5, 6];
      const size = 2;
      const expected = [
        [1, 2],
        [3, 4],
        [5, 6],
      ];
      expect(arrayChunks(arr, size)).toEqual(expected);
    });
  });

  describe('tryJSONParse', () => {
    it('returns result of JSON.parse when passed a valid JSON string', () => {
      const validJSON = '{ "valid": true }';
      expect(tryJSONParse(validJSON)).toEqual({ valid: true });
    });

    it('returns the string when passed an invalid JSON string', () => {
      const invalidJSON = '{ "valid" false}';
      expect(tryJSONParse(invalidJSON)).toEqual('{ "valid" false}');
    });
  });

  describe('tryJSONStringify', () => {
    it('returns a JSON representation of the data', () => {
      const validData = { valid: true };
      expect(tryJSONStringify(validData)).toEqual('{"valid":true}');
    });

    it('catches JSON stringify errors', () => {
      const a = {};
      a.b = a;
      expect(tryJSONStringify(a)).toBeUndefined();
    });
  });

  describe('loadPackageJSON', () => {
    it('loads package.json file into an object', () => {
      expect(loadPackageJSON()).toMatchObject({ author: 'Mike Diarmid' });
      expect(loadPackageJSON(`${__dirname}/../../`)).toMatchObject({ author: 'Mike Diarmid' });
      expect(loadPackageJSON('invalid/path')).toBe(undefined);
      expect(loadPackageJSON('/')).toBe(undefined);
    });
  });
});
