import { Location, stringifyLocation } from "./location.ts";

export function createError(message: string, location: Location) {
    return new Error(`GLUE Compiler: ${message} at ${stringifyLocation(location)}`)
}
