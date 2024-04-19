# Changelog

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
