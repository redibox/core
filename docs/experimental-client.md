## Experimental Client

For the moment redibox is just a wrapper around ioredis to provide the additional functionality required. 

We are actively working on the next redis client for node and it'll be the most performant client there is (see the benchmarks) and are aiming to have majority of the features ioredis has (e.g. clustering and sentinel support) along with redibox core baked right in (hooks api, natural node pubsub, cluster commander etc).

### Benchmarks
![image](https://cloud.githubusercontent.com/assets/5347038/18583376/276bc118-7c02-11e6-8efa-e131287ae503.png)

### What performance sorcery is this?

We built everything needed for a redis client ourselves with constant benchmarking to find the best performaning code.

**We've built:**
 - Fastest cluster key slot calculator - [Salakar/cluster-key-slot](https://github.com/Salakar/cluster-key-slot)
 - Fastest implementation of a double ended queue - [Salakar/denque](https://github.com/Salakar/denque)
 - Full re-write of the NodeRedis parser for performance (see @Salakar's commits/PRs) - [NodeRedis/parser](https://github.com/NodeRedis/node-redis-parser)
 - Auto-pipelining for all connections including clusters.

The code for the experimental client is currently private until we're happy it's ready for public use. If you want to contribute to it then please contact Salakar on [twitter](https://twitter.com/mikediarmid)
