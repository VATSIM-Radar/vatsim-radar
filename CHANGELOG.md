# Changelog

# [0.4.4]

Big thanks to Felix and DotWallop for making this release possible!

## Highlights

### Featured Airports

- View airports with much traffic from all around the world
- View quiet, yet staffed airports to find interesting places to go, learn to fly, or support lonely controller in your area
- Filter by visible only to view this stats in specific area

### New aircraft icons

- Updated helicopter icons matching
- Added new aircraft icons, thanks to DotWallop: A345, A346, A3ST, A400, AN24, B1, B2, B37(8,9)M, BCS1, C152, C17, C172, C208, C25C, DA40, DC10, DC3, DH8(A,B,C,D), DHC(2,6,7), EC45, EH10, F(14,15,16,18,22,35), GLID, KODI, SHIP, BALL, A10, A748, BE58, C130, C700, C750, CL60, E135, F117, G2CA

## Features and improvements

### Noticeable features

- Added airport arrival rate
- You can now switch to departed aircraft in airport overlay
- Added Australia extending sectors support
- Added featured airports
- Added support for Ramp controllers - mapped to Ground for now
- Brand new Patreon page has been added to highlight our fellow supporters and our goals
- Removed MapBox and Jawg map layers, added Carto Vector layer

### UI/UX

- Reworked approach labels placement to always be on the line
- Unstaffed airport ICAO is now also drawn above aircraft
- Pilot popups can now be closed by clicking on them
- Airport label click priotity is now higher than aircraft
- Updated aircraft missclick protection to be less agressive
- Updated tracks palette with separate colors for light and dark themes
- Removed height limit for aircraft list
- Changed runway number color
- Reworked dashboard map height for different modes - so it will always fit on screen
- Reworked the way approach controllers disappear from screen. From now on, if at least one coordinate of tracon is
  visible, it will continue to show on map even with large zoom
- UI/UX improvements for: pilot hover card, ATC short card, pilot overlay, airport flight card
- Changed approach sectors color to highlight them
- You will now be able to zoom over controller popup if it has no scroll
- Pilot overlay will now close if you hover over right side of header, right of pilot's callsign

### Improvements

- Pilot select in Airport Dashboard will now also open pilot in dashboard itself
- Added airports names to aircraft on-hover popup
- Transition display now clarifies where you can find level and altitude
- Map filter dropdown is now open for new users by default
- You can now also send links for callsign instead of CID, for example, "https://vatsim-radar.com/?pilot=SBI437"
- Reworked stepclimbs display to show waypoints and whole stepclimbs list
- Added kilometers support for stepclimbs display
- Added support for predefined labels coordinates from SimAware TRACON
- Added COM2 and SQUAWK on aircraft hover for airport dashboard
- If your data was not updated for more than 20 seconds, footer map update date will now become red
- Pilots without flight plan will now be noticeable in airport's departures popup
- Added Github releases workflow to easily track new versions

## Bug Fixes

- Fixed some of SimAware tracons rendered as circles, like CHI_Z_APP
- Fixed some of SimAware tracons that had labels rendering in ocean without any tracon displayed
- UMKK will now show in Russia instead of Belarus
- Fixed some airports were showing division undefined and empty name in airport info
- Map will stop shaking when opening aircraft near to the ocean
- Fixed aircraft track line for oceanic flights
- Fixed an error when your aircraft spawn would not focus and zoom to you
- Fixed rare issues with duplicate airports
- Fixed an issue for TAF Valid field when time displayed hours two times instead of minutes
- Fixed a rare issue when runway text could stay when zooming out
- Fixed an issue when you could sometimes have two aircraft tracked at once with map unusable at this point
- Fixed an issue when midflight arrival change caused flight path disappear
- Fixed airport track line disappearing for midflight connections
  Fixed an issue with approach TRACONs could sometimes lead to duplicate empty airport shown on map
- Fixed an issue when SQUAWK info tooltip was misaligned if pilot didn't have any frequencies tuned
- Improved great circle support for transoceanic flights that had disconnects

# 0.4.3

- Slighty improved update browser performance
- Optimized turns render for very big aircraft list
- Fixed transponders starting with zero to skip that zero number (0123 -> 123)
- Optimized aircraft turns update
- Added new super fast update rate using websockets. You can opt out from it via new filters setting
- Fixed aircraft blinking when updating
- Several map update performance improvements

