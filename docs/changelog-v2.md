---
outline: [2, 3]
---

# Preliminary Release Notes

::: tip Info
Release notes are expected to change. Some items may be removed, added, or changed.
:::

## Highlights

⚙️ Settings Overhaul
♾️️ Infinite Map
🗺️ Map Interaction Rework
👨‍✈️ Controller Dashboard 2.0
🚀 Performance Improvements
✨ Website Redesign
✈️ New Features and Improvements

### Settings Overhaul

Settings have been reworked to a new, standalone page, featuring Search, clear navigation, and map preview.

All settings that were saved were automatically migrated. You will be offered to migrate unsaved and local settings on
first map launch.

In future, you map expect exciting new features in it. In addition, layers and settings icons in map quick actions have
been significantly shortened to display often changed settings.

### Infinite Map

Due to internal refactor, map is not infinite horizontally. I've been asked to add this day one, enjoy!

### Map Interaction Rework

Ever found yourself hovering or clicking something you didn't want to hover or click? Now, each map interaction has a priority for your actions.

That also leads to performance improvements, and a MUCH better experience on mobile devices.

### Controller Dashboard 2.0

TBA

### Performance Improvements

Map has received a LOT of performance improvements due to internal refactors, and should work much better on any devices. Freezes are still expected when map is zoomed out and multiple words are shown, especially in busy hours.

In case that will not be enough for some, Settings have received a "Performance preset" page, containing settings that affect performance the most, with a way to apply them in one click.

### Website Redesign

Whole website has received a new look - from logo, to fonts. We hope that you love it, and we'll continue to improve design in future.

And that are just the highlights! Full changelog is available below.

## Full Changelog

### New Features

- Map is now infinite
- Completely reworked map interactions with clear priorities and multiselect support
- Added context menu when clicking on aircraft, atc or airport
- Added a way to minify any overlay
- Upcoming and current events will now show on map
- Added departed and landed time to pilot overlay
- Added vertical speed to non-compact pilot hover and pilot overlay
- Added aircraft photo in overlay

### UI/UX Improvements

