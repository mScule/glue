export type Location = {
    ln: number,
    col: number
}

export function stringifyLocation(location: Location) {
    return `ln ${location.ln}, col ${location.col}`
}
