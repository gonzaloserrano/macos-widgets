# macos-widgets

[Übersicht](https://tracesof.net/uebersicht/) widgets for macOS.

<img src="screenshot-17.png" width="250">

## Widgets

| Widget | File | Description | Click action |
|--------|------|-------------|--------------|
| Stack (left) | `stack.jsx` | Container that vertically stacks all widgets into a single card column, runs their commands, and provides shared styles | Refresh button re-runs all commands |
| Stack (right) | `stackRight.jsx` | Second vertical stack positioned at the bottom-right of the screen | Refresh button re-runs all commands |
| Learn Claude | `widgets/claude-commands.jsx` | Shows a random Claude Code slash command scraped from the [official commands docs](https://code.claude.com/docs/en/commands). The docs are re-fetched at most once a day (cached in `/tmp/ub_cc_commands_html`); removed/deprecated commands are filtered out. Renders the command name and its argument hint in purple, with the description below (click to expand the full text) | Header re-picks a new command instantly from the cached list; click the description to expand/collapse its full text |
| Learn Nvim | `widgets/nvim-keys.jsx` | Shows a random neovim keymap from `~/.config/nvim/init.lua` | Header refreshes to show a new keymap |
| Ping | `widgets/ping.jsx` | Pings gateway and 1.1.1.1; header shows compact `gw / dns` ms (green/blue) next to the title, with a toggle between sparkline graph and big color-coded numbers | Header icon toggles graph ↔ numbers |
| Battery | `widgets/battery.jsx` | Single-row ring gauges for Mac, AirPods buds, AirPods case, Magic Keyboard, and mouse. Mac level/charging from `pmset`, Bluetooth devices from `system_profiler SPBluetoothDataType`, keyboard battery from `ioreg`. Icon glyphs are bundled PNGs (`battery-laptop.png`, `battery-airpods.png`, `battery-case.png`, `battery-keyboard.png`, `battery-mouse.png`). Ring color goes yellow under 50% and red under 25% (same `#ff453a` as the Week widget); charging shows a yellow ⚡ above the ring. Ring size auto-shrinks (28–42px) so 1–5 devices all fit in the row | Click anywhere on the row refreshes |
| Timezones | `widgets/timezones.jsx` | Shows current time in PST, CST, EST, UTC, CET, and IST. Collapsed by default to just the last two (CET, IST) | Header toggles between collapsed (last 2) and expanded (all 6) |
| Calendar | `widgets/calendar.jsx` | Combined week view + next Google Calendar meeting in one card. Top: single-row Mon-Sun grid with a workday progress bar in the month header (9-18h, Wed ends at 16h) that shrinks right-to-left; in the final hour a red `Xm` label appears next to it. Today in red, weekends dimmed and bar hidden. Bottom: next meeting with time, countdown, and meeting link, plus the following meeting's time when it starts within an hour. Skips events where every other (non-self, non-room) attendee has declined. Adds an orange border when the next meeting starts within 15 minutes, a red border within 5 minutes, and a pulsing red halo within 2 minutes | Month header refreshes; click dates to expand 3 more weeks; meeting link icon opens Google Meet/Zoom |
| TODO | `widgets/todo.jsx` | Renders `~/TODO.md` as colored sections. Blank lines divide the file into sections, each tinted with its own background color (cycling a 6-color palette). A section's first line is its title (any line that isn't a `- ` item), shown as a bold header with a transparent separator below it; a section whose first line is already a `- ` item is title-less (e.g. the low-prio block). Within a section, `- [ ]` / `- [x]` lines become numbered rows (index restarts at 0 per section) with HTML checkboxes (checked items struck through), and 2-space-indented items render as nested children with a `◦` marker. Markdown links `[text](url)` and `**bold**` in item text render inline; links open in the default browser. `@user` mentions render as colored chips with the `@` stripped; every distinct user gets its own hue (spaced by the golden angle across all mentions found in the file, so no two users collide) and keeps that color consistently across the widget. The file is split by `---` into three parts: (1) visible TODOs, (2) low-prio TODOs hidden behind a `+ N` toggle in the header, (3) free-text scratch never rendered | TODO label refreshes; `✓ N` toggles hiding done items (along with their nested descendants); `+ N` / `− N` toggles low-prio block; clicking a checkbox toggles `[ ]` ↔ `[x]` in `~/TODO.md` and refreshes; clicking elsewhere on the list opens `~/TODO.md` in `vi` in a cmux workspace named TODO, reusing the existing one (selecting it and raising its window) if present, otherwise creating a new focused one; links open their URL |
| GitHub PRs | `widgets/github-prs.jsx` | Shows your open PRs and PRs awaiting your review (max 5 each) via `gh` CLI with color-coded repo names. Bot authors (timescale-automation, github-actions, dependabot) and archived repos are filtered from the review list, as are PRs you've already touched (submitted a review or left a top-level comment) where no new commits have landed since. Redact toggle hides repo/PR names. Collapse toggle hides the PR list (showing a `N mine, N review` summary) and persists across refreshes | Header opens GitHub PRs page; each PR opens its URL; collapse/redact toggles in the header |
| Linear | `widgets/linear-tickets.jsx` | Shows assigned Linear tickets sorted by priority with state icons. Redact toggle hides ticket titles. Collapse toggle hides the ticket list and persists across refreshes | Each ticket opens its Linear URL; collapse/redact toggles in the header |
| Learn English | `widgets-right/learn-english.jsx` | Shows a random entry from `~/english.txt`, one entry per line in `phrase \| meaning \| example` format (`#` comments skipped; meaning and example optional, so a bare phrase still works). Renders three color-coded lines: phrase (cyan, bold monospace), meaning (amber), and an example sentence (green italic, quoted). Seeded with business/work-focused English phrases and idioms | Header refreshes to show a new entry; clicking the phrase opens `~/english.txt` |
| Image | `widgets-right/image.jsx` | Displays an image from a URL or local path in `~/WIDGET_IMAGE`, resized to widget width. Title shows filename | Opens URL in browser (remote) or file in Preview (local) |
| Image 2 | `widgets-right/image2.jsx` | Second image slot: same behavior as Image but reads the source path/URL from `~/WIDGET_IMAGE_2` | Opens URL in browser (remote) or file in Preview (local) |

## Dependencies

- [Übersicht](https://tracesof.net/uebersicht/) — `brew install --cask ubersicht`
- [gog](https://github.com/steipete/gogcli) — Google Calendar CLI, used by the next-meeting widget. `brew install steipete/tap/gogcli`, then `gog auth login` to authenticate.

## How it works

Each widget is a separate file in `widgets/`. The `stack.jsx` template contains the shared layout, styles, and a `// {{WIDGETS}}` placeholder. Running `make deploy`:

1. Concatenates all `widgets/*.jsx` into the placeholder position in `stack.jsx`
2. Outputs the result to `build/stack.jsx`
3. Copies it to the Übersicht widgets directory
4. Refreshes Übersicht

## Usage

```
make deploy        # build and deploy to Übersicht
make screenshot    # capture widget area to screenshot-XX.png
```
