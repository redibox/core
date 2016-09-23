## Core API

#### - quit -
Disconnects all redis clients but first waits for pending replies.

#### - disconnect -
Force Disconnects, will not wait for pending replies (use disconnect if you need to wait).

#### - isClientConnected -
Returns the connection state of the redis client provided.

**Parameters:**
 - **client**: `RedisClient` , the redis client instance to check.

**Returns**: `Boolean` , true if connected.
