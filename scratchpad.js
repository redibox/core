const fork = require('wtfork').fork;
let tries = 0;
let dispatcher = null;
const config = {

  redis: {
    cluster: true,
    prefix: 'test',
    clusterScaleReads: false,
    subscriber: true, // enables pubsub subscriber client
    publisher: true,  // enables pubsub publisher client
    hosts: [
      {
        host: '127.0.0.1',
        port: 30001,
      },
      {
        host: '127.0.0.1',
        port: 30002,
      },
      {
        host: '127.0.0.1',
        port: 30003,
      },
      {
        host: '127.0.0.1',
        port: 30004,
      },
      {
        host: '127.0.0.1',
        port: 30005,
      },
      {
        host: '127.0.0.1',
        port: 30006,
      },
    ],
  },
  job: {
    prefix: 'job',
    enabled: true,
    queues: [
      { name: 'test', concurrency: 25 },
      // {name: 'test1', concurrency: 25},
      // {name: 'test2', concurrency: 25},
      // {name: 'meow', concurrency: 25}
    ],
  },
  cache: {
    enabled: true,
    prefix: 'cache',
    defaultTTL: 600
  },
  schedule: {
    enabled: true
  },
  log: {
    level: 'verbose',
  },

};

// class DispatcherParent {
//   getConfig() {
//     return new Promise((resolve) => {
//       resolve(config);
//     });
//   }
// }
//
// function forkDispatcher() {
//   dispatcher = fork('./lib/modules/schedule/dispatcher/process.js', [], {}, new DispatcherParent());
//   const dispatchReadyTimeout = setTimeout(function () {
//     console.error('RediBox: Dispatcher failed to start, no redis ready status received, retrying...');
//     dispatcher.kill('SIGTERM');
//     tries++;
//     if (tries < 3) {
//       forkDispatcher();
//     } else {
//       console.error('RediBox: failed to start dispatcher process after 3 attempts.');
//     }
//   }, 2000);
//
//   dispatcher.child.on('redibox:ready', function (status) {
//     clearTimeout(dispatchReadyTimeout);
//     console.log(status);
//   });
//
//   dispatcher.on('close', (code, signal) => {
//     console.log(`child process exited with code ${code} and signal ${signal}`);
//   });
// }
//
// forkDispatcher();
//
// return;

const babylon = require('babylon');
const vm = require('vm');

const parseFunc = function (functionSource) {
  let body = '';
  const params = [];
  const testData = JSON.stringify({ a: 1, b: 2, c: { cc: 1 } });
  const prefix = `
    // create local instances of the globals
    const Job = this.job;
    const Cache = this.cache;
    const Lock = this.lock;
    const Throttle = this.throttle;
    const TimeSeries = this.timeseries;
    const RediBox = this;
    
    // wrap schedule code in a promise
    return new Promise(function (_resolveSchedule, _rejectSchedule) {
      const schedule = {
        resolve: _resolveSchedule,
        reject: _rejectSchedule,
        data: ${testData},
        callback: function (err, result) {
          if (err) return _rejectSchedule(err);
          return _resolveSchedule(result);
        }
      };
   `;

  const postfix = `  
    });
   `;

  const func = functionSource.toString();
  // run through babel
  let funcParsed = babylon.parse(func, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'flow',
      'objectRestSpread',
      'classProperties',
    ],
  }).program.body[0];

  // console.dir(funcParsed);

  if (funcParsed.type === 'ExpressionStatement') {
    funcParsed = funcParsed.expression;
  }

  if (functionSource.length && funcParsed.params && funcParsed.params.length) {
    funcParsed.params.forEach(param => params.push(param.name));
  }

  if (funcParsed.body.type === 'BlockStatement') {
    body = func.substr(funcParsed.body.start + 1, (funcParsed.body.end - funcParsed.body.start) - 2);
  } else {
    body = func.substr(funcParsed.body.start, funcParsed.body.end);
  }

  return {
    body: prefix + body.replace(/\n/g, '\n    ') + postfix,
    parameters: params,
  };
};

/* eslint no-new-func:0 */
const toFunction = raw => new Function(raw.parameters, raw.body);


const testA = parseFunc(function test(moo, meow) {
  console.log('test');
  console.log('test');
  console.log('test');
  console.log('test');
  console.log(moo, meow);
});

const testB = parseFunc((moo, meow) => {
  console.log('inside promise');
  console.log(moo);
  console.log(schedule.data);
  console.log(meow);
  schedule.resolve(1234567);
});

console.log(testB.body);
// console.log('');
// console.dir(testB.parameters);

const NewFunc = toFunction(testB);
console.log(NewFunc.name);
console.log(NewFunc.name);
console.log(NewFunc.name);
console.log(NewFunc.name);

NewFunc('moo', 'meow').then(function (data) {
  console.dir(data);
}).catch(function (error) {

});
