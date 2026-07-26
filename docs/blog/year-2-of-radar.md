# Year 2 of VATSIM Radar

Hey folks! 2 years ago, VATSIM Radar has entered Open Beta. We have come a long way, but since yall already tired of me talking about our past, let's talk about future.

## Traditional stats

I forgot to include our traditional network stats to [State of Radar 2025](/blog/state-of-radar-2025).

Last 30 days of Radar bringed us:
1. 630 000 of page views
2. 2 billion requests to our API
3. 55 terrabytes of data served

## Feedback poll

I have concluded a feedback poll in February, and it is time to share results. 

### Respondents

1. Total responses are 812
2. 76.5% of respondents are not active ATC controllers
3. Elite 36.1% users are using VR from the beginning
4. 55% are only using VR for traffic overview when controlling, with just 21% using Airport Dashboard. A shame! It will need to get better

### Received feedback

1. Performance is rated at 8.26/10 with "8" being most popular answer
2. Mobile version UI/UX needs some love, rated at 7.29/10

### Most requested features

#### Features that need to be prioritized

1. ATC is now online push/oral notification 
2. ATIS parsing with runway detection
3. Event display on main map
4. SimBrief route preview
5. Images of airline type

Only 15.9% need Departure Call VATGlasses feature. 

#### Considering ideas that people voted for

1. Gates status in Airport Overlay. Honestly thought nobody needs that - 60% votes say otherwise
2. Aircraft collision prediction with 44% of votes (not to worry! It will likely not be implemented in a way you think it will)
3. PIREPs (28.5%)
4. Global Chat (18.7%. A network destroyer kind of feature)
5. 9.4% didn't vote for any of this thankfully

I have also received a bunch of other requests via text that will be worked on later.

## V2 development progress

Currently, a major feature has been implemented: Selects 2.0. That feature allowed us to implement long requested "infinite map" feature.

Also, it has eliminated all update lags I have faced, speeding up updates, hovers, clicking, route rendering, memory usage - and more, significantly.

Our next steps:
1. UI redesign
2. Map Settings 2.0
3. Backlog features (some can be moved back to considering in case I decide that 2.0 is taking too long)

I currently plan V2 to enter closed beta in Q2 2026, releasing for everyone this Summer. This is likely a realistic schedule, considering my main work and incoming apartment reparation. Wish me luck.

## A note on performance

While performance has already been improved significantly in V2, including:
1. Map lags as hell when zoomed out. A new feature to "declutter" aircraft is coming in v2 that will automatically hide aircraft if they overlap one another, leading to significant render boost
2. Map lags for a while when VATGlasses is enabled. VATGlasses render has been reworked completely, leading to significant performance boost (except for those who use Combined mode)
3. Map layer is lagging when zooming in. Basic layer seems to be good for most people, and this does not have a good solution. Hovewer, we plan to add paywalled "MapBox" layer. It costs money, and will only be available to Patreon members, offering a better memory and performance
4. VATSIM Radar eats more traffic than it could. Regular datafeed will be reduced in size in V2 with a small performance cost on client-side

### Performance Mode

We plan to add a Performance Mode toggle in V2, with such settings being locked:

1. Aircraft and airports declutter when zoomed out
2. Basic, OSM and Satellite layers as only available options (Basic layer will also be reworked to pngs instead of plain render for this feature)
3. Fast updates turned off (probably)
4. Aircraft tracks/routes rendering for smaller aircraft count that default
5. Probably more

Overall, V2 will be much better on performance and interaction by itself, so you may not need that. 

## VATSIM Radar Data

Let's also talk about the future of 2 very specific VATSIM Radar features: VAs badges and ATC duplication.

### VA Badges

This system will likely be deprecated in V2 in favor of prioritizing official VAs, or by using a more centralized system based on VATSIM Radar.

Current dataset is hard to maintain, and also allows for custom text in remarks, which is not good.

### ATC Duplication

ATC duplication will likely be moved to a separate repository, or a new service. 

This repository could also be a new dataset (VATSpy dataset replacement), VR-based repo (like VAs, but more organized), or a new centralized system based on VATSIM Radar.

Following this, I plan to enforce validation for all ATC duplication contributors, with the [same list as VATSpy/SimAware dataset](https://docs.google.com/spreadsheets/u/4/d/e/2PACX-1vRHzHhKz4icslNkd3I6mF1Mp_6gan4muRcWZb8fCYL8_S0C6GDpG409xQGTmPAXLPupEWWws3euNK7O/pubhtml?gid=0)