#!/usr/bin/env python3
"""Check the agent docs.

Every relative Markdown link under agents/ and in the root *.md files must resolve to a file or
directory in the repository, and the root AGENTS.md and CLAUDE.md, when present, must be symlinks
to agents/AGENTS.md. A path is in the repository when git tracks it or would add it (untracked and
not ignored), so a local run agrees with CI's checkout. Anchors are not checked.

Run from anywhere in the repository. Prints a summary and exits 0, or lists every failure on
stderr and exits 1.
"""

import os
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit

INDEX = "agents/AGENTS.md"
INDEX_LINKS = ("AGENTS.md", "CLAUDE.md")

# A backtick fence's info string holds no backtick.
FENCE = re.compile(r"\s*(`{3,}(?!.*`)|~{3,})")
# A code span may wrap onto the next line, but never across a blank line.
CODE_SPAN = re.compile(r"(`+)(?:(?!\n[ \t]*\n).)+?(?<!`)\1(?!`)", re.DOTALL)
# `[text](dest "title")` and `![alt](dest)`; the text may wrap and hold one level of brackets.
INLINE_LINK = re.compile(
    r"\[(?:[^\[\]]|\[[^\[\]]*\])*\]"
    r"\(\s*(<[^<>\n]*>|[^\s()<>]+)(?:\s+(?:\"[^\"]*\"|'[^']*'))?\s*\)"
)
# `[label]: dest`, but not a `[^note]:` footnote.
REFERENCE = re.compile(r"^ {0,3}\[(?!\^)[^\[\]]+\]:[ \t]*(<[^<>\n]*>|\S+)", re.MULTILINE)


def git(*args):
    return subprocess.check_output(["git", *args], text=True)


def repo_paths():
    """Return the repository's files, and every directory that holds one ("." for the root)."""
    listed = git("ls-files", "-z", "--cached", "--others", "--exclude-standard").split("\0")
    files = {path for path in listed if path and os.path.lexists(path)}
    dirs = {"."}
    for path in files:
        parent = os.path.dirname(path)
        while parent and parent not in dirs:
            dirs.add(parent)
            parent = os.path.dirname(parent)
    return files, dirs


def index_link_errors(files):
    """Return an error for each root index name present but not a symlink to INDEX."""
    index_exists = INDEX in files and os.path.isfile(INDEX)
    return [
        f"{name}: must be a symlink to {INDEX}"
        for name in INDEX_LINKS
        if name in files
        and not (
            index_exists
            and os.path.islink(name)
            and os.path.realpath(name) == os.path.realpath(INDEX)
        )
    ]


def links(text):
    """Yield (line number, destination) for each link outside code blocks and code spans."""
    kept, fence = [], None
    for line in text.split("\n"):
        stripped = line.strip()
        if fence:
            if len(stripped) >= len(fence) and stripped == fence[0] * len(stripped):
                fence = None
            line = ""
        elif match := FENCE.match(line):
            fence = match.group(1)
            line = ""
        kept.append(line)
    # Blanking code keeps its line breaks, so line numbers still match the file.
    prose = CODE_SPAN.sub(lambda span: "\n" * span.group().count("\n"), "\n".join(kept))
    for match in [*INLINE_LINK.finditer(prose), *REFERENCE.finditer(prose)]:
        yield prose.count("\n", 0, match.start(1)) + 1, match.group(1)


def resolve(source, dest):
    """Return the repository path a relative link points to, or None for any other link."""
    url = urlsplit(dest[1:-1] if dest.startswith("<") else dest)
    if url.scheme or not url.path or url.path.startswith("/"):
        return None
    return os.path.normpath(os.path.join(os.path.dirname(source), unquote(url.path)))


def main():
    os.chdir(git("rev-parse", "--show-toplevel").strip())
    files, dirs = repo_paths()
    errors = index_link_errors(files)
    # A symlinked page is checked through its target.
    sources = sorted(
        path
        for path in files
        if path.endswith(".md")
        and (path.startswith("agents/") or "/" not in path)
        and not os.path.islink(path)
    )
    checked = 0
    for source in sources:
        with open(source, encoding="utf-8") as page:
            text = page.read()
        for line, dest in links(text):
            target = resolve(source, dest)
            if target is None:
                continue
            checked += 1
            if target not in files and target not in dirs:
                errors.append(
                    f"{source}:{line}: {dest} does not resolve to a file in the repository"
                )
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Checked {checked} relative links in {len(sources)} Markdown files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
