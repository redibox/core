# RediBox

![Coverage](https://img.shields.io/coveralls/salakar/redibox.svg)
![Downloads](https://img.shields.io/npm/dm/redibox.svg)
![Downloads](https://img.shields.io/npm/dt/redibox.svg)
![npm version](https://img.shields.io/npm/v/redibox.svg)
![dependencies](https://img.shields.io/david/salakar/redibox.svg)
![dev dependencies](https://img.shields.io/david/dev/salakar/redibox.svg)
![License](https://img.shields.io/npm/l/redibox.svg)

Redis connection and PUBSUB subscription manager for node. Built for performance, powered by [ioredis](https://github.com/luin/ioredis).

## What can you do with RediBox?

RediBox offers out of the box support for clusters, sentinels and standalone redis servers. It also
provides easy utilities around redis client connection monitoring, scaling cluster
reads with [`READONLY`](http://redis.io/commands/readonly), advanced subscriptions via PUBSUB (in the
easy to use node.js Event Emitter format), lua script management and executing commands against a cluster.

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


## Core

#### - quit -
Disconnects the redis clients but first waits for pending replies.

#### - disconnect -
Force Disconnects, will not wait for pending replies (use disconnect if you need to wait).

#### - getReadOnlyClient -
Returns a redis client for read only purposes. This is useful for cluster mode where `redis.clusterScaleReads` is set to `true`. This client is able to read from redis cluster slaves.

#### - getClient -
Returns a read/write redis client.

#### - isClientConnected -
Returns the connection state of the redis client provided.

**Parameters:**
 - **client**: `Client instnace` , the redis client instance to check.

**Returns**: `Boolean`


## Cluster


## Subscriptions / PUBSUB

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

## RediBox Modules

Redibox also has plenty of add-on modules to support many of the common Redis use cases.

 - [Cache](https://github.com/redibox/cache)
 - [Job](https://github.com/redibox/job)
 - [Schedule](https://github.com/redibox/schedule)
 - [Lock](https://github.com/redibox/lock)
 - [IPC](https://github.com/redibox/ipc)
 - [Throttle](https://github.com/redibox/throttle)

If you want to publish your own module and list it here just follow the general setup/structure of
the default modules above, publish it and submit a PR to list it on the readme.

*TODO: RediBox Module template / example repo.*

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
