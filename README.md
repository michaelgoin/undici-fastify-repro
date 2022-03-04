# Undici + Fastify State Conflation Reproduction

This repository represents a reproduction of state-conflation using fastify and undici. State conflation is when a segment from a transaction is incorrectly propagated into the context of another transaction (or what should be another transaction). In this case, a segment is in context at the point where we should be creating a new transaction (although may have cross-transaction cases too). It has yet to be determined if the problem is related specifically to undici, fastify or the combination of the two.

Running the provided npm script(s) will reproduce the issue which can be observed via the fastify application's agent log file.

By default, this will reproduce a flavor of the issue that results both in state conflation but also appending of multiple paths onto transaction names. A sing-transaction reuse issue can be observed by commenting out one of the asynchronous endpoint calls. A code comment has been left near this code in `./apps/fastify/index.js`.

The fastify application launches with the following settings:

```
NEW_RELIC_FEATURE_FLAG_NEW_PROMISE_TRACKING=true
NEW_RELIC_FEATURE_FLAG_UNRESOLVED_PROMISE_CLEANUP=false
NEW_RELIC_FEATURE_FLAG_UNDICI_INSTRUMENTATION=true
NEW_RELIC_FEATURE_FLAG_UNDICI_ASYNC_TRACKING=false
```

**WARNING: Keep these in mind if you run your own load over long durations**
  * Transactions can get big enough to cause the garbage collector to crash. The default run time is much too low for that.
  * Similarly, each transaction reuse will get logged at warn level which could result in significant logging over a long period of time.

## Installing Dependencies

`npm install` can be ran at the root of the repository.

After the root-level dependencies have been installed, the install scripts for the fastify and express applications will automatically run via the `postinstall` script.

## Running the reproduction

`npm run start` from repository root supplying a license key (and `NEW_RELIC_HOST` if using non-prod or mocked back-end).

`NEW_RELIC_LICENSE_KEY=<your license> npm run start`

* Launches fastify application using undici
* Launches express instance with endpoint that eventually hangs then shuts down
* Launches multiple express instances that run normally
* Launches autocannon to generate traffic for 1 minute.

The fastify application will output certain undici errors to the console for timeouts, etc. to the hanging and closing endpoint. This is expected.

Once execution has completed, autocannon output will print to the screen.

`CTRL + C` to terminate the remaining processes.

## Verifying

In `./apps/fastify`, open the `newrelic_agent.log` file.

You should see a number of warn-level logs similar to:

```json
{"msg":"Active transaction when creating non-nested transaction","component":"tracer","transaction":{"id":"105dde7493acdc1e","name":"WebFrameworkUri/Fastify/GET//repro/repro"},"segment":"/repro"}
{"msg":"Active transaction when creating non-nested transaction","component":"tracer","transaction":{"id":"b33cb9973a282b2a","name":"WebFrameworkUri/Fastify/GET//repro"},"segment":"WebTransaction/WebFrameworkUri/Fastify/GET//repro"}
{"msg":"Active transaction when creating non-nested transaction","component":"tracer","transaction":{"id":"90551507af9da0ba","name":"WebFrameworkUri/Fastify/GET//repro"},"segment":"WebTransaction/WebFrameworkUri/Fastify/GET//repro"}
{"msg":"Active transaction when creating non-nested transaction","component":"tracer","transaction":{"id":"90551507af9da0ba","name":"WebFrameworkUri/Fastify/GET//repro"},"segment":"WebTransaction/WebFrameworkUri/Fastify/GET//repro"}
{"msg":"Active transaction when creating non-nested transaction","component":"tracer","transaction":{"id":"90551507af9da0ba","name":"WebFrameworkUri/Fastify/GET//repro"},"segment":"WebTransaction/WebFrameworkUri/Fastify/GET//repro"}
{"msg":"Active transaction when creating non-nested transaction","component":"tracer","transaction":{"id":"2337dddcdf334cff","name":"WebFrameworkUri/Fastify/GET//repro"},"segment":"External/localhost:3004/delay/8"}
```
