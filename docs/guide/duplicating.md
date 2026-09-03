# ATC sectors extending

Following rules only apply to specific regions / FIRs / ARTCC and allow for ATC duplicating when certain rules are
followed.

## Australia/NZ

- Data is fetched from Sectors.xml: https://raw.githubusercontent.com/vatSys/australia-dataset/master/Sectors.xml
  and https://raw.githubusercontent.com/vatSys/new-zealand-dataset/refs/heads/master/Sectors.xml
- Rules are only applied to _CTR, _APP and _DEP
- Controller's ATIS should include both: `Frequency` of duplicated sector and `Name` of duplicated sector (s). For
  example, `EXT ASW 131.800` or `EXT ASW 131.8`

In such case, controller is duplicated as-is, excluding **callsign** and **frequency** - those are changed to target
sector.

## Japan and VATPRC

- Data is fetched from Sectors.xml: https://vatjpn.org/media/external/vatsim-radar/Sectors.xml or https://files.vatprc.net/sectors/Sectors.xml
- Rules are only applied to _CTR, _APP and _DEP
- Controller's ATIS should include: `Name` and `Frequency` of duplicated sector separated by spaces. For example, `N47 133.55` or `Extending N47 133.550`
- The written frequency must match either the controller's primary frequency or the default frequency of any duplicated sector that is also explicitly being extended. If it doesn't match, it falls back to the controller's primary frequency.

In such case, controller is duplicated as-is, excluding **callsign** and **frequency** - those are changed to target sector.
However, duplication will be skipped if the frequency of the duplicated sector matches the controller's primary frequency to prevent duplicate overlays.

## Hardcoded data

Data is hard coded - extending is allowed for specified callsigns. Controller ATIS should include text of sections below
for mapping to work.

Example: Area A in ZOA/NCT ATIS will duplicate controller with `SJC_APP` callsign.

In that case, controller is duplicated as-is, excluding **callsign** - this is being changed to target sector.

Controller duplication should be used to duplicate APP, or highlight areas outside default CTR Area. It should not be
used for promo of ARTCC position - such usages will not be accepted to dataset. 

Common ATC duplicating rules can be found or edited
here: https://github.com/VATSIM-Radar/vatsim-radar/blob/next/app/utils/server/vatsim/atc-duplicating.ts

## ZMA Ocean Area

- Data is hard coded - allows opening or closing of ZMA's Ocean Area based off various callsign/polygon definitions
- If controller ATIS includes `Ocean Area`, `ZMO_##_CTR` (`KZMA-OCN` polygon) is opened in addition to the current
  `MIA_##_CTR` (`KZMA` polygon) position
- If controller ATIS includes `No Ocean Area`, `MIA_##_CTR` (`KZMA`) is signed off and replaced with `ZMA_##_CTR` (
  `KZMA-N` polygon)

In such case, controller is duplicated as-is, excluding **callsign** - this is being changed to target sector.

## Other sector

Contact us in Discord if you are duplicating your sectors internally, have this system documented, and want to make it
work on VATSIM Radar.
