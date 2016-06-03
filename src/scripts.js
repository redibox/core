/**
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 Salakar
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

export default {

  /**
   * Not really needed due to redis `set` options, just for niceness
   */
  setNxEx: {
    keys: 1,
    lua: `
        --[[
          key 1 -> key name
          arg 1 -> expires in seconds
          arg 2 -> key value
        ]]

        if redis.call('exists',KEYS[1]) > 0 then
          return 0
        else
          redis.call('setex',KEYS[1],tonumber(ARGV[1]),ARGV[2])
          return 1
        end
    `,
  },

  /**
   * Not really needed due to redis `set` options, just for niceness
   */
  pSetNxEx: {
    keys: 1,
    lua: `
        --[[
          key 1 -> key name
          arg 1 -> expires in milliseconds
          arg 2 -> key value
        ]]

        if redis.call('exists',KEYS[1]) > 0 then
          return 0
        else
          redis.call('psetex',KEYS[1],tonumber(ARGV[1]),ARGV[2])
          return 1
        end
    `,
  },

  /**
   * Capped list - useful for capped logs etc.
   */
  lcap: {
    keys: 1,
    lua: `
        local k = KEYS[1]
        local element = ARGV[1]
        local limit = tonumber(ARGV[2])
  
        --- set list
        redis.call("LPUSH",k,element)
        redis.call("LTRIM", k, 0, limit -1)
    `,
  },
};
