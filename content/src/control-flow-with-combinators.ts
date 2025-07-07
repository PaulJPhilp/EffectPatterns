import { Effect } from "effect"

const attemptAdminAction = (user: { isAdmin: boolean }) =>
  Effect.if(user.isAdmin, {
    onTrue: () => Effect.succeed("Admin action completed."),
    onFalse: () => Effect.fail("Permission denied.")
  })

const program = Effect.gen(function* () {
  // Try with admin user
  yield* Effect.logInfo("\nTrying with admin user...")
  const adminResult = yield* Effect.either(attemptAdminAction({ isAdmin: true }))
  yield* Effect.logInfo(`Admin result: ${adminResult._tag === 'Right' ? adminResult.right : adminResult.left}`)

  // Try with non-admin user
  yield* Effect.logInfo("\nTrying with non-admin user...")
  const userResult = yield* Effect.either(attemptAdminAction({ isAdmin: false }))
  yield* Effect.logInfo(`User result: ${userResult._tag === 'Right' ? userResult.right : userResult.left}`)
})

Effect.runPromise(program)