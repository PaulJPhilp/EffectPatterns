import { Effect, Scope } from "effect";
import { LoggerService } from "./LoggerService";

/**
 * Resource Management Utilities
 * Provides comprehensive resource cleanup patterns and scope management
 */

export interface Resource<A> {
  readonly value: A;
  readonly cleanup: () => Effect.Effect<void>;
}

export interface ResourcePool<A> {
  readonly acquire: () => Effect.Effect<A>;
  readonly release: (resource: A) => Effect.Effect<void>;
  readonly maxSize: number;
}

/**
 * Create a managed resource that will be cleaned up automatically
 */
export const createManagedResource = <A>(
  acquire: Effect.Effect<A>,
  release: (resource: A) => Effect.Effect<void>
): Effect.Effect<A, never, Scope> => {
  return Effect.acquireRelease(acquire, release);
};

/**
 * Cleanup utilities for common resource types
 */
export const ResourceManagement = Effect.gen(function* () {
  const logger = yield* LoggerService;

  /**
   * Track resource lifecycle
   */
  const trackResourceLifecycle = <A>(
    name: string,
    acquire: Effect.Effect<A>,
    release: (resource: A) => Effect.Effect<void>
  ): Effect.Effect<A, never, Scope> => {
    return Effect.acquireRelease(
      Effect.gen(function* () {
        yield* logger.info(`Acquiring resource: ${name}`);
        const resource = yield* acquire;
        yield* logger.debug(`Resource acquired: ${name}`);
        return resource;
      }),
      (resource) =>
        Effect.gen(function* () {
          yield* logger.info(`Releasing resource: ${name}`);
          yield* release(resource);
          yield* logger.debug(`Resource released: ${name}`);
        })
    );
  };

  /**
   * Create a cleanup hook that runs on scope exit
   */
  const onScopeExit = (name: string, cleanup: Effect.Effect<void>) =>
    Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* logger.info(`Running cleanup hook: ${name}`);
        yield* cleanup;
        yield* logger.debug(`Cleanup hook completed: ${name}`);
      })
    );

  /**
   * Execute effect with guaranteed cleanup
   */
  const executeWithCleanup = <A>(
    effect: Effect.Effect<A, never, Scope>,
    cleanup: Effect.Effect<void>
  ): Effect.Effect<A> => {
    return Effect.scoped(
      effect.pipe(
        Effect.andThen((result) =>
          Effect.gen(function* () {
            yield* logger.debug("Setting up cleanup");
            yield* onScopeExit("effect-cleanup", cleanup);
            return result;
          })
        )
      )
    );
  };

  /**
   * Manage multiple resources with automatic cleanup
   */
  const manageResources = <A extends readonly any[]>(
    resources: {
      readonly [K in keyof A]: {
        readonly acquire: Effect.Effect<A[K]>;
        readonly release: (resource: A[K]) => Effect.Effect<void>;
        readonly name: string;
      };
    }
  ): Effect.Effect<A, never, Scope> => {
    return Effect.gen(function* () {
      const acquired: any[] = [];

      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        const value = yield* trackResourceLifecycle(
          resource.name,
          resource.acquire,
          resource.release
        );
        acquired.push(value);
      }

      return acquired as A;
    });
  };

  /**
   * Release all resources in reverse order
   */
  const releaseAll = <A>(
    resources: Array<{ value: A; cleanup: () => Effect.Effect<void> }>
  ): Effect.Effect<void> => {
    return Effect.gen(function* () {
      yield* logger.info(
        `Releasing ${resources.length} resources in reverse order`
      );

      // Release in reverse order (LIFO)
      for (let i = resources.length - 1; i >= 0; i--) {
        const resource = resources[i];
        yield* resource.cleanup();
      }

      yield* logger.info("All resources released");
    });
  };

  /**
   * Create a resource that tracks its own lifecycle
   */
  const createTrackedResource = <A>(
    name: string,
    acquire: Effect.Effect<A>,
    release: (resource: A) => Effect.Effect<void>
  ): Effect.Effect<Resource<A>, never, Scope> => {
    return Effect.gen(function* () {
      yield* logger.info(`Creating tracked resource: ${name}`);

      const resource = yield* trackResourceLifecycle(name, acquire, release);

      yield* logger.debug(`Tracked resource created: ${name}`);

      return {
        value: resource,
        cleanup: () =>
          Effect.gen(function* () {
            yield* logger.info(`Cleaning up tracked resource: ${name}`);
            yield* release(resource);
          }),
      } as const;
    });
  };

  /**
   * Ensure cleanup even on error
   */
  const ensureCleanup = <A>(
    effect: Effect.Effect<A>,
    cleanup: Effect.Effect<void>
  ): Effect.Effect<A> => {
    return effect.pipe(
      Effect.tap(() => cleanup),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* cleanup;
          return yield* Effect.fail(error);
        })
      )
    );
  };

  /**
   * Create a resource pool for managing multiple instances
   */
  const createResourcePool = <A>(
    acquire: Effect.Effect<A>,
    release: (resource: A) => Effect.Effect<void>,
    maxSize: number = 10
  ): ResourcePool<A> => {
    const resources: A[] = [];

    return {
      acquire: () =>
        Effect.gen(function* () {
          if (resources.length > 0) {
            yield* logger.debug(
              `Reusing pooled resource (${resources.length} available)`
            );
            return resources.pop()!;
          }

          yield* logger.debug(
            `Creating new resource for pool (size: ${resources.length}/${maxSize})`
          );

          if (resources.length >= maxSize) {
            yield* logger.warn(`Resource pool at max size (${maxSize})`);
          }

          return yield* acquire;
        }),

      release: (resource: A) =>
        Effect.gen(function* () {
          if (resources.length < maxSize) {
            yield* logger.debug("Returning resource to pool");
            resources.push(resource);
          } else {
            yield* logger.debug("Pool full, discarding resource");
            yield* release(resource);
          }
        }),

      maxSize,
    };
  };

  /**
   * Monitor resource usage
   */
  const monitorResources = <A>(
    name: string,
    effect: Effect.Effect<A, never, Scope>
  ): Effect.Effect<A, never, Scope> => {
    const startTime = Date.now();

    return Effect.gen(function* () {
      yield* logger.info(`Starting resource monitoring: ${name}`);

      const result = yield* effect;

      const duration = Date.now() - startTime;
      yield* logger.info(`Resource monitoring complete: ${name}`, {
        duration,
        durationMs: duration,
      });

      return result;
    });
  };

  /**
   * Create scope-dependent cleanup
   */
  const withScope = <A>(
    effect: (scope: Scope) => Effect.Effect<A, never, Scope>
  ): Effect.Effect<A> => {
    return Effect.scoped(
      Scope.make().pipe(
        Effect.andThen((scope) => effect(scope))
      )
    );
  };

  return {
    trackResourceLifecycle,
    onScopeExit,
    executeWithCleanup,
    manageResources,
    releaseAll,
    createTrackedResource,
    ensureCleanup,
    createResourcePool,
    monitorResources,
    withScope,
  } as const;
});

export const ResourceManagementLayer = Effect.Service.layer(
  ResourceManagement
);