# 0.4.2

Welcome to newest VATSIM Radar release! It comes packed with new map and weather layers, as well as great circle
support - and much more.

## Noticeable changes

- Added COM1 to airport pilots list, as well as pilot on-hover information
- New setting: Fast open multiple aircraft. Behavior from 0.4.1 was an unintended bug, but since many people really
  liked it, it has been added as setting
- You can now use middle mouse click to center map in direction you want
- Added great circle support for aircraft lines

### Map Layers

- Added Radar layers (will now be used as default)

### Map Filters

- Added Weather Layers 2.0. Your previous weather settings have been reset due to this change
- Added OpenWeather branding to weather popup to thank this amazing service
- Added "default" setting to transparency settings

## Features and improvements

- Pilots connected mid-flight will now have track line connected with airport
- Added server time to airport dashboard
- Pilot overlay now has frequency this pilot is on
- Improved performance when looking for an aircraft
- Recolored aircraft colors in airport dashboard
- Added airport name in overlay if airport doesn't have VATSIM info
- Added SELCAL code into remarks section title if aircraft has one
- Max aircraft icon size was reduced from 40 to 35
- Increased horizontal hit ratio for approach controller name. They should now be much easier to hit to open overlay
- Changed aircraft history track line colors. For example, purple is not that bright anymore
- Increased missclick protection from 15 to 30 pixels to improve labels readability and lower labels overlapping

## Bug Fixes

- Fixed an issue when route&remarks would collapse each update
- Fixed an issue when your connection with same flight plan as before but different callsign could result in flight
  route be duplicated
- Fixed an issue when for rare airports approach controllers were not displaying (like LECG_APP)
- Airports with duplicate IATA codes from VatSpy will stop having that IATA code. That can cause new issues, so please
  report if some airports or controllers have disappeared for you
- Fixed an issue when aircraft were pinning when opening them for no reason
- Fixed an issue when sometimes data was not updating every 15 seconds
- Fixed an issue when sometimes labels were showing for all ground aircraft even when they shouldn't

# 0.4.1

- Increased rate for Navigraph AIRAC updates
- Added transparency settings for OSM and satellite layers
- Added transparency settings for weather layers, separated by light/dark theme
- Added CartoDB with labels map layer
- Improved airport dashboard loading performance
- Added SimAware suffix support
- Actions in overlays are now pinned when scrolling
- Changed aircraft lines colors a bit for them to be more different from sector/tracon color
- Fixed issue when own aircraft track was not appearing after page reload until next API update
- Removed update popup from OBS overlay, fixed airport dashboard height in OBS overlay
- Removed limit from map bounds in airport dashboard
- Added ability to de-select aircraft on map click + to select multiple aircraft in airport dashboard

FYI to OBS folks: apply this CSS to edit heights:

`.airport { --dashboard-height: calc(60vh) !important; --map-height: calc(40vh) !important; }`

Here 60 and 40vh represent percents of your overlay height.

# 0.4.0

## Highlights

- 🛫 Airport Dashboard
- 🗺️ Aircraft History Turns
- 🌦️ Map Layers & Weather
- ✈️ New Aircraft Icons
- 🚀 Performance Improvements
- ✔️ UI/UX improvements and bug fixes

### Airport Dashboard

Brand-new Airport Dashboard is now available via permanent link on `/airport/icao` (can also be opened from airport
popup).

Dashboard is equipped for both pilots and controllers, with features that all of you could enjoy.

- View all airport info on the same screen
- View airport traffic - and filter it by type if you want - select all airborne, all on the ground or just departing.
- Enjoy Controller Mode, which will only leave aircraft on your screen, categorized by their type (you can also filter
  that)
- Toggle "show pilot stats" to quickly identify newbies from experienced folks
- Hide or expand map or columns - flexibility is everything!

We would also love feedback from all of you on this <3

### Aircraft History Turns

You can now see history of turns for any aircraft on map - colored almost like on FL24 for you to identify descend or
approx current aircraft altitude level just by looking at this line.

Turns are available when you open overlay or hover on aircraft.

They are also currently available if you toggle airport arriving tracks - but that's experimental, and we might disable
this in future for performance reasons (or make this Patreon feature!).

### Map Layers & Weather

Following new layers have been added:

