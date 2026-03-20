import { Location, stringifyLocation } from "./location.ts";

export function createError(msg: string, location?: Location) {
    let errmsg = `GLUE Compiler: ${msg}`

    if (location) {
        errmsg += ` at ${stringifyLocation(location)}`
    }

    return new Error(errmsg)
}
