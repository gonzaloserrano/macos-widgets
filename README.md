# macos-widgets

[Übersicht](https://tracesof.net/uebersicht/) widgets for macOS.

<img src="screenshot.png" width="250">

## Widgets

| Widget | File | Description |
|--------|------|-------------|
| Stack | `stack.jsx` | Container that vertically stacks all widgets into a single card column, runs their commands, and provides shared styles |
| Audio | `widgets/audio.jsx` | Shows current audio input and output devices |
| Timezones | `widgets/timezones.jsx` | Shows current time in PST, CST, EST, UTC, CET, and IST |
| GitHub PRs | `widgets/github-prs.jsx` | Shows PRs awaiting your review via `gh` CLI |
| TODO | `widgets/todo.jsx` | Displays contents of `~/TODO.txt` |
| Next Meeting | `widgets/next-meeting.jsx` | Shows the next upcoming Google Calendar event with start time and countdown |

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
make deploy
```
