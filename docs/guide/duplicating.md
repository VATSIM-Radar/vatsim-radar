# ATC sectors extending

Following rules only apply to specific regions / FIRs / ARTCC and allow for ATC duplicating when certain rules are followed.

## Australia

- Data is fetched from Sectors.xml: https://raw.githubusercontent.com/vatSys/australia-dataset/master/Sectors.xml
- Rules are only applied to _CTR, _APP and _DEP
- Controller's ATIS should include both: `Frequency` of duplicated sector and `Name` of duplicated sector (s). For example, `EXT ASW 131.800` or `EXT ASW 131.8`

In such case, controller is duplicated as-is, excluding **callsign** and **frequency** - those are changed to target sector.

## ZOA NCT

- Data is hard coded - extending is allowed for NCT, SFO, OAK, SJC, SMF, RNO, MRY, MOD, BAR (APP or DEP)
- Controller ATIS should include the following text for extending to work
  - Area A: SJC_APP
  - Area B: SFO_APP
  - Area C: OAK_APP
  - Area D: SFO_DEP
  - Area E: SMF_APP
  - Area R: RNO_APP

In such case, controller is duplicated as-is, excluding **callsign** - this is being changed to target sector.

## Other sector

Contact us in Discord if you are duplicating your sectors internally, have this system documented, and want to make it work on VATSIM Radar.
