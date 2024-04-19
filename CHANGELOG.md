# Changelog

# 0.1.3

## Bug fixes

- Fixed group aircraft altitude display

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