- Mobile on-hover overlays are now fixed to bottom of the screen and centered
- Airports are now "decluttered" when zoomed out, except for staffed facilities
- Implement automatic on-hover delay
- Significantly improved aircraft hovering stability and predictability
- Removed aircraft on-hover delay separate setting in favor of global hover setting
- Implemented dynamic on-hover aircraft position (based on heading only)
- Significantly improved distance tool update speed when attached to an aircraft
- Airway direction is now specified as next waypoint instead of "Forward" or "Backwards"
- Navigraph AIRAC data now updates faster and in background
- Hovered pilot and atc info now always show friend name and comment
- Overlay actions are no longer pinned to bottom of the screen on mobile devices
- Navigraph procedures will now be automatically cleared if airport overlay is closed
- Procedures will now show in Airport Dashboard even if airport is not found in VATSIM AIP
- Added TWR icon when VATGlasses or SimAware TRACON TWR sector is active
- Bookings now update more consistently and every 5 minutes instead of 15
- Added a way to quickly disable and enable VATGlasses
- Changed calendar menu to open events by default
- Improved speed/altitude graph smoothness
- Added an ability to zoom to any controller, including CTR
- Controllers will now be focused when opened from search - same as with aircraft and airports
- Weather request and route/remarks textareas are now not collapsed (except for Firefox in weather request, I'm sorry)
- Added distance tool infinite worlds support by psergienko
- Filters Favorite Lists will now show list name instead of ID after it has been selected
- Filters are now responsive, applied instantly after you modify them. Auto-save is not enabled for filters
- A separate Enable toggle (active by default) will now show in Filters to quickly disable them
- Significantly improved filter apply speed
- Added a clear indication that temporal filter is applied
- Login flow to VATSIM, Navigraph, as well as Logout has been improved, placing you to the same page you have left when
  pressed login/logout
- You can now declutter aircraft when zoomed out, or always, to improve performance

### General Improvements and Additions

- Approach transition will now be automatically parsed from flight plan
- Added an ID for VATGlasses sectors
- Bookings are now rendered in VATGlasses mode; bookings not showing up or duplicated facilities issues have all been
  fixed
- VATGlasses controllers and TRACONs covering multiple airports are now properly shown in "ATC" tab of pilot or airport
- Added active runway parsing from ATIS on airport/ATIS, as well as runway auto-select for VATGlasses
- "Booked until" will now be displayed for controllers on hover
- Added support for search history
- Booked favorite controller will now show in Favorite section
- You can now hover over empty airports to find out their name
- Fix website reloading multiple times after update

### Performance improvements

- Improved performance of airports/ATC data update
- Reworked airports render for better memory usage
- Removed memory consumption on SimAware data
- Reduced gates memory consumption on render
- Significantly reduced memory usage for airlines icao codes
- VATGlasses will now detach and stop updating when disabled after being enabled
- Reworked aircraft render for much better performance, including speed of render and reduced memory and cpu usage of
  both aircraft and tracks update
- Significantly improved tracks render smoothness and delay
- Improved performance in Airport Dashboard
- Significantly reduced memory used by Navigraph Airways layer, added a cache for faster rendering and changed design a
  bit, so it's now worth giving this layer a go
- Significantly improved performance and memory usage when rendering holdings, especially when rendering enroute
  holdings (all holdings layer is not enabled). Previous code was terrible. Who wrote that? Jesus.
- Improved performance of Navigraph Layers, such as NBD, VORDME, Waypoints, as well as route rendering
- Improved performance and memory usage of route rendering
- Greatly improved speed of route rendering
- Turns update has been slowed down to 5 seconds per aircraft
- Significantly improved performance for VATGlasses mode
- Significantly improved memory usage for VATGlasses mode, not consuming it for countries that are not rendered
- Reduced traffic used on regular updates
- Airport counters update will be much faster now
- Reworked datafeed to be more compact
- Significantly optimized basic layer in terms of performance and memory usage, at a cost of low quality on high zoom
  levels
- Speed up website loading on second load by utilizing PWA cache

## Technical changes

- Pilot "At Gate" status has been removed to improve performance. Only departing and arrived now remain
- VATGlasses combined mode is now always rendered on device, leading to a very slow initial render. This mode is not
  widely used, yet it had separate server instance
- Reworked controllers/sectors logic to be on frontend, leading to improved server worker update time, reduced delay,
  and a better code in general, for a small performance cost
- Added support for booking debugging
- Added support for a toggle for duplicating ATC instead of having to remove it all the time
- Added local debug menu to test route parsing, add fake ATCs and enable beta VATGlasses feed, available in Settings →
  Account → Debug mode
- Removed Sentry to improve bundle size. It's not like I was checking errors anyway

### Redesign

- VATSIM Radar has a new logo now!
- Font has been changed across all website
- Colors have been changed across all website
- Map on-click info popup redesign
- ATC icons redesign
- Controller info redesign
- Added compact facility view when too much info is shown
- Redesigned Navigraph on-click overlay
- Redesigned pilot on-hover overlay
- Redesigned tooltips
- Redesigned copy info block
- Redesigned attributions
- Redesigned footer
- Buttons have been redesigned for new VATSIM Radar simple look
- Notifications have been redesigned - each closed notification now also saves into your account, in case you are logged
  in. You can now also reset all saw notifications in settings
- Redesigned header
- Redesigned tabs
- Redesigned controls: radios, toggles, etc
- Made compact aircraft hover mode much more compact than before
- Redesigned inputs and selects
- Redesigned all overlays
- Tables redesign
- Redesigned friends status: you can now click on individual links instead of one big link
- Redesigned VATGlasses slider for a consistent look in all browsers
- Slightly improved filters design
- Removed filter icon from Search: search settings can now be configured in Settings v2 instead
- Changed icons in Presets Manage so they would better reflect the action they do
- Combobox arrow will now disappear, if there is nothing to select

### Bug Fixes

- Settings color reset now respects all further color changes
- Fixed Retry button in Init Popup not closing popup if retry was successful
- In case any of browser database methods will fail during initialization, database will be destroyed, and page will be
  reloaded for a complete update (assuming DB is corrupted, requiring to fix it manually before)
- Removed blue highlight when you click the map
- Fixed atc time text color in light theme
- Fixed many bookings not showing up
- Bookings will no longer be added to active sectors, or to an airport where booked facility is staffed
- Fixed waypoints sometimes not connecting with airways
- Fixed some waypoints not showing correctly
- Removed duplication logic when controller is rendered in VATGlasses
- Fixed NOTAM overlapping with open overlay on PC