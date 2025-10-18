import { Effect } from "effect"

const program = Effect.retry(task, { times: 3 })