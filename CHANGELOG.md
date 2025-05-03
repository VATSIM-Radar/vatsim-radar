# Changelog

# [1.2.0-alpha.1]

- Changed design of booking page - especially in lightmode by MindCollaps

# [1.1.2-2-final]

- Added VATGlasses multiple controllers per position support
- Added admins to stats page
- Fixed VATGlasses combined not doing anything if automatic VG detection is enabled

# [1.1.2-1]

- Now when you open shared filter it is not saved to active filter when you open page without shared filter in parameters
- Now when you open shared filter it is saved into your "draft" filter
- If you have active preset it will now show as small dot under filter menu
- Removed not needed scroll when friends exceed 4. This is definetly the case today!

# [1.1.2]

## Features and Improvements

- Improved performance when VATGlasses is enabled
- Added VATSpy/SimAware TRACON geojson debug tool
- New icons from DotWallop: BCS3, BE35, BE36, E290, F27, F70, F100, HAWK, HDJT, HUSK, L39, M20P, PA18, PA38, SAVG, SU27, TWEN, VIPJ
- Improved icon for BCS1
- Added model matching: FH27 -> F27, M20T -> M20, CC19 -> PA18, SU30-32-33-34-35-37 -> SU27, P208 -> TWEN
- Removed feature positions if they are booked and not actually online
- Added SIGMETs transparency settings
- Filter preset save/reset now actually does it's job
- Applying filter from presets now fully rewrites it's settings instead of merging them
- You can now configure displayed count or disable airport counters and aircraft labels. Thanks to magicmq for this contribution!
- Added multiple organisers to event page
- VATGlasses step is now "500" instead of "1000"
- Added VATGlasses online-only color support
- Added diverted flight filter

## Bug Fixes

- Fixed VATGlasses crashing for anonymous users
- Fixed "A" button disappearing for VG level
- Fixed last update counter constantly changing its size and causing vG Level to move
- Fixed an issue when you could not click on SIGMET if non-VG UIR was active
- Fixed feature position display when no ATIS is online
- Fixed an issue when VG Combined Mode could get stuck (by Felix)
- Fixed an error when flight climbing or desending on heading didn't have it's track color change according to new altitude
- Fixed incorrect VATGlasses automatic altitude assigment for some cases
- Fixed an issue when you couldn't activate any preset because it always tried to get sorted (touch screens). Sort can now only be done via sorting icon, as it should have been from the start

# [1.1.1]

## Highlights

- Added VATGlasses dynamic sectors support
- Implemented BARS integration. Status will be displayed in Airport Overlay Info tab, Pilot Overlay (at the bottom when on ground), and also directly on map for Navigraph users
- Added VATGlasses to footer in active flight, so you can change levels to plan ahead and switch back to auto-level

## Features and Improvements 

- Added separate VATSIM General Discord link
- Added "Install App" button to header
- Added Sentry error reporting
- Added Data Policy Popup for GDPR and other compliance
- Updated Privacy Policy with little changes mentioning Data Policy Popup
- SIGMETs settings are now auto-collapsed on mobile. You can now also collapse them on PC
- Improved sigmets visibility so they get less confused with normal sectors
- Bookings on map will now show Zulu time by default with a new settings on both Booking and Map Settings pages
- Minor performance improvements on each update
- Removed estimate time for aircraft taxiing on ground
- Max users per favorite list increased to 200

## Bug Fixes

- Fixed scale being above menu on mobile
- Fixed rare issue when overlays were not showing up
- Improved mobile friends layout
- Fixed significant performance issues on Favorite Lists settings open
- Fixed small memory leak when leaving the map and going back again at the same tab
- Fixed some oceanic VATGlasses sectors not displaying
- Fixed VATSpy friends import if you only had a single preset
- Fixed VATGlasses combined positions not showing controllers correctly on click
- Fixed an issue when VATGlasses combined mode popup was suddenly closing on controller name hover
- Fixed traffic heatmap. Why did no one tell me it's broken?

