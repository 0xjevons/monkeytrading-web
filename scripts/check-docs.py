#!/usr/bin/env python3
"""Check the agent docs.

Every relative Markdown link under agents/ and in the root *.md files must resolve to a file or
directory in the repository, and the root AGENTS.md and CLAUDE.md, when present, must be symlinks
to agents/AGENTS.md. A path is in the repository when git tracks it or would add it (untracked and
not ignored), so an ignored local file, which CI's checkout lacks, never counts. A symlink counts
only when the path it leads to exists and is in the repository too, and a symlinked page is read
at that path. A link starting with `/` resolves from the repository root, as GitHub renders it.
Anchors are not checked.

Links in fenced code blocks and code spans are skipped. An indented code block reads as prose, so
an example link belongs in a fenced block. Markdown the check cannot read fails it rather than
being skipped: a `](` outside every link it recognizes, and a code fence that never closes.

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

# A fence opens after indentation, block-quote markers, and list markers; a backtick fence's info
# string holds no backtick. It closes after indentation and as many block-quote markers.
CONTAINERS = r"(?:[ \t]*>[ \t]?|[ \t]*(?:[-+*]|\d{1,9}[.)])[ \t]+)*"
FENCE = re.compile(CONTAINERS + r"[ \t]*(`{3,}(?!.*`)|~{3,})")
QUOTE = re.compile(r"(?:[ \t]*>)*")
# A code span closes on the next backtick run of its opening run's length, before a blank line.
SPAN_END = re.compile(r"`+|\n[ \t]*\n")
BACKTICKS = re.compile(r"`+")
# Markdown lets a backslash escape any ASCII punctuation.
PUNCTUATION = frozenset("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")
ESCAPE = re.compile(r"\\([!-/:-@\[-`{-~])")
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


def index_link_errors(files, paths):
    """Return an error for each root index name present but not a symlink to INDEX."""
    index_exists = INDEX in files and os.path.isfile(INDEX)
    return [
        f"{name}: must be a symlink to {INDEX}"
        for name in INDEX_LINKS
        if name in paths
        and not (index_exists and os.path.islink(name) and real(name) == real(INDEX))
    ]


def blank_fences(text):
    """Return the text with fenced code blanked line for line, and the line of an unclosed fence."""
    kept, fence, opened, depth = [], None, None, 0
    for number, line in enumerate(text.split("\n"), 1):
        if fence:
            quote = QUOTE.match(line).group()
            rest = line[len(quote) :].strip()
            closes = len(rest) >= len(fence) and rest == fence[0] * len(rest)
            if closes and quote.count(">") == depth:
                fence = None
            line = ""
        elif match := FENCE.match(line):
            fence, opened, depth = match.group(1), number, line[: match.start(1)].count(">")
            line = ""
        kept.append(line)
    return "\n".join(kept), opened if fence else None


def blank_code_spans(prose):
    """Blank code spans in place, keeping line breaks, and find the unescaped `[` and `](`.

    Returns the blanked text with the offsets of each `[` and each `](` outside code spans.
    """
    out, opens, closes, i = list(prose), [], [], 0
    while i < len(prose):
        char = prose[i]
        if char == "\\" and prose[i + 1 : i + 2] in PUNCTUATION:
            i += 2
            continue
        if char == "`":
            run = BACKTICKS.match(prose, i).end() - i
            end = None
            for match in SPAN_END.finditer(prose, i + run):
                if match.group().startswith("\n"):
                    break
                if len(match.group()) == run:
                    end = match.end()
                    break
            if end:
                out[i:end] = ["\n" if c == "\n" else " " for c in prose[i:end]]
            i = end or i + run
            continue
        if char == "[":
            opens.append(i)
        elif char == "]" and prose[i + 1 : i + 2] == "(":
            closes.append(i)
        i += 1
    return "".join(out), opens, closes


def parse(text):
    """Return a page's links and problems as (line, destination, problem), in file order."""
    prose, unclosed = blank_fences(text)
    prose, opens, closes = blank_code_spans(prose)
    inline = [match for match in (INLINE_LINK.match(prose, start) for start in opens) if match]

    def line(offset):
        return prose.count("\n", 0, offset) + 1

    found = [(line(m.start(1)), m.group(1), None) for m in [*inline, *REFERENCE.finditer(prose)]]
    found += [
        (line(close), None, "a link the check cannot read")
        for close in closes
        if not any(match.start() <= close < match.end() for match in inline)
    ]
    if unclosed:
        found.append((unclosed, None, "a code fence that never closes"))
    return sorted(found, key=lambda item: item[0])


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
    errors = index_link_errors(files, paths)
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
        for line, dest, problem in parse(text):
            if problem:
                errors.append(f"{page}:{line}: {problem}")
                continue
            target = resolve(page, dest)
            if target is None:
                continue
            checked += 1
            if not (target in paths and real(target) in paths and os.path.exists(target)):
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
