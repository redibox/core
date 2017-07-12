# RediBox

[![Coverage Status](https://coveralls.io/repos/github/redibox/core/badge.svg?branch=master)](https://coveralls.io/github/redibox/core?branch=master)
![Downloads](https://img.shields.io/npm/dt/redibox.svg)
[![npm version](https://img.shields.io/npm/v/redibox.svg)](https://www.npmjs.com/package/redibox)
[![dependencies](https://img.shields.io/david/redibox/core.svg)](https://david-dm.org/redibox/core)
[![build](https://travis-ci.org/redibox/core.svg)](https://travis-ci.org/redibox/core)
[![License](https://img.shields.io/npm/l/redibox.svg)](/LICENSE)

Redis connection and PUBSUB subscription manager for node. Built for performance, powered by [ioredis](https://github.com/luin/ioredis) ([for now](/docs/experimental-client.md)). Maintained by [TeamFA](https://github.com/teamfa).

## What is it?

RediBox is a NodeJS library which interacts with Redis to provide solutions to common use-cases in your application. It features out of the box support for clusters, sentinels or standalone redis servers. RediBox core provides utilities for managing your Redis client including client connection monitoring, advanced subscriptions via PUBSUB, lua script management and more.

### Features

The additional features RediBox offers are provided as [extensible hooks](/docs/creating-custom-hooks.md) which can be used on a per project level:

 - [Cache](https://github.com/redibox/cache) - Flexible data caching service.
 - [Job](https://github.com/redibox/job) - High performance, robust and flexible queue/worker system.
 - [Schedule](https://github.com/redibox/schedule) - Cross server task scheduling.
 - [Memset](https://github.com/redibox/memset) - Synchronised data sets stored in memory across all servers - for quick synchronous access to data that is commonly used but not likely to update frequently.
 - [Throttle](https://github.com/redibox/throttle) - Provides lua scripts to throttle things, i.e. 100 inbound http reqs per user every 10secs
 - [Trend](https://github.com/redibox/trend) - Track trending data using Bitly Forget-Table type data structures.
 - [API](https://github.com/redibox/api) - A JSON API for RediBox (Work in progress).

## Getting Started

Install via npm:

```shell
npm install redibox --save
```

> If you're looking to integrate this with [SailsJS](http://sailsjs.org), we've got a [hook](https://github.com/redibox/sails-hook-redibox) for that.

And include in your project:

```javascript
// ES6
import Redibox from 'redibox';

const RediBox = new Redibox({
  redis: {
    port: 7777
  }
}); // optional callback for bootstrap ready status or use events:

RediBox.on('ready', clientStatus => {
  RediBox.log.info(clientStatus); // internal redibox instance of winston if needed.
  // use cache module to set a cached value with a 60 second validity time.
  RediBox.hooks.cache.set('myKey', 'myVal', 60); // use a callback or a promise
});

RediBox.on('error', error => {
  RediBox.log.error(error); // internal redibox instance of winston if needed.
});
```

For an example of connecting to a cluster see the [Cluster Hook](/docs/cluster-hook.md) documentation.

## Configuration

See the [default config](https://github.com/redibox/core/blob/master/src/defaults.js) for all available configuration options.

## Documentation

- [Core API](/docs/core-api.md)
- [Cluster Hook](/docs/cluster-hook.md)
- [Pubsub Hook](/docs/pubsub-hook.md)
- [Extending via Hooks](/docs/creating-custom-hooks.md)
- [Experimental Redis Client](/docs/experimental-client.md)

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
