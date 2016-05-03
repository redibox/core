# RediBox

![Coverage](https://img.shields.io/coveralls/salakar/redibox.svg)
![Downloads](https://img.shields.io/npm/dm/redibox.svg)
![Downloads](https://img.shields.io/npm/dt/redibox.svg)
![npm version](https://img.shields.io/npm/v/redibox.svg)
![dependencies](https://img.shields.io/david/salakar/redibox.svg)
![dev dependencies](https://img.shields.io/david/dev/salakar/redibox.svg)
![License](https://img.shields.io/npm/l/redibox.svg)

Ultimate redis toolbox for node. Built using ES6/ES7 features and as lightweight as possible with minimal dependencies.

## What can you do with RediBox?

RediBox offers out of the box support for many of the common Redis [use cases](#use-cases-and-modules). Not only that,
it also provides easy wrappers / utilities around redis client connection monitoring, scaling cluster reads with [`READONLY`](http://redis.io/commands/readonly)
and error handling.

**Currently available features:**
 - **[Caching](/src/modules/cache/README.md)**, including easy wrapper helpers, e.g `wrapPromise`, `wrapWaterlineQuery` (for sails), `wrapExpressRequest`
 - **Queues** and **jobs**. Lightweight polling free design with variable concurrency per queue and live progress tracking from any server (pubsubbed). Additionally you can create relay jobs that run multiple child jobs which relay resolved data to the next job in the chain.
 - **Redis Clusters** with optional cluster scaled slave reads.
 - **Advanced** Redis **PUBSUB** helpers such as `subscribeOnce` and `subscribeOnceOf` with a timeout.
 - Custom **LUA Commands** bootstrapping.

To see docs for each of the individual features see the [use cases](#use-cases-and-modules) section.

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

RediBox.on('ready' function(clientStatus) {
  rediBox.log.info(error); // internal redibox instance of winston if needed.
  // use cache module to set a cached value with a 60 second validity time.
  rediBox.cache.set('myKey', 'myVal', 60); // use a callback or a promise
});

RediBox.on('error' function(error) {
  rediBox.log.error(error); // internal redibox instance of winston if needed.
});
```


## RediBox Core

Provides the core set of utilities used by all plugins and can also be used in your own code, things such as creating a pre-configured error handled client and advanced PUBSUB.

For example, you can easily get a connected client to run your own redis commands:

```javascript
// ...
// init your RediBox instance here and check boot ready
// state / events here (as demonstrated in the previous example)
// ...

// get a client and run any redis commands you want on it.
RediBox.getClient().hgetall(...); // callback or promise

// alternatively if you're using a redis cluster and have set `redis.clusterScaleReads` to true
// then you can also use this to get a client for read only purposes that will read from
// your cluster slaves.
const RedisReadOnlyClient = RediBox.getReadOnlyClient();

RedisReadOnlyClient.hget(....); // callback or promise

// This will error though as you cannot issue a `write` command to a read only instance.
RedisReadOnlyClient.hset(....); // callback or promise
```

#### RediBox.quit();
Force close all redis client connections without waiting for any pending replies.

#### RediBox.disconnect();
Close all redis client connections but wait for any pending replies first.

#### RediBox.getReadOnlyClient();
Returns a redis client for read only purposes. This is useful for cluster mode where `redis.clusterScaleReads` is set to `true`. This client is able to read from redis cluster slaves.

#### RediBox.getClient();
Returns a read/write redis client.

#### static RediBox.isClientConnected(client);
Returns the connection state of the redis client provided.

## RediBox Core PUBSUB

RediBox core PUBSUB is more than just the standard ioredis/node_redis clients single 'message' event handler. It's setup to allow subscribing just like you would with a node event emitter. Internally though, RediBox has a on 'message' handler that routes pubsub messages to an event emitter which you're listening to when you subscribe, this gives you better control over channel flow.

### Methods


#### RediBox.subscribeOnce(channels: string|Array, listener, subscribedCallback, [Optional] timeout);

Subscribe once to single or multiple redis channels, i.e the same as node's EventEmitter.once(). On receiving the first event the client will automatically unsub (if no other subscribers) and remove your listener from the emitter. Cool huh? 'But wait, there is more!' - Not only can you subscribe for one event only, you can do so with a timeout also, i.e. I want one event from this channel within **5000 ms**, else let me know it timed out.

This accepts a single channel as a string or multiple channels as an Array.

Here's an advanced example with multiple channels and  timeout:
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
    console.dir(message.timestamp); // when the message wa received
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



#### RediBox.subscribe(channels: string|Array, listener, subscribedCallback);

Equivalent to node's EventEmiiter.on() with an optional **subscribedCallback** to let you know when subscribed. This accepts a single channel as a string or multiple channels as an Array.

Example:
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



#### RediBox.unsubscribe(channels: string|Array, [Optional] listener, [Optional] unsubscribedCallback);

Unsubscribe from single or multiple channels. Note that even though listener is optional, you should pass the original listener function that you provided when you subscribed to those channels - if available (see example below).

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




#### RediBox.publish(channels: string|Array, message, [Optional] publishedCallback);

Publishes a message to single or multiple channels. Non string values automatically get JSON stringified.

```javascript
  RediBox.publish('someChannel', 'HELLO');
  // or with objects:
  RediBox.publish('someChannel', {
    foo: 'bar'
  });
```

## Use Cases and Modules

 - [Cache](/src/modules/cache/README.md)



## Upcoming Features / TODO
 - **Distributed Locks** using the [Redlock](http://redis.io/topics/distlock) algorithm to `acquire`, `release` and `renew` locks. (base module already setup)
 - **Throttling**, limit something to X times per Y time period with one easy call, for example: api requests. (base module already setup)
 - **Time Series** want pretty stats and graphs? This will generate hits and allow easy querying of data with timestamp based range filtering. (base module already setup)
 - **Indexes** - http://redis.io/topics/indexes wrappers to aid using redis as a secondary index. (base module already setup)
 - Allow userland to load in their own modules via the module loader.


## Contributing

Full contributing guidelines are to be written, however please ensure you follow these points when sending in PRs:

- Ensure no lint warnings occur via `npm run lint`.
- Implement tests for new features / functionality (I'm guilty of not doing this at the moment)
- Use verbose logging throughout for ease of debugging issues, see core.js for example.
- New modules should follow the same format as the others, these get magically bootstrapped by the loader.

To add custom lua scripts to the modules simply create a `scripts.js` file (see the Cache module one for the layout) in the root of the module, the module loader will automatically define the commands on the clients, neat!

If you're creating a fresh module that's not in the todo list above, the simple copy one of the other modules and away you go, simples!

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
