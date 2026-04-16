const _image2Cmd = [
  'SRC=$(cat ~/WIDGET_IMAGE_2 2>/dev/null | head -1 | sed "s|^~|$HOME|")',
  '[ -z "$SRC" ] && exit 0',
  'TMP=/tmp/ub_image2_src',
  'if [ -f "$SRC" ]; then cp "$SRC" "$TMP"; else curl -sfL "$SRC" -o "$TMP" || exit 0; fi',
  'sips -Z 372 "$TMP" --out "$TMP" >/dev/null 2>&1',
  'printf "%s\\n%s" "$SRC" "data:image/png;base64,$(base64 -i "$TMP" | tr -d "\\n")"',
].join("; ");

const Image2Widget = ({ output, refresh }) => {
  const raw = (output || "").trim();
  if (!raw) return <div style={s.empty}>No image</div>;
  const newline = raw.indexOf("\n");
  const src = raw.substring(0, newline);
  const dataUri = raw.substring(newline + 1);
  const openCmd = src.startsWith("/") ? 'open /tmp/ub_image2_src' : 'open "' + src + '"';
  return (
    <div>
      <div className="clickable" style={{ ...s.label, cursor: "pointer" }} onClick={refresh}>IMAGE {src.split("/").pop()}</div>
      <img
        src={dataUri}
        style={{ width: "100%", borderRadius: "6px", display: "block", cursor: "pointer" }}
        className="clickable"
        onClick={() => run(openCmd)}
      />
    </div>
  );
};

widgets.push({ key: "image2", order: 6, ttl: 30, cmd: _image2Cmd, Component: Image2Widget });
