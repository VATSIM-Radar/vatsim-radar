# VA on map

Do you want to receive Virtual Airline badge in Pilot Overlay? Follow these steps.

## My airline is purely fictional and has no real-world airline

Add it to GNG: https://gng.aero-nav.com/AERONAV/icao_request_fhairlines

Failed to do so? Add it here: [https://github.com/VATSIM-Radar/data/blob/main/custom-data/airlines.json](https://github.com/VATSIM-Radar/data/blob/main/custom-data/airlines.json) Data from here applies within 7 days since released.

## My airline has real-world airline

1. Add your airline as virtual to GNG or VR Data following links above
2. Once this is done (or was done before), use a special remark in your flight plan to identify the airline

Examples:

- `CS/Siberian`: display VA with Siberian callsign with default "`S7 Airlines`" name
- `CS/Siberian/S7 Virtual`: display VA with Siberian callsign and "`S7 Virtual`" name
- `CS/Siberian/S7 Virtual WEB/VATSIM-RADAR.COM`: display VA with Siberian callsign, "`S7 Virtual`" name and open VA website on click

You can also use `-`, `=` and `,` as separators: `CS-Siberian-S7 Virtual WEB-VATSIM-RADAR.COM`, `CS,Siberian,S7 Virtual WEB,VATSIM-RADAR.COM` or `CS=Siberian=S7 Virtual WEB=VATSIM-RADAR.COM`. To support https:// scheme, use `,` instead of `:`.
