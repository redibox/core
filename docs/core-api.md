## Core API

#### - quit -
Disconnects all redis clients but first waits for pending replies.

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
