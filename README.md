# RediBox

[![Coverage Status](https://coveralls.io/repos/github/redibox/core/badge.svg?branch=master)](https://coveralls.io/github/redibox/core?branch=master)
![Downloads](https://img.shields.io/npm/dt/redibox.svg)
[![npm version](https://img.shields.io/npm/v/redibox.svg)](https://www.npmjs.com/package/redibox)
[![dependencies](https://img.shields.io/david/redibox/core.svg)](https://david-dm.org/redibox/core)
[![build](https://travis-ci.org/redibox/core.svg)](https://travis-ci.org/redibox/core)
[![License](https://img.shields.io/npm/l/redibox.svg)](/LICENSE)

Redis connection and PUBSUB subscription manager for node. Built for performance, powered by [ioredis](https://github.com/luin/ioredis) ([for now](/docs/experimental-client)).

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

## Documentation

- [Core API](/docs/core-api.md)
- [Cluster Hook](/docs/cluster-hook.md)
- [Pubsub Hook](/docs/pubsub-hook.md)
- [Extending functionality via Hooks](/docs/creating-custom-hooks.md)

## Hooks

RediBox has a built in hook loading system and has plenty of published hook modules that support many of the common Redis use cases and provide additional functionality.

#### RediBox Hooks
 - [Cache](https://github.com/redibox/cache) - Redis as a cache layer made simple.
 - [Job](https://github.com/redibox/job) - High performance, robust and flexible queue/worker system powered by redis.
 - [Memset](https://github.com/redibox/memset) - Synchronised data sets stored in memory across all servers - for quick synchronous access to data that is commonly used but not likely to update frequently.
 - [Schedule](https://github.com/redibox/schedule) - Cross server task scheduling made easy.
 - [Throttle](https://github.com/redibox/throttle) - Provides lua scripts to throttle things, i.e. 100 inbound http reqs per user every 10secs
 - [Trend](https://github.com/redibox/trend) - Track trending data with Node - using Bitly Forget-Table type data structures.

#### Public User Hooks

- None

If you would like to publish your own hook and list it here see the [extending functionality via Hooks](/docs/creating-custom-hooks.md) documentation, once published submit a PR to list it on the readme here.

## Contributing

Full contributing guidelines are to be written, however please ensure you follow these points when sending in PRs:

- Ensure no lint warnings occur via `npm run lint`.
- Implement tests for new features / functionality.
- Ensure coverage remains above 80% and does not decrease.
- Use debug logging throughout for ease of debugging issues, see core.js for example.
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
