# AI Agent Decisions

- `UiBurger` treats the numeric `size` prop as the burger line width in pixels. Line height, gap, and active-state translate distance scale from that width via CSS variables, preserving the original 12px-wide visual proportions by default.
- Settings page hash navigation scrolls the internal `.settings_content` container, so target offsets must be calculated relative to that container's bounding rect and `scrollTop`, not relative to the viewport top.
