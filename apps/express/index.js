const newrelic = require('newrelic')
const http = require('http')

const express = require('express');
const app = express()

app.get('/', function(req, res, next) {
  res.json({ hello: 'world' })
});

app.get('/delay/:delayMs', (req, res, next) => {
  const delay = req.params.delayMs

  setTimeout(() => {
    res.send(`waited for ${delay}ms`)
  }, delay)
})

const port = process.env.PORT || '3000'

if (process.env.HANG) {
  console.log('Patching http server to hang then exit after delay')
  monkeyPatch()
}

app.listen(port, () => {
  console.log(`Express receiver listening on port: ${port}`)
})

const REQUEST_WARMUP = 1000
const LOOP_UNTIL_COUNT = 10000000000

function monkeyPatch() {
  const orig = http.Server.prototype.emit

  let requestCount = 0

  http.Server.prototype.emit = function expressAppEmitOverride(eventName) {
    if (eventName === 'request') {
      if (requestCount > REQUEST_WARMUP) {
        console.log('infinite looping then exiting')
        let count = 0
        while (true) {
          count++
          if (count > LOOP_UNTIL_COUNT) {
            console.log('process.exit()')
            process.exit()
          }
        }
      } else if (requestCount <= REQUEST_WARMUP) {
        requestCount++
      }
    }

    return orig.apply(this, arguments)
  }
}
