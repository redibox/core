## PubSub

RediBox core PUBSUB is more than just the standard redis clients single 'message' event handler. It's setup to allow subscribing just like you would with a node event emitter.

Internally though, RediBox has a on 'message' handler that routes pubsub messages to an event emitter which you're listening to when you subscribe, this gives you better control over channel flow.

#### - subscribeOnce -
Subscribe once to single or multiple redis channels, i.e the same as node's EventEmitter.once(). On
receiving the first event per channel the client will automatically unsub (if no other subscribers)
and remove the listener from the emitter.
Optionally you can also specify a timeout, e.g. I want one event from this channel within **5000 ms**, else let me know it timed out.

This accepts a single channel as a string or multiple channels as an Array.

**Parameters:**
 - **channels**: `String || Array` , A string or array of strings of channels to subscribe to.
 - **listener**: `Function` , Your event listener.
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
  } , 3000).then(() => { // on subscribed callback
    console.log('Subscribed once to multiple channels!');

    // test publish to just one channel, the rest will timeout
    // this is normally sent from somewhere else
    RediBox.publish('requestID-123456:request:dataPart1', {
      someArray: [1, 2, 3, 4, 5],
      somethingElse: 'foobar'
    });
  });

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

