graph TD
    subgraph "Step 2: Build Your Applications"
        A7["<strong>Layer 7: Your Application</strong><br/>(The final product you build)"]
        A6["<strong>Layer 6: Application SDKs</strong><br/>(Effect/AI, Effect/cli)"]
        A5["<strong>Layer 5: The Platform</strong><br/>(@effect/platform)"]
    end

    subgraph "Step 1: Build Your Services"
        subgraph "Layer 4: Service Architecture"
            B4["<strong>4b: Distributed Services</strong><br/>@effect/cluster, @effect/rpc, @effect/workflow"]
            A4["<strong>4a: Services</strong><br/>Layer, Service, Context"]
        end
        A3["<strong>Layer 3: Tools for Services</strong><br/>Stream, Schedule, Schema, Data, etc."]
        A2["<strong>Layer 2: Runtime</strong><br/>Runtime, Fiber"]
        A1["<strong>Layer 1: Effect</strong><br/>The Core Blueprint"]
    end

    %% --- The Flow ---
    A7 --> A6
    A6 --> A5
    A5 --> A4
    A5 --> B4
    A4 --> A3
    B4 --> A3
    A3 --> A2
    A2 --> A1