# [1.1.0]

Welcome to newest VATSIM Radar update! This one is packed with a bunch of features that were requested from our fellow community.

## Highlights

🌩️ SIGMETs / AIRMETs (US)
📅 ATC Bookings
📊 Live Stats
📥 Friends Import
📂 Presets Sorting
✅ UI/UX Improvements and bug fixes

### SIGMETs

Enable SIGMETs for main map - or view them on separate page. You can also hide different types and click on SIGMETs to show additional details.

AIRMETs are also available for US. You can enable SIGMETs on map in Map Layers menu.

This data was provided by [Aviation Weather Center](https://aviationweather.gov/).

### Bookings (BETA)

Developed by Noah Elijah Till, Bookings are finally available in VATSIM Radar!

On separate page you can view a timeline with an ability to click on an airport to open facilities list. From here, you can also view all coming bookings on map.

They are also displayed on map (TWR and below) 1 hour before they come online. 

This feature should now be considered BETA - more improvements are coming later.

### Live Stats

With this long-time requested SimAware feature, you can view top Airports, Airlines, Aircraft, Routes, as well as ATC/Pilots online.

You can also sort by various columns, and filter map by some of the data you choose.

## Features and Improvements

- Favorite count in a single list was increased to 200 from 50
- Updated default map layer data
- Added Where2Fly integration into airports popup
- Changed data projection to EPSG:4326, thus improving data consumption, improving performance and making VR easier to work with for developers in most cases where EPSG:EPSG:3857 will now only be used under the hood
- Added diverting flight state by MindCollaps
- New icons from DotWallop (B350, C5M, C206, DR40, E3CF, E295, JS41, K35E, ME08, P212, PC21, R44, R66, SB20, SH36, SIRA, VC10, VISC)
- Added model matching (C210 -> C206, E290 -> E295, E3TF -> E3CF, K35R -> K35E)
- Added 10% opacity as possible for weather/layers opacity
- Restored north reset icon for mobile
- Removed duplicate runway identifier from thresholds
- Added auto-selection of list to "Add to Favorites" popup if you only have one list
- Added indication of no flight plan uploaded to pilot popup
- Unknown airports ICAO will now be properly displayed in flight plan window
- Applied small performance improvements on each map update
- Based on severe community feedback, changed "atc" in the footer to "ATC"
- Added "Z" suffix to time in events page if time is local
- Added single event page SEO optimization
- Airport names in destination card will now be limited by 2 lines
- Added sorting support for all presets
- Added import (even from VatSpy!)/export/copy of Favorite (Friends) in User Settings
- VATGlasses has been moved to the top of general as more frequently used setting
- Added relative scale indicator to map
- Renamed ATIS to ATC Information in ATC Overlay
- Added Map Setting that prevents VR to update center/zoom in address bar
- Removed duplicate ATC from VATGlasses popup

## Bug Fixes

- Fixed favorite add if it was exceeding max count
- Increased emergency color priority over enabled tracks
- Fixed invisible region in popups list
- Fixed airport default zoom change to floating number breaking whole map settings save
- Fixed the way pilots without flight plans display in Favorite tab
- Disabled zoom to CTR/FSS facilities
- Fixed this annoying issue when airport layouts (and more things) were just not loading on initial map open unless you move it
- Fixed aircraft popup on mobile version of Airport Dashboard
- Clicking on aircraft callsign will now also open it's popup in Airport Dashboard
- Fixed an issue when local timezone was not displayed in VATSIM Events page
- Fix delay when tracking aircraft
- Fixed an issue when controller ATIS was appearing incorrectly in VG mode
- Fixed R44 icon size

# [1.0.3-2]

- Fixed an issue when you could not set more than one filter parameter at once. Very sorry about that

# [1.0.3-1]

- Fixed gates not showing up for some airports when using Navigraph

# [1.0.3]

- New icons from DotWallop (P180, BA11, DH88, F28, J328)
- Added model matching (B3XM)
- Fixed ZSE VATGlasses display (we can now ignore some incomplete VG files. If you need this - write to us)
- Fixed sectors sometimes not rendering on mobile devices
- Improved rendering performance for mobile devices

# [1.0.2]

- New map layers, replacing CartoDB, and available in Light and Detailed variants. This layer renders on your device, so if you experience performance issues after this update - switch to Basic layer instead
- Fixed an error when pilot info panel was sometimes not displayed
- Excluded TCAS SIMBRIEF from detecting as virtual airline callsign
- Migrated METAR API to be fetched from VATSIM API
- Satellite layer comeback (works good in USA only). Old Satellite layer was renamed and is still available for paid users. A reminder: if anybody knows decent free satellite layer with no usage limits, I'm all ears
- Improved logic for new VA parse: aircraft will now be considered flying under VA ONLY if listed in [GNG DB](https://gng.aero-nav.com/AERONAV/icao_fhairlines?action=get&oper=grid&_search=false&nd=${Date.now()}&rows=10000&page=1&sidx=icao&sord=asc) or [VR Data](https://github.com/VATSIM-Radar/data/blob/main/custom-data/airlines.json)

# [1.0.1-1]

- New icons from DotWallop (BE9L, C402, RV10, EVOT, PA34, PA44)
- Added model matching (BE9T, EVOP, P8)
- Improved VATGlasses stability for incorrect HEX colors

# [1.0.1-final]

Welcome a small VATSIM Radar quality of life update.

## Highlights

- Layouts option will now always show in visibility to highlight that you can have it if you link Navigraph
- You can now switch timezones in events page
- New icons from DotWallop (PC24, G109, PITE/PITA, S12, B407, BN2P, C525, CP10, DC86, E50P, E55P, E75S/L, L101, RFAL, SPIT, SR71, TL20, TRIS, V22, VAMP, VULC)
- VA callsign parse will now also accept `-` and `=`, not only `/` as separator (ex. `CS-JERSEY-VFLYBE`, `CS=JERSEY=VFLYBE`)
- Added event separate page. Share events direct link if you like ;)

## Features and Improvements

- Corrected model matching (BAe 146/Avro RJ series, BCS3)
- Disabled v1 update popup
- Renamed Navigraph Layers to Navigraph Airports Layouts
- Added contact email to privacy policy and about page
- Added weekday to events page
- Removed country from airlines display
- FL999 for combined sector will now display as UNL
- Airport overlay will now also open on counters click (PC only)
- You can now force enable or disable VATGlasses by ?vg=1 (or vg=0) get parameter - or turn on by /vg alias
- Since we don't collapse ATIS anymore, ATC popup will open with max width, just like any other popup
- Improved events page opening speed

## Bug Fixes

- Fixed FSS errors in VATGlasses mode by Felix
- Fixed error when disabling Airports Layouts also made gates data worse

# [1.0.0-1-final]

- Added Virtual Airlines remarks parsing (CS/Callsign/Name, CS/Callsign, WEB/website)
- Fixed an error when event showed as active even if it has ended by @MicahBCode
- Fixed VATGlasses combined worker failing in certain cases by @FX5F
- Fixed VATGlasses positions popup width
- Fixed featured airports open in mobile version together with airport overlay

# [1.0.0]

This update marks an important milestone for VATSIM Radar. 

Of course, no one considered it a beta anymore, but we still didn't have features people could get used to in other map services. 

Well, we do now.

## Highlights

- 👓 VATGlasses integration: developed by community member Felix
- 🛣️ Airports Layouts: taxiway maps for Navigraph Unlimited subscribers
- ⭐ Friends: favorite your friends and create different lists for them
- 🗺️ Filters: configure what's displayed on the map to your liking
- 📌 Bookmarks: bookmark favorite locations or airports
- 🛠️ Quality of Life: new aircraft icons, airline name in popup, and many more UI/UX changes & improvements, as well as bug fixes

### VATGlasses

VATGlasses is a tool familiar to many, especially flying in complex European airspace. From now on, VATSIM Radar has integration with their data!

It is enabled by default, if you are logged in and have active flight. As always, you can control it from map settings.

You can also select active airports if there are some directly from pilot popup or airport info tab.

Thanks to Felix for developing this integration.

### Airports Layouts

Airports Layouts is a feature for Navigraph Unlimited subscribers that allows you to view airport map for large airports. 

Those airports have also received updates gates - that would be noticeable for airports that had incorrect gates before. As always, you can disable Layouts, as well as separated layers or fallback to old gates system in Map Settings -> Visibility. 

And for those of you who didn’t buy Navigraph Unlimited yet - here are the [Subscription options](https://navigraph.com/pricing?utm_source=vatsimradar&utm_medium=referral&utm_campaign=subscribe).

### Filters

Meet filters - inspired by VATSpy and FlightRadar 24 fitlers, they allow you to filter things out of map.

Filter by many things - callsigns, friend lists, dep/arr airports, routes (you can also set those from active events!), ratings, positions, and more.

You can also save your filters, and share them - even for those who are not logged in.

### Friends

An amazing feature that allows you to favorite your friends - and track them on map.

You can even make a different lists with different colors for easier tracking!

### Bookmarks

That one is simple: bookmark any location on a map to your list. You can also "favorite" an airport coordinate!

Bookmarks are also shareable with anyone. By the way, you can add a key binding for any bookmark!

## Features and Improvements

### New Features

- Added airline display into pilot popup
- Added active flight tracking button
- You can now share a link to atc via ?controller route param
- You can now change airport default zoom level
- New icons from DotWallop: A139-189, AN2, AS32-50, ATP, B06, B190, C310, DV20, E145, F2TH, F900, FAxx, IL76, L410, LJ35, PC6T, SF34, SF50, SU95, TEX2, TOR, YK40

### UI/UX Improvements

- Added basic VatSpy-like theme with no country borders etc. Very traffic effective
- Sectors borders and Airport Layouts are now drawn on x2 distance from your visible area
- You can now zoom higher
- After almost a year since user settings have appeared, you can now close them by clicking outside. A shame this took so long, isn't it?
- Opening airport dashboard will no longer cause airport to stay opened when you come back to main map
- Tabs are now pinned in every overlay you open
- Slight redesign of featured airports
- METARs and NOTAMs are now auto-expanded
- Increased width of copy block for easier read
- Removed map control buttons from mobile version
- Your aircraft will no longer be auto-tracked if you loaded website with query params
- Pilots stats in aircraft list will now be colored depending on their hours
- CTRL+F will now open VATSIM Radar's search box

### Bug Fixes

- Fixed search window sometimes lagging and taking whole screen height
- Fixed error when you couldn't switch fast between airports - nothing happened when you clicked on map
- Removed search button from non-homepage on mobile version. I mean, why was it here anyway?
- Supervisors online count will now show more precise data
- Fixed inability to re-select default opacity for OSM/Satellite layers
- Fixed BECMG active time display

# [0.5.1-1-final]

- You can now once again hover over aircraft overlay in resized window
- Fixed search window sometimes lagging and taking whole screen height
- Increased map settings height on mobile devices

# [0.5.1-final]

## Notable changes

- Removed orientation restriction for PWA apps. Those who installed VATSIM Radar on their devices and faced this issue may have to reinstall the app
- Once again fixed USA TRACONs, such as Houston approach, SCT_APP, CHI_X_APP, PCT_APP. I'm really sorry this kept happening each major update folks
- New aircraft icons from DotWallop
- Added model matching for C310 (as C172 for now)

## Features and Improvements

- You can now change colors of aircraft on ground separately from airborne
- Map last updated now turns red after 1 minute not updated, not 20 seconds
- Improved horizontal counter destination/arrival display
- Improved events datetime display to match timezone
- Clicking on airport in search will now result in focusing on it
- Clicking on search result in search will not result in it's closing
- Reduced aircraft icon maximum default size from 40px to 35px

## Bug fixes

- Simple departure line will no longer be drawn if aircraft is not visible
- Fixed an issue when tracks sometimes were not appearing in airport dashboard
- Fixed turns color sometimes become black
- Fixed the way VATSIM Radar searches for VatSpy data feature to more rely on boundary ID than on ICAO
- Fixed very rare case with some of FIR/ARTCC sector not displayed. Fixes new Turkish LTBB sector
- Fixed an issue with infinite zoom while switching between tracked aircraft
- Fixed A35K model matching

# [0.5.0.1-final]

A small hotfix with an issue when you could not save your map preset, if:

- You had once changed visibility of atc labels or airports without changing visibility of aircraft
- You pressed exclude my location without excluding arrival for airports hide
- You had the same local preset as the one you import

# [0.5.0]

## Highlights

- ⚙️ Map Settings: personalize the map with great variation of options
- 🔍 Search Feature: effortlessly find airports, controllers, or pilots
- 📅 Events Hub (Beta): discover and explore network events with all the details you need
- 📦 Progressive Web App (PWA): install VATSIM Radar on your device/PC for easy access (use Safari's "Add to Home Screen" for iOS/iPadOS)
- 📱 Mobile-Friendly Design: seamlessly use VATSIM Radar on phones and tablets
- ✨ Quality of life: enjoy new aircraft icons, community-driven enhancements, and bug fixes

### Map Settings

Added Map Settings into Filters menu.

Available settings:

#### General

- Enable Traffic Heatmap to get beautiful screenshots of active map areas
- Highlight aircraft squawking 7700/7600
- Change aircraft scale
- Change what is displayed in airports counters
- Disable training counter

#### Visibility

- Hide almost any layer on map
- Hide unstaffed ("random") airports from map
- Hide "A" ATC letter if this is the only ground "controller" for this airport
- Change how many tracks are displayed on map, and toggle tracks for departures, all traffic, etc
- Hide ground aircraft if zoomed out - or all of them

#### Colors

Change colors or transparency for almost anything you see on map

#### Manage

- Save your settings to database (up to 5 presets per user)
- Apply settings from old presets
- Export presets to share with friend
- Import presets to apply shared settings

### Search

- Search by airports, atc or pilots - including FAA LID, IATA, ICAO, and CIDs
- Remove search results to for example only search for pilots
- Control how many results are displayed

### Events page

Made by Thorsten.

- Basic, beta implementation
- View valuable info and beautiful banner
- Prefile routes on VATSIM or SimBrief - or copy them to clickboard
- Open participating airports from event block

## Features and improvements

### Features

- You can now copy and save current map location via browser URL
- You can now copy and save most of Airport Dashboard settings via browser URL
- Added PWA integration with ability to install VATSIM Radar on your PC or Phone ("Install app" button in "About", on iOS use "Add to home screen")
- Added Share window to Filters & Traffic with ability to share current URL with friends - including overlay
- Mobile/Tablet versions have been added
- Added ability to toggle arrivals tracks for airport dashboard
- Added training counter

### Improvements

- Reduced minimal and increased maximum size for aircraft icons. You will now notice more significant difference between aircraft sizes
- Improved model matching for A139-189, C700, C750 by StefBrands
- New aircraft icons from DotWallop: A20N, A338, A339, P28*, P51, PA24, U2, SR22, GLEX, BE60
- Significantly reduced data consumption
- Added copy button to controller frequencies
- Max showed tracks limit is now 50

### UI/UX

- METAR and TAF in Airport Dashboard have been merged in order to get a better look on NOTAMS
- Approaches are now drawn above aircraft
- Added CID and Stats link to Prefiles
- Added cyrillic improvements for Kazakhstan and Kyrgyzstan
- Improved TRACON label behaviour by Felix
- Removed overlay zoom restriction

## Bug Fixes

- Fixed an issue when overlapping approaches could make impossible to open controller info on one of them
- Fixed an issue when plane was not unselecting in airport dashboard
- Fixed Airport Arrivals hover tooltip width
- Fixed this annoying issue when airport name "dropped" close to dot
- Improved overall stability to prevent issues when Radar suddenly stops updating data
- You can no longer view airport arrival rate when overlay is collapsed
- Fixed ENOB_CTR and other oceanic sectors names
- Fixed rare case when airport would not show on map
- Mobile Safari font size in input will now be huge. Because Safari. Deal with it.
- Fixed some Australian airports showing twice on map
- Fixed Australian extending feature to now rely on controller ATIS

# [0.4.5-1]

- Added schedule to NOTAMS when available
- Fixed an error when NOTAMS were appearing very slowly in Airport Dashboard

# [0.4.5]

This is a small release with important bug fixes and improvements.

## New Features

- NOTAMs comeback
- Added sort by select to NOTAMs list
- Airport dot is now clickable
- Added time remains to pilot card and overlay

## Improvements

- Users who left all tabs are no longer counted in users counter in map footer
- Requests will no longer fire for unactive tabs
- ATC and Aircraft tabs in Airport overlay are now separated
- Improved airport dashboard performance in controller mode
- Unstaffed airport name label is now centered on dot and not ICAO name
- Aircraft label is now always shown for your aircraft only, and hidden if needed for those you selected

## Bug Fixes

- Fixed an issue when aircraft type change (for example, after flight plan upload) didn't change map icon
- You can no longer close update popup without updating
- Map date will no longer show as updated if it's actually not
- Frequency should now fit better into aircraft hover single-line layout
- Fixed an error in controller mode when aircraft list was not updating until you reload the page
- Fixed an issue when flight details were never shown in "Dashboard Only" mode of Airport Dashboard
- Fixed duplicated Center word for some UIRs

# [0.4.4]

Big thanks to Felix and DotWallop for making this release possible!

## Highlights

- 🌍 Featured Airports popup
- 🇦🇺 Australia extending sectors support
- ✈️ New aircraft icons
- 📊 Airport Arrival rate
- 🗺️ Carto Vector layer
- ✨ Many UI/UX improvements
- 🔧 Bug fixes to TRACON rendering - and much more

### Featured Airports

- View airports with much traffic from all around the world
- View quiet, yet staffed airports to find interesting places to go, learn to fly, or support lonely controller in your area
- Filter by visible only to view this stats in specific area

### New aircraft icons

- Updated helicopter icons matching
- Added new aircraft icons, thanks to DotWallop: A345, A346, A3ST, A400, AN24, B1, B2, B37(8,9)M, BCS1, C152, C17, C172, C208, C25C, DA40, DC10, DC3, DH8(A,B,C,D), DHC(2,6,7), EC45, EH10, F(14,15,16,18,22,35), GLID, KODI, SHIP, BALL, A10, A748, BE58, C130, C700, C750, CL60, E135, F117, G2CA

### Arrival rate

View Arrival Rate for airport with 15 minutes splits in Airport Dashboard and Overlay!

### Carto Vector layer

Added new Map Layer - Carto Vector Mode! Rendered in your browser with more bright dark theme

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

# [0.4.3]

- Slighty improved update browser performance
- Optimized turns render for very big aircraft list
- Fixed transponders starting with zero to skip that zero number (0123 -> 123)
- Optimized aircraft turns update
- Added new super fast update rate using websockets. You can opt out from it via new filters setting
- Fixed aircraft blinking when updating
- Several map update performance improvements

# [0.4.2]

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

# [0.4.1]

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
