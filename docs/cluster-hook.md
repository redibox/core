## Cluster Hook

#### Proxy commands to all cluster nodes

All redis commands can be called against `RediBox.cluster...` for example `RediBox.cluster.flushall()`. Commands you run like this are sent to all `master` nodes.

**Example**:

```javascript
import Redibox from 'redibox';

const RediBox = new Redibox({
  redis: {
    hosts: [
      // MASTERS
      { host: '127.0.0.1', port: 30001 },
      { host: '127.0.0.1', port: 30002 },
      { host: '127.0.0.1', port: 30003 },
      // SLAVES
      { host: '127.0.0.1', port: 30004 },
      { host: '127.0.0.1', port: 30005 },
      { host: '127.0.0.1', port: 30006 },
    ],
  },
});

RediBox.on('ready' () => {
  console.log('I AM READY');
  // flush all on masters
  RediBox.cluster.flushall().then(result => {
    console.dir(result);
  });
});

// CONSOLE OUTPUT:
/*
  I AM READY
  [
    'OK',
    'OK',
    'OK'
  ]
*/
```


### Utils
---

#### - exec -
Send a command to all cluster master nodes. This is what the proxy above uses internally.

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


#### - getNodes -
Returns an array of all master and slave node addresses that we are connected to.

**Returns**: `Array<String>`

**Example**:
```javascript
  console.dir(RediBox.cluster.getNodes());

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

#### - getSlaves -
Returns an array of all the slave node addresses.

**Returns**: `Array<String>`

**Example**:
```javascript
  console.dir(RediBox.cluster.getSlaves());

  // logs:
  /*
   [
    '127.0.0.1:30004',
    '127.0.0.1:30005',
    '127.0.0.1:30006',
   ]
  */
```

#### - getMasters -
Returns an array of all the master node addresses.

**Returns**: `Array<String>`

**Example**:
```javascript
  console.dir(RediBox.cluster.getMasters());

  // logs:
  /*
   [
    '127.0.0.1:30001',
    '127.0.0.1:30002',
    '127.0.0.1:30003',
   ]
  */
```

#### - getNodeClient -
Returns the individual cluster node connection instance.
Returns 'false' if not found.

**Returns**: `RedisClient || false`

**Example**:
```javascript
  const slave4Client = RediBox.cluster.getNodeClient('127.0.0.1:30004');

  if (slave4Client) {
    // do something with the client
    slave4Client.hgetall(...args);
  }
```


#### - isCluster -
Returns true or false if this instances of core is a cluster connection.

**Returns**: `true || false`

