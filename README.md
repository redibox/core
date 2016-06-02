# RediBox

[![Coverage Status](https://coveralls.io/repos/github/redibox/core/badge.svg?branch=master)](https://coveralls.io/github/redibox/core?branch=master)
![Downloads](https://img.shields.io/npm/dt/redibox.svg)
[![npm version](https://img.shields.io/npm/v/redibox.svg)](https://www.npmjs.com/package/redibox)
[![dependencies](https://img.shields.io/david/redibox/core.svg)](https://david-dm.org/redibox/core)
[![build](https://travis-ci.org/redibox/core.svg)](https://travis-ci.org/redibox/core)
[![License](https://img.shields.io/npm/l/redibox.svg)](/LICENSE)

Redis connection and PUBSUB subscription manager for node. Built for performance, powered by [ioredis](https://github.com/luin/ioredis).

## What can you do with RediBox?

RediBox offers out of the box support for clusters, sentinels and standalone redis servers. It also
provides easy utilities around redis client connection monitoring, scaling cluster
reads with [`READONLY`](http://redis.io/commands/readonly), advanced subscriptions via PUBSUB (in the
easy to use node.js Event Emitter format), lua script management and executing commands against a cluster.

RediBox is also easily extensible via [Hooks](#example-custom-hook).

## Getting Started

Install via npm:

```shell
npm install redibox --save
```

And include in your project:

```javascript
// ES6
import Redibox from 'redibox';

const RediBox = new Redibox({
  redis: {
    port: 7777
  }
}); // optional callback for bootstrap ready status or use events:

RediBox.on('ready' clientStatus => {
  RediBox.log.info(error); // internal redibox instance of winston if needed.
  // use cache module to set a cached value with a 60 second validity time.
  RediBox.cache.set('myKey', 'myVal', 60); // use a callback or a promise
});

RediBox.on('error' error => {
  RediBox.log.error(error); // internal redibox instance of winston if needed.
});
```

## Configuration

See the [default config](https://github.com/redibox/core/blob/master/src/defaults.js) for all available configuration options.


## Core

#### - quit -
Disconnects the redis clients but first waits for pending replies.

#### - disconnect -
Force Disconnects, will not wait for pending replies (use disconnect if you need to wait).

#### - getReadOnlyClient -
Returns a redis client for read only purposes. This is useful for cluster mode where `redis.clusterScaleReads` is set to `true`. This client is able to read from redis cluster slaves.

**Returns**: `RedisClient` , IORedis master and slave read client.

#### - getClient -
Returns a read/write redis client.

**Returns**: `RedisClient` , IORedis master read and write client.

#### - createClient -
Creates a new redis client using the current config and attaches it onto `RediBox.clients.clientName`

**Parameters**:
 - **clientName**: `String` , the key to use for the client, at `RediBox.clients`.
 - **readOnly**: `Boolean` , set to true to make this a `READONLY` redis client that will allow reading from masters AND slaves.
 - **readyCallback**: `Function` , callback on `ready` event.


**Returns**: `RedisClient` , the new IORedis client.


#### - isClientConnected -
Returns the connection state of the redis client provided.

**Parameters:**
 - **client**: `RedisClient` , the redis client instance to check.

**Returns**: `Boolean` , true if connected.


## Cluster

#### - exec -
Send a command to all cluster master nodes.

**Parameters:**
 - **command**: `String` , the the command e.g. `FLUSHALL`.
 - **...args**: `Params` , args to send with command.

**Returns**: `Promise`

**Example**:
```javascript
  RediBox.exec('flushall').then(function (result) {
    console.dir(result);
  }, function (error) {
    console.dir(error);
  });
```


#### - clusterGetNodes -
Returns an array of all master and slave node addresses that we are connected to.

**Returns**: `Array<String>`

**Example**:
```javascript
  console.dir(RediBox.clusterGetNodes());

  // logs:
  /*
   [
    '127.0.0.1:30001',
    '127.0.0.1:30002',
    '127.0.0.1:30003',
    '127.0.0.1:30004',
    '127.0.0.1:30005',
    '127.0.0.1:30006',
   ]
  */
```

#### - clusterGetSlaves -
Returns an array of all the slave node addresses.

**Returns**: `Array<String>`

**Example**:
```javascript
  console.dir(RediBox.clusterGetSlaves());

  // logs:
  /*
   [
    '127.0.0.1:30004',
    '127.0.0.1:30005',
    '127.0.0.1:30006',
   ]
  */
```

#### - clusterGetMasters -
Returns an array of all the master node addresses.

**Returns**: `Array<String>`

**Example**:
```javascript
  console.dir(RediBox.clusterGetMasters());

  // logs:
  /*
   [
    '127.0.0.1:30001',
    '127.0.0.1:30002',
    '127.0.0.1:30003',
   ]
  */
```

#### - clusterGetNodeClient -
Returns the individual cluster node connection instance.
Returns 'false' if not found.

**Returns**: `RedisClient || false`

**Example**:
```javascript
  const slave4Client = RediBox.clusterGetNodeClient('127.0.0.1:30004');

  if (slave4Client) {
    // do something with the client
    slave4Client.hgetall(...args);
  }
```



## PubSub

RediBox core PUBSUB is more than just the standard ioredis/node_redis clients single 'message' event handler. It's setup to allow subscribing just like you would with a node event emitter. Internally though, RediBox has a on 'message' handler that routes pubsub messages to an event emitter which you're listening to when you subscribe, this gives you better control over channel flow.

#### - subscribeOnce -
Subscribe once to single or multiple redis channels, i.e the same as node's EventEmitter.once(). On
receiving the first event per channel the client will automatically unsub (if no other subscribers)
and remove the listener from the emitter.
Optionally you can also specify a timeout, e.g. I want one event from this channel within **5000 ms**, else let me know it timed out.

This accepts a single channel as a string or multiple channels as an Array.

**Parameters:**
 - **channels**: `String || Array` , A string or array of strings of channels to subscribe to.
 - **listener**: `Function` , Your event listener.
 - **subscribedCallback**: `Function` , callback to be called once subscribed, first param is an error.
 - **timeout**: `Number` , **Optional** timeout ms - timeout after specified length of time, listener is called with a timeout event (`event.timeout`).

**Example:**
```javascript
  RediBox.subscribeOnce([
    'requestID-123456:request:dataPart1',
    'requestID-123456:request:dataPart2',
    'requestID-123456:request:dataPart3'
  ], function (message) { // on message received listener
    if (message.timeout) {
      return console.error(new Error(`Sub once to channel ${message.channel} timed out! =( `));
    }
    console.log('I received a message \\o/:');
    console.dir(message.channel); // channel name
    console.dir(message.timestamp); // when the message was received
    console.dir(message.data); // JSON parsed data
  }, function (err) { // on subscribed callback
    if (!err) {
      console.log('Subscribed once to multiple channels!');

      // test publish to just one channel, the rest will timeout
      // this is normally sent from somewhere else
      RediBox.publish('requestID-123456:request:dataPart1', {
        someArray: [1, 2, 3, 4, 5],
        somethingElse: 'foobar'
      });
    }
  }, 3000); // I want an event back within 3 seconds for each channel ( so each has 3 secs to respond )

  /**
  CONSOLE OUTPUT:

  Subscribed once to multiple channels!
  I received a message \o/:
  'requestID-123456:request:dataPart1'
  1453677089
  { someArray: [ 1, 2, 3, 4, 5 ], somethingElse: 'foobar' }
  [Error: Sub once to channel requestID-123456:request:dataPart2 timed out! =( ]
  [Error: Sub once to channel requestID-123456:request:dataPart3 timed out! =( ]
  */
```

#### - subscribeOnceOf -
Subscribe to all of the channels provided but as soon as the first message is received from any
channel then unsubscribe from all the provided channels.

This accepts a single channel as a string or multiple channels as an Array.

**Parameters:**
 - **channels**: `String || Array` , A string or array of strings of channels to subscribe to.
 - **listener**: `Function` , Your event listener.
 - **subscribedCallback**: `Function` , callback to be called once subscribed, first param is an error.
 - **timeout**: `Number` , **Optional** timeout ms - timeout after specified length of time, listener is called with a timeout event (`event.timeout`).

**Example:**
```javascript
  RediBox.subscribeOnceOf([
    'requestID-123456:request:success',
    'requestID-123456:request:error', // not sure why you'd do this, but you get the idea
  ], function (message) { // on message received listener
    if (message.timeout) {
      return console.error(new Error(`Sub once of channel ${message.channel} timed out! =( `));
    }
    console.log('I received a message \\o/:');
    // insert success kid meme
    console.dir(message.channel); // channel name
    console.dir(message.timestamp); // when the message was received
    console.dir(message.data); // JSON parsed data
  }, function (err) { // on subscribed callback
    if (!err) {
      console.log('Subscribed once of multiple channels!');

      // test publish to just one channel, the rest will unsub after receiving this
      RediBox.publish('requestID-123456:request:success', {
        someArray: [1, 2, 3, 4, 5],
        somethingElse: 'foobar'
      });
    }
  }, 3000); // I want an event back within 3 seconds for any channel before they all timeout

  /**
  CONSOLE OUTPUT:

  Subscribed once of multiple channels!
  I received a message \o/:
  'requestID-123456:request:success'
  1453677089
  { someArray: [ 1, 2, 3, 4, 5 ], somethingElse: 'foobar' }
  */
```

#### - subscribe -
Equivalent to node's EventEmiiter.on() with an optional **subscribedCallback** to let you know when subscribed. This accepts a single channel as a string or multiple channels as an Array.

**Parameters:**
 - **channels**: `String || Array` , A string or array of strings of channels to subscribe to.
 - **listener**: `Function` , Your event listener.
 - **subscribedCallback**: `Function` , callback to be called once subscribed, first param is an error.

**Example:**
```javascript
  RediBox.subscribe('getMeSomeDataMrWorkerServer', function (message) { // your listener
    console.log('I received a message \\o/:');
    console.dir(message.channel); // channel name
    console.dir(message.timestamp); // when the message wa received
    console.dir(message.data); // JSON parsed data
  }, function (err) { // subscribed callback
    if (!err) {
      // test publish to this channel
      // this is normally sent from somewhere else
      RediBox.publish('getMeSomeDataMrWorkerServer', {
        someData: [1, 2, 3, 4, 5],
        worker: 'serverXYZ'
      });
    }
  });

  /**
  CONSOLE OUTPUT:

  I received a message \o/:
  'getMeSomeDataMrWorkerServer'
  1453678851
  { someData: [ 1, 2, 3, 4, 5 ], worker: 'serverXYZ' }

  */
```



#### - unsubscribe -
Unsubscribe from single or multiple channels. Note that even though listener is optional, you should pass the original listener function that you provided when you subscribed to those channels - if available (see example below).

**Parameters:**
 - **channels**: `String || Array` , A string or array of strings of channels to unsubscribe from.
 - **listener**: `Function` , **Optional** event listener.
 - **unsubscribedCallback**: `Function` , **Optional** callback to be called once unsubscribed, first param is an error.

**Example:**
```javascript
  // your on message received listener
  const myListener = function (message) {
    console.log(message.data); // HELLO but not GOODBYE gets logged
  };

  RediBox.subscribe('getMeSomeDataMrWorkerServer', myListener, function (err) {
    if (!err) {
      RediBox.publish('getMeSomeDataMrWorkerServer', 'HELLO');
      // some time later on:
      setTimeout(function () {
        RediBox.unsubscribe('getMeSomeDataMrWorkerServer', myListener);
        RediBox.publish('getMeSomeDataMrWorkerServer', 'GOODBYE');
      }, 2000);
    }
  });

  /**
  CONSOLE OUTPUT:

    HELLO
  */
```

#### - publish -
Publishes a message to single or multiple channels. Non string values automatically get JSON stringified.

**Parameters:**
 - **channels**: `String || Array` , A string or array of strings of channels to publish to.
 - **message**: `String || Object` , **Optional** event listener.
 - **publishedCallback**: `Function` , **Optional** callback to be called once published, first param is an error.

**Example:**
```javascript
  RediBox.publish('someChannel', 'HELLO');

  // or with objects:
  RediBox.publish('someChannel', {
    foo: 'bar'
  });
```

## RediBox Hooks

Redibox also has plenty of hook modules to support many of the common Redis use cases.

 - [Cache](https://github.com/redibox/cache)
 - [Job](https://github.com/redibox/job)
 - [Schedule](https://github.com/redibox/schedule)
 - [Lock](https://github.com/redibox/lock)
 - [IPC](https://github.com/redibox/ipc)
 - [Throttle](https://github.com/redibox/throttle)

If you want to publish your own module and list it here just follow the general setup/structure of
the default modules above, publish it and submit a PR to list it on the readme.

*TODO: RediBox Module template / example repo.*

### Example Custom Hook

```javascript
import { BaseHook } from 'redibox';

// just need to extend BaseHook
export default class CoolHook extends BaseHook {
  constructor() {
    // super with the hook name
    // also used for the hooks key name
    super('cool');
  }

  /**
   * This is called when redibox is ready to init this hook.
   * Do all your bootstrapping here.
   * @returns {Promise.<T>}
   */
  initialize() {
    // this.core - the redibox core instance
    // this.log - the redibox core logger, auto prefixes with hook name
    // this.options - the user provided options pre-merged with defaults from this.defaults()
    // this.defaultClient -  the default redis client that redibox core uses
    // this.clients - where all this hooks custom redis clients live

    this.log.info(this.options);
    return new Promise((resolve) => {
      // create new redis client connections if needed
      this.createClient('coolClient', false, () => {
        // you now have a client at 'this.clients.coolClient'
        resolve();
      });
    });
  }

	/**
   * Return the default config - core will automatically merge this with the
   * user provided options for this hook.
   * @returns {{someDefaultThing: string}}
   */
  defaults() {
    return {
      someDefaultThing: 'moo',
    };
  }

	/**
   * Add whatever you want
   * @param bool
   */
  isThisCoolOrWhat(bool) {
    this.log.info(bool ? 'yes this is cool' : 'erm nah');
  }

}
```

## Contributing

Full contributing guidelines are to be written, however please ensure you follow these points when sending in PRs:

- Ensure no lint warnings occur via `npm run lint`.
- Implement tests for new features / functionality.
- Ensure coverage remains above 90% and does not decrease.
- Use verbose logging throughout for ease of debugging issues, see core.js for example.
- New modules should follow the same format as the default modules / template.

**Note:** For debugging purposes you may want to enable verbose logging via the config:

```javascript
  new RediBox({
    log: {
      level: 'verbose'
    }
  });
```

## License

MIT
