import { Effect, Layer, Ref } from "effect";

// 1. Define the service interface
class WeatherService extends Effect.Service<WeatherService>()(
  "WeatherService",
  {
    sync: () => ({
      getForecast: (city: string) => Effect.succeed(`Sunny in ${city}`),
    }),
  }
) {}

// 2. The "Live" implementation that is slow
const WeatherServiceLive = Layer.succeed(
  WeatherService,
  WeatherService.of({
    getForecast: (city) =>
      Effect.succeed(`Sunny in ${city}`).pipe(
        Effect.delay("2 seconds"),
        Effect.tap(() => Effect.log(`Fetched live forecast for ${city}`))
      ),
  })
);

// 3. The Caching Wrapper Layer
const WeatherServiceCached = Layer.effect(
  WeatherService,
  Effect.gen(function* () {
    // It REQUIRES the original WeatherService
    const underlyingService = yield* WeatherService;
    const cache = yield* Ref.make(new Map<string, string>());

    return WeatherService.of({
      getForecast: (city) =>
        Ref.get(cache).pipe(
          Effect.flatMap((map) =>
            map.has(city)
              ? Effect.log(`Cache HIT for ${city}`).pipe(
                  Effect.as(map.get(city)!)
                )
              : Effect.log(`Cache MISS for ${city}`).pipe(
                  Effect.flatMap(() => underlyingService.getForecast(city)),
                  Effect.tap((forecast) =>
                    Ref.update(cache, (map) => map.set(city, forecast))
                  )
                )
          )
        ),
    });
  })
);

// 4. Compose the final layer. The wrapper is provided with the live implementation.
const AppLayer = Layer.provide(WeatherServiceCached, WeatherServiceLive);

// 5. The application logic
const program = Effect.gen(function* () {
  const weather = yield* WeatherService;
  yield* weather.getForecast("London"); // First call is slow (MISS)
  yield* weather.getForecast("London"); // Second call is instant (HIT)
});

Effect.runPromise(Effect.provide(program, AppLayer));
