"""Pull the individual source modules back out of a webpack eval bundle.

campaign-api ships only a built bundle, but it was built with an eval-based
devtool: each module sits inside its own eval() string, ends with a
//# sourceURL comment naming the file it came from, and is readable JavaScript
rather than minified soup.

That matters because it turns "hand-edit a 789KB bundle on a live call path"
into "edit one small named file" - and it means a change can be reviewed as a
diff of that file before anything goes near the server.
"""

import json
import pathlib
import re
import sys

src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8", errors="replace")
out_dir = pathlib.Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)

# Each module is `eval("...");` with the escaped source inside. Decoding it as a
# JSON string is the reliable way back: webpack escapes it the same way.
pattern = re.compile(r"eval\((\"(?:[^\"\\]|\\.)*\")\);")

found = 0
for match in pattern.finditer(src):
    try:
        body = json.loads(match.group(1))
    except Exception:
        continue

    # The comment is NOT the last thing in the module: webpack closes each one
    # with "?\n}" after it. Anchoring this to the end of the string finds
    # nothing, which is exactly the silent way to "recover" zero files.
    name = re.search(r"//# sourceURL=webpack://[^/]+/\./([^\s?]+)", body)
    if not name:
        continue

    rel = name.group(1).strip()
    # Keep the original tree shape, but write .js - this is the compiled form,
    # not the TypeScript that produced it, and pretending otherwise would invite
    # somebody to try building it.
    target = out_dir / (rel[:-3] + ".js" if rel.endswith(".ts") else rel)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body, encoding="utf-8")
    found += 1

print("recovered %d modules into %s" % (found, out_dir))
