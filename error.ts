import { Location, stringifyLocation } from "./location.ts";

export function createError(msg: string, location: Location) {
    return new Error(`GLUE Compiler: ${msg} at ${stringifyLocation(location)}`)
}
