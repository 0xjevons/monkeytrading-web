#!/usr/bin/env python3
"""Check the agent docs.

Every relative Markdown link under agents/ and in the root *.md files must resolve to a file or
directory in the repository, and the root AGENTS.md and CLAUDE.md, when present, must be symlinks
to agents/AGENTS.md. A path is in the repository when git tracks it or would add it (untracked and
not ignored), so an ignored local file, which CI's checkout lacks, never counts. A symlink counts
only when the path it leads to is in the repository too, and a symlinked page is read at that
path. A link starting with `/` resolves from the repository root, as GitHub renders it. Anchors
are not checked.

Links in fenced code blocks and code spans are skipped. An indented code block reads as prose, so
an example link belongs in a fenced block.

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
# A code span opens and closes on whole backtick runs of one length, and may wrap onto the next
# line but never across a blank line.
CODE_SPAN = re.compile(r"(?<!`)(`+)(?!`)(?:(?!\n[ \t]*\n).)+?(?<!`)\1(?!`)", re.DOTALL)
# Markdown's link syntax, with backslash escapes and one level of nested brackets or parentheses.
TEXT = r"\[(?:[^\[\]\\]|\\.|\[(?:[^\[\]\\]|\\.)*\])*\]"
DEST = r"<(?:[^<>\n\\]|\\.)*>|(?:[^\s()\\]|\\.|\((?:[^\s()\\]|\\.)*\))+"
TITLE = r"\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*'|\((?:[^()\\]|\\.)*\)"
# `[text](dest "title")`, also inside `![alt](dest)`.
INLINE_LINK = re.compile(rf"{TEXT}\(\s*({DEST})(?:\s+(?:{TITLE}))?\s*\)", re.DOTALL)
# `[label]: dest`, the destination on the same line or the next, but not a `[^note]:` footnote.
REFERENCE = re.compile(
    r"^ {0,3}\[(?!\^)(?:[^\[\]\\]|\\.)+\]:[ \t]*\n?[ \t]*(<(?:[^<>\n\\]|\\.)*>|\S+)", re.MULTILINE
)
# Markdown lets a backslash escape any ASCII punctuation.
ESCAPE = re.compile(r"\\([!-/:-@\[-`{-~])")


def git(*args):
    return subprocess.check_output(["git", *args], text=True)


def real(path):
    """Return the repository-relative path that path's symlinks lead to."""
    return os.path.relpath(os.path.realpath(path))


def repo_paths():
    """Return the repository's files, and those files with every directory that holds one."""
    listed = git("ls-files", "-z", "--cached", "--others", "--exclude-standard").split("\0")
    files = {path for path in listed if path and os.path.lexists(path)}
    paths = files | {"."}
    for path in files:
        parent = os.path.dirname(path)
        while parent and parent not in paths:
            paths.add(parent)
            parent = os.path.dirname(parent)
    return files, paths


def index_link_errors(files):
    """Return an error for each root index name present but not a symlink to INDEX."""
    index_exists = INDEX in files and os.path.isfile(INDEX)
    return [
        f"{name}: must be a symlink to {INDEX}"
        for name in INDEX_LINKS
        if name in files
        and not (index_exists and os.path.islink(name) and real(name) == real(INDEX))
    ]


def links(text):
    """Yield (line number, destination) for each link outside code, in file order."""
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
    # Matching at every unescaped `[` also finds an image inside a link's text.
    brackets = re.finditer(r"(?<!\\)\[", prose)
    inline = (INLINE_LINK.match(prose, bracket.start()) for bracket in brackets)
    found = [match for match in inline if match] + list(REFERENCE.finditer(prose))
    for match in sorted(found, key=lambda match: match.start(1)):
        yield prose.count("\n", 0, match.start(1)) + 1, match.group(1)


def resolve(source, dest):
    """Return the repository path a relative link points to, or None for any other link."""
    url = urlsplit(ESCAPE.sub(r"\1", dest[1:-1] if dest.startswith("<") else dest))
    if url.scheme or url.netloc or not url.path:
        return None
    path = unquote(url.path)
    base = "" if path.startswith("/") else os.path.dirname(source)
    return os.path.normpath(os.path.join(base, path.lstrip("/")))


def main():
    os.chdir(git("rev-parse", "--show-toplevel").strip())
    files, paths = repo_paths()
    errors = index_link_errors(files)
    pages = set()
    for path in sorted(files):
        if path.endswith(".md") and (path.startswith("agents/") or "/" not in path):
            if real(path) in files and os.path.isfile(path):
                pages.add(real(path))
            else:
                errors.append(f"{path}: does not resolve to a file in the repository")
    checked = 0
    for page in sorted(pages):
        with open(page, encoding="utf-8") as markdown:
            text = markdown.read()
        for line, dest in links(text):
            target = resolve(page, dest)
            if target is None:
                continue
            checked += 1
            if target not in paths or real(target) not in paths:
                errors.append(
                    f"{page}:{line}: {dest} does not resolve to a file in the repository"
                )
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Checked {checked} relative links in {len(pages)} Markdown files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