- Satellite
- Jawg (dark theme only)
- OSM (light theme only)

Following weather layers have been added:

- Clouds (best visible in dark theme)
- Precipitation (OpenWeather has more coverage but worse looking, RainViewer - worse coverage, better looking)
- Wind

We had more plans for layers actually... but it turned out most layers are paid.

Since we can't afford paying for layers & weather now, you can support us on recently opened
Patreon: https://www.patreon.com/vatsimradar24

### New Aircraft Icons

Following aircraft icons have been hand-crafted for you - and our model matching has been updated to match new icons for
aircraft that don't have own yet.

- B720-722
- B752, 753, 762-764, 77L, 77W
- P46T
- B461-463
- Boeing 741, 744, 748, 74S, LCF
- C510,
- CRJ1, 5, 9, X
- DA42, 62
- E170, 175, 190, 195
- EUFI
- H160, H47, PC12
- TBM7-9
- A319/A321 matching has been fixed
- Updated icons for 772, 773

## Other stuff

### Features and Improvements

- You can now toggle pilot stats in airports aircraft view (remembered for current session)
- Added share, focus and dashboard buttons to airport overlay
- Redesigned sectors colors for better readability
- Aircraft labels will now show if overlapping airport square or counter
- Reduced aircraft labels tolerance for map overlays, so they will show more frequently
- Added links to Github and Patreon in header
- Changed route aircraft icon color
- METAR/TAF/NOTAMS redesign
- Renamed Airport info to Info & Weather to clarify what's in there
- Pilot ATC has been moved to separate tab
- You can now see CTAF frequency in pilot popup
- Added ?airport GET param to main page to quickly open any airport on map
- Whole Airport ATC card has been made clickable
- Navigraph AIRAC in bottom left corner is now clickable with useful info about how and why you need upgrading
- Redesigned ground aircraft filter

### Performance improvements and technical stuff

- Significantly improved default CartoDB map layer loading performance
- Reworked aircraft icon render - we are now able to change icon colors to be anything we want, not just predefined pngs
- Reduced memory consumption for sectors render. This change will be significant when many firs are currently active
- Improved performance when moving map (will be significant on low zoom levels)
- Airports points will no longer render on >100+ airports are on screen. This should improve performance on slow devices

### Bug Fixes

- Fixed issue with SimAware labels displaying incorrect names (JFK -> N90)
- Aircraft in arrivals list will now show departing instead of enroute, if it's still on the ground
- Fixed some gates showing as occupied while they are not
- Fixed overlay crash when departing on switching between vfr and ifr
- Fixed _DEP controllers detection fail
- Added small horizontal padding to pin icon, so it will be harder to miss a click
- Fixed RU-SC ATIS detection
- Improved 1251 encoding detection
- Fixed fill of hovered approach facility not covering whole area

## What's next?

On Friday myself & I will go on vacation which will last for a week. For that time, I will still try to fix critical
bugs that may occur - but nothing else.

After I come back, we have Map Settings and Filters, as well as context menu planned for 0.5.0 - and also some
improvements from suggestions section maybe.

Stage 2 is almost finished, at we'll have a prioritization session before we start Stage 3, and QA members list will be
extended. Stay tuned!

# 0.3.5

This is a small fix update while we still develop 0.4.0.

- You can now close this warning message in header
- Fixed NY_CL_FSS display, as well as other oceanic facilities detection issues
- ATC popup will stop displaying random countries for some controllers
- Restored Discord icon in header

# 0.3.4

- Updated roadmap
- Vatsim has been uppercased to VATSIM everywhere
- Improved parsing logic for SimAware TRACON to some of the sectors, like SCT_APP, ESSEX_APP and CHI_X_APP

  Something may not work as it did before, so please keep an eye on approach sectors renders after this update. Overlall
  it should work better as before and be equal to SimAware.

And also previous changelogs missed that you can now open ATC card to view ATC stats. Give it a try!

# 0.3.3

- "View route" button will now reset "tracked" state
- Map will no longer autofocus on you if your aircraft has already arrived
- Flight plan will now also show planned EOBT and enroute

# 0.3.2

I made this whole update in ~1.5 hours. Coffee magic I guess.

## Features and improvements

- Site colors have been updated a bit
- Added scroll to roadmap items
- Airports codes in overlay aircraft route are now also clickable
- Added map controls to bottom left corner

