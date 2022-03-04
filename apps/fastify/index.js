const newrelic = require('newrelic')

const { Agent } = require('undici')

const fastify = require('fastify')({
  logger: false
})

const agent = new Agent({
  pipelining: 1,
  connections: 50,
  keepAliveTimeout: 3000
})

async function makeRequests() {
  try {
    await makeRequest(3002, '/delay/5')
  } catch (error) { // Need to catch this so requests can continue
    console.error(error)
  }

  const result = await Promise.all([
    // 3003 is all that is required. Can comment-out 3004 to get all stacking under single transaction.
    // Will get stacking of /repro/repro... in naming if you use multiple endpoints.
    makeRequest(3003, '/delay/4'),
    makeRequest(3004, '/delay/8')
  ])

  // The one below this was also able to get to reproduce without the crashing behavior
  // but can take anywhere from 15 min to 2+ hours

  // const randomValue = Math.floor(Math.random() * 10) + 1
  // const variableDelay = randomValue === 10 ? 1500 : 500
  // const result = await Promise.all([
  //   makeRequest(3000, '/delay/100'),
  //   makeRequest(port, `/delay/${variableDelay}`),
  //   makeRequest(3002, '/delay/400'),
  //   makeRequest(3003, '/delay/80')
  // ])

  return result
}

async function makeRequest(port, path) {
  const {
    statusCode,
    headers,
    body
  } = await agent.request({
    origin: `http://localhost:${port}`,
    path: path,
    method: 'GET'
  })

  return body
}

fastify.get('/repro', async function reproHandler(req, reply) {
  const results = await makeRequests()

  reply.type('application/json').code(200)
  return { processed: true }
})

fastify.get('/', async (request, reply) => {
  reply.type('application/json').code(200)
  return { hello: 'world' }
})

const port = process.env.PORT || 3001

fastify.listen(port, (err, address) => {
  if (err) {
    throw err
  }
  console.log(`Fastify server is now listening on ${address}`)
})
