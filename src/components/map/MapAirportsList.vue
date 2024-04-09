<template>
    <map-overlay v-for="airport in getAirportsList" :key="airport.icao" :settings="{ position: [airport.lon, airport.lat] }" :model-value="true" persistent>
        {{ airport.icao }} {{ airport.aircrafts.groundDep?.length }}
    </map-overlay>
</template>

<script setup lang="ts">
import { useDataStore } from '~/store/data';
import type { MapAirport } from '~/types/map';
import type { Coordinate } from 'ol/coordinate';
import type { VatsimShortenedAircraft } from '~/types/data/vatsim';
import type { VatSpyData } from '~/types/data/vatspy';

const dataStore = useDataStore();

const groundZone = 5000;

function isAircraftOnGround(zone: Coordinate, aircraft: VatsimShortenedAircraft): boolean {
    return aircraft.longitude < zone[0] + groundZone && aircraft.longitude > zone[0] - groundZone && aircraft.latitude < zone[1] + groundZone && aircraft.latitude > zone[1] - groundZone;
}

let gotList: MapAirport[] = [];

const getAirportsList = computed(() => {
    if (gotList.length) return gotList;
    const airports: MapAirport[] = [];
    const dataAirports = dataStore.vatspy!.data.airports.filter(x => !x.isPseudo);
    const pilots = dataStore.vatsim.data!.pilots;

    function addPilotToList(status: keyof MapAirport['aircrafts'], airport: VatSpyData['airports'][0], pilot: number) {
        let existingAirport = airports.find(x => x.icao === airport.icao);
        if (!existingAirport) {
            existingAirport = {
                icao: airport.icao,
                elevation: 0,
                lon: airport.lon,
                lat: airport.lat,
                name: airport.name,
                aircrafts: {
                    [status]: [pilot],
                },
            };
            airports.push(existingAirport);
            return;
        }

        const existingArr = existingAirport.aircrafts[status];

        if (!existingArr) {
            existingAirport.aircrafts[status] = [pilot];
        }
        else existingArr.push(pilot);
    }

    pilots.forEach((pilot) => {
        const statuses: Array<{status: keyof MapAirport['aircrafts'], airport: VatSpyData['airports'][0]}> = [];

        if (!pilot.departure) {
            const groundAirport = dataAirports.find(x => isAircraftOnGround([x.lon, x.lat], pilot));
            //We don't know where the pilot is :(
            if (!groundAirport) return;

            statuses.push({
                status: 'groundDep',
                airport: groundAirport,
            });
        }
        else {
            const departureAirport = dataAirports.find(x => x.icao === pilot.departure);

            if (departureAirport) {
                const groundAirport = isAircraftOnGround([departureAirport.lon, departureAirport.lat], pilot);
                statuses.push({
                    status: groundAirport ? 'groundDep' : 'departures',
                    airport: departureAirport,
                });
            }

            if (pilot.arrival) {
                if (pilot.arrival === pilot.departure && statuses[0]) statuses[1] = statuses[0];
                else {
                    const arrivalAirport = dataAirports.find(x => x.icao === pilot.arrival);

                    if (arrivalAirport) {
                        const groundAirport = isAircraftOnGround([arrivalAirport.lon, arrivalAirport.lat], pilot);
                        statuses.push({
                            status: groundAirport ? 'groundArr' : 'arrivals',
                            airport: arrivalAirport,
                        });
                    }
                }
            }
        }

        statuses.forEach((status) => {
            addPilotToList(status.status, status.airport, pilot.cid);
        });
    });

    dataStore.vatsim.data!.prefiles.filter(x => x.departure || x.arrival).forEach((prefile) => {
        if (prefile.departure) {
            const airport = dataAirports.find(x => x.icao === prefile.departure);
            if (airport) addPilotToList('prefiles', airport, prefile.cid);
        }

        if (prefile.arrival && prefile.arrival !== prefile.departure) {
            const airport = dataAirports.find(x => x.icao === prefile.arrival);
            if (airport) addPilotToList('prefiles', airport, prefile.cid);
        }
    });

    gotList = airports;

    return airports;
});
</script>
