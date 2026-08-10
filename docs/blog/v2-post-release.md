# VATSIM Radar v2 feedback and what's next

Hey all. VATSIM Radar v2 has released 2 weeks ago as I'm writing this post.

Let's talk about your feedback and answer some questions.

## General Feedback

I've conducted a poll about v2. Unfortunately, only 150 responses were received, while I hoped this number to be at or
above at least 300.

Still, we have a lot of feedback to discuss.

### Performance

That one was not bothering me much as v2 had a LOT of improvements for performance. That's why it was surprising to view
poll results. I've received multiple complaints about performance initially but ignored them, since I thought they are
only true for minority of people. I was proven wrong.

- How is performance for you on Desktop?
    - Much better than before: 14%
    - Better than before: 20%
    - Same as before: 26%
    - Worse than before: 21%
    - Much worse than before: 10%
    - Can't tell: 9%

For more than 30% of users performance has become worse than before v2 update.

Almost same picture is for mobile.

- Much better than before: 11%
- Better than before: 16%
- Same as before: 21%
- Worse than before: 15%
- Much worse than before: 11%
- Can't tell: 26%

#### What I'm going to do about it

With community feedback and with my own touch, I've discovered multiple pain points for performance:

- Zoom out lags as hell, especially on mobile
- Performance is not good when moving the map around crowded area
- All watchers are not paused when moving the map
- Navigraph Layers are performance killers

For most people, the best solution would be to lower aircraft display limit. That confirms my theory with all of that.
With update v2.0.1, when you move map, you will only see cached results for scale, heading, and other stuff. That will
cause a short delay, but will hopefully severely improve performance.

All of that have already been fixed on Next. If you are reading this and having performance issues - reach out to me in
Discord, I can give temporal access to Next and we can test it.

### UI & UX

Update v2 has been rated with 6.48 medium rating. That is far lower than I would expect from 8 months of work and
dozens, or even hundreds of hours I've spent in my free time.

Redesign is always a risk and many people could dislike it. Still, we have specific aspects than will be changed, and
some that will not.

#### New font

I've noticed that generally new font is okay, but the decision to use so-called Jura font in controller info and pilot
hours has proven to be wrong and contributed poorly to readability, especially for ATIS.

In v2.0.1, font here will be changed to same font as whole website, and in future we will consider using another font
instead of Jura in other places where it's used.

#### New design

New design is, in my and designers opinion, far superior to previous.

Some people have claimed that new design looks vibecoded, and that's obviously sad to hear. To clarify:

1. Each UI component was updated without usage of any AI model
2. Design for each UI component was handcrafted by a real designer **who is also v1 design author**
3. Our design direction will not face significant changes in near future

I'm not saying that design is final for all elements. Same as with ATIS, you are free to point out specific places that
disappoint you in new design, where you have reduced readability and stuff.

For example, during development DGTA icons looked much differently, and I've refused to change them multiple times -
that was until I've received an issue that new colors are not contrast enough for colorblind people. Icons were changed
the next day I've received this issue. "Old design good new bad" is not a valid feedback about design, and does not help
anyone.

Some don't like new "short" ATC icons, you can always bring them back to
v1 [in Settings](https://next.vatsim-radar.com/settings/map/airports) by setting Short facilities view to Never.

### Desktop App

A lot of people have performance issues in Desktop App, and some point out that it's the same as web.

To be completely clear: I've initially refused to make an app because it will be exactly the same, yet I still made it
based on community feedback.

What it gives you:

1. You can pin app, open it using Application menus, and even let it run in tray
2. It opens on the same screen and size where you left it
3. You can enable Discord Presence in Settings -> Application Settings

That's it, **at a cost of higher memory usage** because it is Electron.

### v2.0.1

In next Radar update, following changes will take place:

1. Changed font for ATIS information and flight/atc hours
2. More airports will show on map like they did in v1. Behavior has changed in v2 and you could change it back, but many
   people didn't find setting and saw much less airports on map. That changes default setting - you can always overwrite
   it to how it was on v2 release
3. Hover smoothness will be improved
4. Hover will be re-enabled on tablets (you'll be able to turn it off, or even enable for mobile devices)
5. Restored EOBT, Time Enroute and Fuel Time in Prefile window
6. Performance will be improved, with smooth aircraft movement updates turned off when moving the map, reduced
   re-renders, improved performance when hover is disabled on mobile, improved performance for Navigraph layer, and more

This update is expected to be released in coming weeks.

### v2.1

As for our next steps, based on my roadmap and community feedback, VATSIM Radar v2.1 will probably have such features:

1. VATSIM User Page. Planned features:
    - StatSim integration
    - Flights and ATC sessions history
    - Flights playback
    - Customization options with extended customization for Patreons
    - Public friends list (different from favorite lists)
    - Maybe something more
2. Historical stats using StatSim integration
3. Events alerts
4. Past-event heatmap/tracks (SimAware feature)

Since settings market (settings presets from other users) has not received a lot of votes, it's fate will be decided
based on my free time.

As for considering features, winners are Hoppie and Collision prediction. If I'll decide to work on Collision
prediction, I will first talk about it with Supervisor department - so this feature may not be implemented if they say
so.

VATSIM Radar v2.1 is expected to release before the end of this year.

Keep your feedback coming - I'm always open for it in Discord. Thank you for using VATSIM Radar.