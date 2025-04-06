# Data Debugging

VATSIM Radar provides ways to debug [Data](./data) Debugging.

## Setting up prebuilt

This section will help you to reduce load on your machine, skipping whole development server setup. 

1. Follow steps **until** `Getting it done` inside [Setting Up](./setting-up.md) Guide
2. Instead of running project directly, run `yarn start:next` or `yarn start:prod` for project to start
3. Check it out on `http://localhost:8080`

You can also setup project using `docker compose up` from guide above, but that will also setup development server, which is much heavier.

If you only need data testing, it is recommended to use `yarn start:*` instead of `docker compose up` to use prebuilt image.

## Debugging

First, you should notice new section in map settings dropdown.

![debug.png](/debug.png)

Open it.

### VATSpy

Modify and upload `VATSpy.dat` and `Boundaries.geojson` from original repo.

### SimAware TRACON

You have 2 options:

1. Download [latest release](https://github.com/vatsimnetwork/simaware-tracon-project/releases/latest) `TRACONBoundaries.geojson` and modify, then upload it
2. Use `compiler.js` from repo to get this file locally, then to upload it

### VATGlasses

Minify whole repo to `anyname.zip` file and upload it.

### Fake ATC

To test how controllers are displayed, you can add fake ATC:

1. CID: auto-generated, you can change it on creation (once)
2. Name: any controller name, defaults to CID
3. Callsign: controller's callsign, no validation here, be careful
4. Frequency: can be random unless you need to test VATGlasses
5. Facility/Rating: can be random
6. ATIS lines: optional

Hit `Save` button - controller will appear on map shortly.

## Some notes

1. Clear buttons are always highlighted, even if you didn't upload anything
2. Files are saved under src/data/custom. You can even edit them directly, if you want! Just don't forget to set correct permissions, since Docker can usually mess with them and you won't have edit access
