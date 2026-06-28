// Local API server (run with `bun run api:dev`). Same Hono app the Lambda runs.
// Uses Bun's native fetch server (the default export) — @hono/node-server's
// socket teardown is incompatible with Bun's node:http shim.

import { app } from './handler'

const port = Number(process.env.PORT ?? 3101)

console.log(`atiom-leave API listening on http://localhost:${port}`)
console.log(
  `  auth mode: ${process.env.AUTH_MODE ?? 'local'} · dynamodb: ${
    process.env.DYNAMODB_ENDPOINT ?? '(aws default)'
  }`,
)

export default { port, fetch: app.fetch }
