#!/usr/bin/env python3
"""Check the agent docs.

Every relative Markdown link under agents/ and in the root *.md files must resolve to a file or
directory in the repository, and the root AGENTS.md and CLAUDE.md, when present, must be symlinks
to agents/AGENTS.md. A path is in the repository when git tracks it or would add it (untracked and
not ignored), so an ignored local file, which CI's checkout lacks, never counts. A symlink counts
only when the path it leads to exists and is in the repository too, and a symlinked page is read
at that path; a link through a symlinked directory fails, since git lists the symlink and not the
files it leads to. A link starting with `/` resolves from the repository root, as GitHub renders
it. Anchors are not checked.

Each page is split into Markdown's blocks (paragraphs, list items, block quotes, headings), and
links are read within a block. Links in fenced code blocks and code spans are skipped. An indented
code block reads as prose, line by line, so an example link belongs in a fenced block. Markdown
the check cannot read fails it rather than being skipped: a `](` outside every link it
recognizes, a link with a scheme other than http, https, or mailto, and a code fence that never
closes.

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
TARGET = "file or directory in the repository"
# Links that leave the repository; any other scheme fails the check.
SCHEMES = ("http", "https", "mailto")

# Block structure, matched on a line once its tabs are expanded.
QUOTE_MARKER = re.compile(r"[ \t]*>[ \t]?")
LIST_ITEM = re.compile(r"[ \t]*(?:[-+*]|\d{1,9}[.)])(?:[ \t]+|$)")
# Thematic breaks and setext heading underlines.
BREAK = re.compile(r"[ \t]*(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|=+[ \t]*)$")
HEADING = re.compile(r"[ \t]*#{1,6}(?:[ \t]|$)")
# A backtick fence's info string holds no backtick.
FENCE = re.compile(r"[ \t]*(`{3,}(?!.*`)|~{3,})")
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
    r"^[ \t]*\[(?!\^)(?:[^\[\]\\]|\\.)+\]:[ \t]*\n?[ \t]*(<(?:[^<>\n\\]|\\.)*>|\S+)", re.MULTILINE
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


def indent(text):
    return len(text) - len(text.lstrip(" "))


def unquote_line(line, limit=None):
    """Return the line without its block-quote markers, at most limit of them, and their count."""
    level, end = 0, 0
    while level != limit and (marker := QUOTE_MARKER.match(line, end)):
        level, end = level + 1, marker.end()
    return line[end:], level


def blocks(text):
    """Split a page into the blocks that hold its prose, leaving out fenced code.

    Returns the blocks as (first line number, text without block-quote and list markers), and the
    line of a fence that never closes, or None. Indentation counts from the content column of the
    innermost list item: a fence, heading, or list item opens, and a fence closes, within three
    columns of it. A fence closes on a closing fence at its block-quote depth, or where its block
    quote or list item ends.
    """
    found, lines, start = [], [], 0
    # The open list items' content columns, the block-quote depth, and the open fence as
    # (marker, depth, column, line).
    items, depth, fence = [], 0, None

    def end_block():
        if lines:
            found.append((start, "\n".join(lines)))
            lines.clear()

    for number, line in enumerate(text.expandtabs(4).split("\n"), 1):
        if fence:
            marker, fence_depth, column, _ = fence
            rest, level = unquote_line(line, fence_depth)
            if level == fence_depth and (not rest.strip() or indent(rest) >= column):
                closing = rest.strip()
                if (
                    indent(rest) - column <= 3
                    and len(closing) >= len(marker)
                    and closing == marker[0] * len(closing)
                ):
                    fence = None
                continue
            fence = None  # its block quote or list item ended
        rest, level = unquote_line(line)
        if not rest.strip() or BREAK.match(rest):
            end_block()
            continue
        inside = [column for column in items if indent(rest) >= column]
        shallow = indent(rest) - (inside[-1] if inside else 0) <= 3
        item = LIST_ITEM.match(rest) if shallow else None
        starts = item or shallow and (HEADING.match(rest) or FENCE.match(rest))
        if lines and not starts and level <= depth:
            lines.append(rest)  # a paragraph's next line, however far indented or quoted
            continue
        end_block()
        depth = level
        items, content = inside, rest
        if item:
            items.append(item.end())
            content = rest[item.end() :]
        if shallow and (match := FENCE.match(content)):
            fence = (match.group(1), depth, items[-1] if items else 0, number)
        elif not shallow or HEADING.match(content):
            found.append((number, content))  # a heading, or a line of indented code, read alone
        elif content.strip():
            start = number
            lines.append(content)
    end_block()
    return found, fence[3] if fence else None


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
            end = next(
                (m.end() for m in BACKTICKS.finditer(prose, i + run) if len(m.group()) == run), None
            )
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
    page_blocks, unclosed = blocks(text)
    found = []
    for first, block in page_blocks:
        prose, opens, closes = blank_code_spans(block)
        inline = [match for match in (INLINE_LINK.match(prose, start) for start in opens) if match]

        def line(offset):
            return first + prose.count("\n", 0, offset)

        for match in [*inline, *REFERENCE.finditer(prose)]:
            dest = match.group(1)
            if url(dest).scheme in ("", *SCHEMES):
                found.append((line(match.start(1)), dest, None))
            else:
                problem = f"{dest} is not a web, mail, or relative link"
                found.append((line(match.start(1)), None, problem))
        found += [
            (line(close), None, "a link the check cannot read")
            for close in closes
            if not any(match.start() <= close < match.end() for match in inline)
        ]
    if unclosed:
        found.append((unclosed, None, "a code fence that never closes"))
    return sorted(found, key=lambda item: item[0])


def url(dest):
    """Split a link destination, without its angle brackets and backslash escapes, into a URL."""
    return urlsplit(ESCAPE.sub(r"\1", dest[1:-1] if dest.startswith("<") else dest))


def resolve(source, dest):
    """Return the repository path a relative link points to, or None for a web or mail link."""
    parts = url(dest)
    if parts.scheme or parts.netloc or not parts.path:
        return None
    path = unquote(parts.path)
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
                errors.append(f"{page}:{line}: {dest} does not resolve to a {TARGET}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Checked {checked} relative links in {len(pages)} Markdown files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
