# Changelog

# 0.2.0

## Features

- Added new aircraft icons: A124, A225 Antonov, A318, A319, A321, A340, A342, A343, A380, DC6, MD11, MD80, B78X, B772, B773, B788, B789, T134, T144, T154 Concorde
- Aircraft icons now have borders around them
- Lowered size of A320 default icon
- Added hover-on-aircraft icon background change
- Map position is now saved from last time
- Our great service finally has it's own logo!
- Update verify interaction reply description to remove old forum link
- Updated roadmap. Check it out!

## Bug fixes

- Increased aircraft on ground zone detection
- Fixed Africa oceanic FIR display
- Fixed issue when sometimes aircraft title could disappear
- Fixed issue when sometimes overlay would not open if you hovered during map move
- Fixed critical bug: map radius was 8px instead of 16px!
- Disabled hover effect for high zoom levels (it seemed like overlay should open, but it never did)
- Fixed complex zones like CZQW/CZQM
- Fixed duplicate fir display
- Fixed cases when some of UIR (FSS) sectors would not display
- Fixed local controller display when also global (fss) controller is in operation in same sector

# 0.1.3

First of all, I want to thank everyone for joining this server and leaving great feedback about Vatsim Radar. Have a great weekend and CTP!

## Bug fixes

- Diverted to non-planned airport will now also be displayed in ground aircrafts list
- Aircraft altitude will no longer be modified using Vatsim QNH when below FL100
- Fixed ground aircrafts sometimes not showing in correct airport
- Fixed rare issue when circle with dep/arr controller could suddenly disappear while still being online. If you'll encourage this later, please report it in #feedback section (must be present in VatSpy and missing in Vatsim Radar)
- Fixed PHNL harassment when it's existence could entirely break map update or map displayed two PHNL airports instead of one

## Technical changes

- Added Navigraph to bottom right copyrights
- Added pretty Discord link on `/discord` route

# 0.1.2

This is maintenance release, mostly aimed to fix bug with no ATC displayed for airports without traffic.

## Bug fixes and changes

- 404 page now shows 404 layout instead of 500
- Airports with ATC but without traffic are now displayed
- Fake airports like MSK_APP will now also show if atc is available for them
- Renamed Navigraph Ultimate to Unlimited
- Removed left gap and dot from single-line ATIS for better readability and space
- Fixed broken hover animation when airport only have one local facility (for example, atis and nothing else)
- Renamed Prefiles title to "Flightplan Prefiles" for better understanding

# 0.1.1

## Changes

- Roadmap redesign
- Icons in header
- 404/500 pages
- Service version in footer

### Improved zoom experience

- Overlays should stop opening when hovering on very busy map area
- Overlays will stop opening when you're zooming or moving map

## Bug fixes

- ATIS is no longer displayed as TWR in airport facility overlay

## Technical features

- You can now see release number in discord changelog
- Removed generic favicon while we wait for proper one

# 0.1.0

This is initial release to test changelog generation and general CI/CD flow. Service is still pending Vatsim approval to announce proper testing.

## New features

- Aircraft altitude is now converted using its QNH

## Technical features

- Initial Changelog release
- Prepared Discord bot verification
- Added releases announcements
