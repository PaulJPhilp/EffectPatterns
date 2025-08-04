import { Effect } from "effect";
export interface AppConfigService {
    readonly srcDir: string;
    readonly processedDir: string;
}
declare const AppConfig_base: Effect.Service.Class<AppConfigService, "AppConfig", {
    readonly sync: () => {
        srcDir: string;
        processedDir: string;
    };
}>;
export declare class AppConfig extends AppConfig_base {
}
export {};