## Bug fixes

- Fixed duplicate airports for cases like SY_GND/SY-E_GND
- Fixed SUEO_CTR FIR display. New algo may cause new problems - please report if you see them and remember to compare
  firs display to VatSpy

## Settings

- New setting: auto-show airport overlay tracks for arriving aircraft
- Reordered settings: Navigraph account link got higher

## Airport popup

- Added toggle for arriving aircraft tracks. They will only be visible for aircraft that are in sight
- Added tabs
- Reordered airport aircraft buttons: ground now goes first
- Added title for clarification on left buttons
- Removed remaining time for ground aircraft
- Removed ETA for arrived aircraft

# 0.3.1

- Once again improved encoding detection for cyrillic
- Added remaining dist and ETA to airport's aircraft list
- Added departed/arriving statuses for airport's aircraft list
- Aircraft in airport popup are now sorted by closest distance to airport
- Increased border of approach sectors so it's now harder to miss them
- Name of approach sector is now the same color as sector's border

# 0.3.0

This update adds airport overlay that you can use to get all possible info about airport you may need.

As always, remember to check Roadmap to get a hint of what's coming next! Stage 2 is getting closer to its end.

## Highlights

- 🛫 Airport Overlay: click on any airport to view its info
- 🔄 Redesign of approach sector label
- 📡 ATIS encoding parsing improvements
- 🔧 UX improvements and bug fixes

## Airport Overlay

You can now click on any airport to view all of its available information.

Since this overlay contains probably too much info for a single popup, airport dashboard development is currently
planned - you should expect it in near future.

What's included:

- METAR/TAF with basic info parsing
- NOTAMS with start/expiration dates
- VATSIM info if available with airport elevation, transition frequency and division
- CTAF frequency if no ATC is online for US airports
- All possible traffic list

Planned in future updates:

- Airport dashboard
- Filter map by airport traffic
- Add tracks to all of this airport traffic
- With all pilots' stats on single screen

## Features and improvements

- You will no longer see an alert when copying something - instead you'll notice text change
- Reduced traffic consumption when some FSS is online or controller has multiple sectors
- You can now properly move map below empty space with opened overlay. This should also allow using overlays on mobile
  phones (for those who uses them even when they are not yet properly supported)
- Redesigned approach sector label design. You will no longer suffer from random hovers, and it will be easier to differ
  sectors from each other when they are close to each other
- Reduced area sectors name size
- Removed decimals on pilot flown & remaining miles

## Bug fixes

- Updated ATIS encoding parse algorithm
- Moved Boeings 74* icons to B739 icon
- Added encoding parsing for pilots names
- Approach controller popup will now close more easily
- Pilot offline status should now properly reset after (s)he's back online
- Fixed error when aircraft was not listed in arrivals if arrival airport was same as departure

# 0.2.7

- Added runways on map. Their numbers and existence depend on your Navigraph subscription (you can see used AIRAC cycle
  for them in footer)
- You will now see Navigraph Data instead of Ultimate in Settings popup if you only bought data. This is cosmetic change
  only to reflect reality more

## Privacy features

- Removed full name from header
- Completely removed name from settings
- Added ability to customize name shown in header using settings
- You can now rename yourself in Discord using `/rename` command

# 0.2.6

This is a little update while we develop bigger one.

I would also like to welcome all newjoiners - don't forget to `/verify` and report problems & suggestions!

- Added little dot on bottom of airport without atc to highlight them on map
- Boeing 747 family will now be displayed as a340 instead of a320 (since they don't have their own icon yet)
- Replaced icon in pilot overlay popup in yet another attempt to stop it from crashing

# 0.2.5

- Added favicon
- Fixed error when sometimes overlay could break on aircraft type change
- Added cache reset for airplanes icons each update
- Added support of airports aliases
- Improved sort of ATC on departure: approach should now be higher than area atc when on ground
- Fixed ground airport detection when another airport is close to flight plan airport

# 0.2.4

- Minified ATC airport card
- Added shadow for Area ATC card in light theme
- Added basic hover for approach controller selection
- Redesigned aircraft label
- Changed aircraft hover color
- Improved FSS color decision on light theme
- Fixed error when your hover overlay could be replaced by approach controller overlay for no reason
- Removed CartoDB labels to make map more clear. There will be a setting to enable them back in future

# 0.2.3

This release summaries all hotfixes that was made today. Sorry for last days release spam :)

