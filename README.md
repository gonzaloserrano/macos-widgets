# macos-widgets

[Übersicht](https://tracesof.net/uebersicht/) widgets for macOS.

![screenshot](screenshot.png)

## Widgets

| Widget | File | Description |
|--------|------|-------------|
| Next Meeting | `widgets/next-meeting.jsx` | Shows the next upcoming Google Calendar event with start time and countdown |
| TODO | `widgets/todo.jsx` | Displays contents of `~/TODO.txt` |
| Audio | `widgets/audio.jsx` | Shows current audio input and output devices |
| Timezones | `widgets/timezones.jsx` | Shows current time in CET, UTC, US East, US West, and India |
| GitHub PRs | `widgets/github-prs.jsx` | Shows PRs awaiting your review via `gh` CLI |

## Dependencies

- [Übersicht](https://tracesof.net/uebersicht/) — `brew install --cask ubersicht`
- [gog](https://github.com/steipete/gogcli) — Google Calendar CLI, used by the next-meeting widget. `brew install steipete/tap/gogcli`, then `gog auth login` to authenticate.

## Usage

```
make deploy
```
