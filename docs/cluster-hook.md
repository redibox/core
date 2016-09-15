## Cluster Utils

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
