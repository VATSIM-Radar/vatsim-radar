import type { Pixel } from 'ol/pixel';

export interface NavigraphGate {
    gate_identifier: string
    gate_latitude: number
    gate_longitude: number
    name: string
    airport_identifier: string
    trulyOccupied?: boolean
    maybeOccupied?: boolean
    pixel?: Pixel
}
