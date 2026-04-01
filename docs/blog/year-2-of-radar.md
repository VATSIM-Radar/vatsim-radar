# Year 2 of VATSIM Radar

Hey folks! I have totally missed that VATSIM Radar turned 2 years from initial idea (20 March 2024). We have come a long way, but since yall already tired of me talking about our past, let's talk about future.

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
1. Context menu feature
2. UI redesign
3. Map Settings 2.0
4. Backlog features (some can be moved back to considering in case I decide that 2.0 is taking too long)

I currently plan V2 to enter closed beta in Q2 2026, releasing for everyone this Summer. This is likely a realistic schedule, considering my main work and incoming apartment reparation. Wish me luck.

## A note on performance

While performance has already been improved significantly in V2, those issues still remain:
1. Map lags as hell when zoomed out. I plan to implement a new feature to "declutter" aircraft. That will automatically hide aircraft if they overlap one another, leading to significant render boost
2. Map lags for a while when VATGlasses is enabled. Also, VATGlasses is eating performance and memory on a server. A major rework is planned, so it will not affect website, or server performance anymore, and will also support bookings
3. Map layer is lagging when zooming in. Basic layer seems to be good for most people, and this does not have a good solution. Hovewer, we plan to add paywalled "MapBox" layer. It costs money, and will only be available to Patreon members, offering a better memory and performance
4. VATSIM Radar has heavy traffic usage. That will also be improved with a planned rework on how ATC is calculated server-side, moving that logic to client-side, planned to happen without significant performance loss due to an upgraded skill of mine :p

### Performance Mode

We plan to add a Performance Mode toggle in V2, with such settings being locked:

1. Aircraft declutter when zoomed out
2. Basic, OSM and Satellite layers as only available options (Basic layer will also be reworked to pngs instead of plain render for this feature)
3. Fast updates turned off (probably)
4. Aircraft tracks/routes rendering for smaller aircraft count that default
5. Probably more

Overall, V2 will be much better on performance and interaction by itself. 

## VATSIM Radar Data Project

Currently, VATSIM Radar is expanding with a data, that is poorly maintained and not available to others, including:

- VAs. VA detection logic is terrible, all data is saved in one big file, leading to maintenance cost, slow merging and bunch of random small VAs in it
- Position duplication. Logic is RegExp-based, doesn't have a proper validation and owners, not available to anyone outside of VATSIM Radar

There is also a request for a better gates for everyone, even without Navigraph package. Currently, many pilots choose gate not considering their aircraft type. VATSIM Radar is a project that can help people with that, but it also lacks some data.

I plan to start working on this new project after V2 is released, to solve all above issues.

### About the project

At some point, an admin panel will appear on VATSIM Radar, or separate domain. 

It will have:
- Division-based access and role system for managers inside of it
- An approval policy for ATC duplication and VAs
- Gates management system, and maybe even a booking system (considering that one)
- Public API, available to everyone
- VAs flight validation and detection: each VA will be required to provide a list of pilots in it (somehow, including API integration with popular services), and it will still be remarks-based, but this time most data will be parsed from system, not from remarks
- VATSIM/SUPs access to this system

Not all of the above is guaranteed to be implemented, and I am also in contact with VATSIM team about this system. 

There is also a request in network about a better dataset than VATSpy and SimAware, that can also be covered by this system, but it will require a different and more complex approach.

## Conclusion

V2 development is going slowly, but I am satisfied with the progress it made. VATSIM Radar is used by majority of network, and I will be glad to make this service even better.

If you would like to support our work and try render rework right now, you can visit our Patreon: https://www.patreon.com/vatsimradar24

See you in network!