- Refactored airports data parsing for performance improvements. This fixes performance degradation introduced in
  today's 0.2.2 and makes performance even better than before 0.2.2
- Added SimAware TRACON Data as second source to fix Santiago Approach and some others: they will be displayed even if
  missing in VatSpy data
- Added support for multiple sectors in airport (for example, Radar and Approach operates simultaneously as different
  sectors in many Russian airports)
- Added different color for approach sectors to highlight them in contrast with Area Control
- Reworked TRACON label placement to let engine deal with it
- Fixes for light theme
- You would now be able to see approach label from much higher zoom. Tell me how if it looks horrible for you!

# 0.2.2

- Added accurate TMA approach sectors based on SimAware TRACON project
- Added light theme support. If you're using light theme on your PC, it will auto-detect it on first load
- Added About page. You can navigate to it via attributions in bottom right corner or via Privacy policy
- Traffic consumption has been reduced a bit
- Fixed SOLENT radar display (as well as some other similar fake airports)

# 0.2.1

- Removed to go percent if aircraft is on ground
- Added country name to flightplan airport
- Fixed error when aircraft icon was not updated in overlay when switching between aircraft
- Fixed error when overlay could become broken when switching between aircraft

# 0.2.0

This update is a huge step forward for VATSIM Radar. Packed with many bugfixes and new features, this update aims to
improve your flight experience - please give it a shot!

Closest feature after this one should be TMA approach sectors.

## Highlights

- 👨‍✈️ Pilot overlay (both flight and prefiles)
- ✈️ Different aircraft icons
- 🎯 Accuracy improvements for uirs, firs and ground aircraft detection
- 🔧 Bug fixes and improvements

## Changelog

### Pilot overlay

You are now able to click on any aircraft (or flightplan prefile!) to enable it's overlay. From here you can open pilot
on map, open VATSIM stats and more:

- Total time on network as pilot
- Pilot ID
- Speed/Alt/Heading
- Flight plan, including route and remarks plus stepclimbs
- Share pilot to instantly open card on map for anyone visiting your link
- View ATC where pilot currently flying - enabled by default for your own flights
- Enable tracking to make map follow this flight
- Aircraft dep/arr airports will also be highlighted

By default, overlays are replaced by pilot you open next - but you can also pin any overlay so it won't close.

This card can be auto-opened, pinned and tracked for your own flight - you can enable this in settings.

P.S. You are also able to open this from airport counters popup - including prefiles!

### Features

- Added new aircraft icons: A124, A225, A300, A310, A318-321, A332, A333, A342, A343, A359, A35K, A388, B703, B712,
  B731-739, B772-773, B788-789, B78X, CONC, DC6, MD11, MD8x, T134-144-154
- Aircraft icons now have borders around them
- Lowered size of A320 default icon
- Added hover-on-aircraft icon background change
- Map position is now saved from last time
- Our great service finally has its own logo!
- Update verify interaction reply description to remove old forum link
- You are now able to see dep/arr lines on aircraft hover
- Reduced on-hover pilot info popup height by removing full airport name
- Moved airport with atc to center position so it will look better now, especially if airport has dep/arr controller
- Your own flight is now always highlighted as green on map
- Updated roadmap. Check it out!

### Bug fixes

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

First of all, I want to thank everyone for joining this server and leaving great feedback about VATSIM Radar. Have a
great weekend and CTP!

## Bug fixes

- Diverted to non-planned airport will now also be displayed in ground aircraft list
- Aircraft altitude will no longer be modified using VATSIM QNH when below FL100
- Fixed ground aircraft sometimes not showing in correct airport
- Fixed rare issue when circle with dep/arr controller could suddenly disappear while still being online. If you'll
  encourage this later, please report it in #feedback section (must be present in VatSpy and missing in VATSIM Radar)
- Fixed PHNL harassment when it's existence could entirely break map update or map displayed two PHNL airports instead
  of one

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

This is initial release to test changelog generation and general CI/CD flow. Service is still pending VATSIM approval to
announce proper testing.

## New features

- Aircraft altitude is now converted using its QNH

## Technical features

- Initial Changelog release
- Prepared Discord bot verification
- Added releases announcements
