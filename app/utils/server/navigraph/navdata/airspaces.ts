// region Restricted Airspace

/* const restricted = await dbPartialRequest<{
    arc_bearing: number;
    arc_distance: number;
    arc_origin_latitude: number;
    arc_origin_longitude: number;
    area_code: string;
    boundary_via: string;
    flightlevel: string;
    icao_code: string;
    latitude: number;
    longitude: number;
    lower_limit: string;
    multiple_code: string;
    restrictive_airspace_designation: string;
    restrictive_airspace_name: string;
    restrictive_type: string;
    seqno: number;
    unit_indicator_lower_limit: string;
    unit_indicator_upper_limit: string;
    upper_limit: string;
}>({
    db,
    sql: 'SELECT * FROM tbl_ur_restrictive_airspace',
    table: 'tbl_ur_restrictive_airspace',
});

fullData.restrictedAirspace = [];
shortData.restrictedAirspace = [];

for (let i = 0; i < restricted.length; i++) {
    const item = restricted[i];
    if (item.seqno !== 10) continue;

    const coordinates: AirspaceCoordinateObj[] = [{
        coordinate: [item.arc_origin_longitude ?? item.longitude, item.arc_origin_latitude ?? item.latitude],
        bearing: item.arc_bearing,
        distance: item.arc_distance,
        boundaryVia: item.boundary_via,
    }];

    let k = i + 1;
    let nextItem = restricted[k];

    while (nextItem && nextItem.seqno !== 10) {
        coordinates.push({
            coordinate: [nextItem.arc_origin_longitude ?? nextItem.longitude, nextItem.arc_origin_latitude ?? nextItem.latitude],
            bearing: nextItem.arc_bearing,
            distance: nextItem.arc_distance,
            boundaryVia: nextItem.boundary_via,
        });
        k++;
        nextItem = restricted[k];
    }

    const flightLevel = getFlightLevel(item.flightlevel);

    fullData.restrictedAirspace.push({
        type: item.restrictive_type,
        icaoCode: item.icao_code,
        areaCode: item.area_code,
        designation: item.restrictive_airspace_designation,
        lowerLimit: item.lower_limit,
        upperLimit: item.upper_limit,
        name: item.restrictive_airspace_name,
        flightLevel,
        coordinates,
    });

    shortData.restrictedAirspace.push([item.restrictive_type, item.restrictive_airspace_designation, item.lower_limit, item.upper_limit, coordinates.map(x => [x.coordinate, x.boundaryVia, x.bearing, x.distance]), flightLevel]);
}*/

// endregion Restricted Airspace

// region Controlled Airspace

/* const controlled = await dbPartialRequest<{
    airspace_center: string;
    airspace_classification: string;
    airspace_type: string;
    arc_bearing: number;
    arc_distance: number;
    arc_origin_latitude: number;
    arc_origin_longitude: number;
    area_code: string;
    boundary_via: string;
    controlled_airspace_name: string;
    flightlevel: string;
    icao_code: string;
    latitude: number;
    longitude: number;
    lower_limit: string;
    multiple_code: string;
    seqno: number;
    time_code: string;
    unit_indicator_lower_limit: string;
    unit_indicator_upper_limit: string;
    upper_limit: string;
}>({
    db,
    sql: 'SELECT * FROM tbl_uc_controlled_airspace',
    table: 'tbl_uc_controlled_airspace',
});

fullData.controlledAirspace = [];
shortData.controlledAirspace = [];

for (let i = 0; i < controlled.length; i++) {
    const item = controlled[i];
    if (item.seqno !== 10 || !item.airspace_classification || item.airspace_classification === 'A' || item.airspace_type === 'K' || item.airspace_type === 'E' || item.upper_limit === 'UNLTD' || !item.longitude) continue;

    const coordinates: AirspaceCoordinateObj[] = [{
        coordinate: [item.arc_origin_longitude ?? item.longitude, item.arc_origin_latitude ?? item.latitude],
        bearing: item.arc_bearing,
        distance: item.arc_distance,
        boundaryVia: item.boundary_via,
    }];

    let k = i + 1;
    let nextItem = controlled[k];

    while (!nextItem || nextItem.seqno !== 10) {
        if (!nextItem.longitude) break;
        coordinates.push({
            coordinate: [nextItem.arc_origin_longitude ?? nextItem.longitude, nextItem.arc_origin_latitude ?? nextItem.latitude],
            bearing: nextItem.arc_bearing,
            distance: nextItem.arc_distance,
            boundaryVia: nextItem.boundary_via,
        });
        k++;
        nextItem = controlled[k];
    }

    const flightLevel = getFlightLevel(item.flightlevel);

    fullData.controlledAirspace.push({
        center: item.airspace_center,
        classification: item.airspace_classification,
        type: item.airspace_type,
        multipleCode: item.multiple_code,
        icaoCode: item.icao_code,
        areaCode: item.area_code,
        lowerLimit: item.lower_limit,
        upperLimit: item.upper_limit,
        name: item.controlled_airspace_name,
        flightLevel,
        coordinates,
    });

    shortData.controlledAirspace.push([item.airspace_classification, item.lower_limit, item.upper_limit, coordinates.map(x => [x.coordinate, x.boundaryVia, x.bearing, x.distance]), flightLevel]);
}*/

// endregion Controlled Airspace
