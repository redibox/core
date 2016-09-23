## Core API

#### **quit**
Disconnects all redis clients but first waits for pending replies.

```javascript
RediBox.quit();
```
#### **disconnect**
Force Disconnects, will not wait for pending replies (use disconnect if you need to wait).

```javascript
RediBox.disconnect();
```
#### **isClientConnected**
  - **client** [Object] `RedisClient` , the redis client instance to check.

Returns `true` if connected or `false` if not.

#### **hostInfo**

Returns an object of details about this host, it's process and timestamps. Used for pubsub.
