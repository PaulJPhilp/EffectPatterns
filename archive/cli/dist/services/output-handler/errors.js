import { Data } from "effect";
export class OutputHandlerError extends Data.TaggedError("OutputHandlerError") {
    constructor(message, cause) {
        super();
        this.message = message;
        this.cause = cause;
    }
}
//# sourceMappingURL=errors.js.map