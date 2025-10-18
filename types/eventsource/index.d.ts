declare module "eventsource" {
  interface EventSourceInit {
    readonly withCredentials?: boolean;
  }

  class EventSource {
    constructor(url: string, eventSourceInitDict?: EventSourceInit);
    readonly url: string;
    readonly readyState: number;
    readonly withCredentials: boolean;
    onopen: ((this: EventSource, ev: MessageEvent) => unknown) | null;
    onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null;
    onerror: ((this: EventSource, ev: Event) => unknown) | null;
    close(): void;
  }

  export { EventSource, EventSourceInit };
}
