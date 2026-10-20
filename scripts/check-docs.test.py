#!/usr/bin/env python3
"""Tests for check-docs.py: each case builds a git repository and runs the check in it."""

import os
import subprocess
import sys
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "check-docs.py")
# Keeps the machine's git configuration, such as a global excludes file, out of the runs.
ENV = {**os.environ, "GIT_CONFIG_GLOBAL": os.devnull, "GIT_CONFIG_NOSYSTEM": "1"}
INDEX_LINKS = {"AGENTS.md": "agents/AGENTS.md", "CLAUDE.md": "agents/AGENTS.md"}

INDEX = """# Index

[rule](rules/a.md), [anchor](#index), [section](rules/a.md#rule), [folder](rules/),
[wrapped
text](rules/a.md), ![logo](logo.svg "Logo"), [web](https://example.com), [mail](mailto:a@b.c),
[spaced](<rules/b c.md>), [encoded](rules/b%20c.md), [up](../README.md), [root](../),
[`code`](rules/a.md), [rooted](/missing.md).

[label]: rules/a.md
[^note]: A footnote, not a link.

`[span](missing.md)` and ``[double `span`](missing.md)``

```[triple](missing.md)``` opens no fence, so [this](rules/a.md) counts.

A stray ` backtick ends with its paragraph.

[after](rules/a.md) and a later ` backtick.

```sh
[fenced](missing.md)
```

~~~
[tilde](missing.md)
~~~

````md
```sh
[nested](missing.md)
```
````
"""

# Fourteen relative links in four pages. The ignored and the out-of-scope pages are not read.
VALID = {
    ".gitignore": "/agents/.processes/\n",
    "LICENSE": "",
    "README.md": "[index](agents/AGENTS.md)\n",
    "agents/AGENTS.md": INDEX,
    "agents/logo.svg": "",
    "agents/rules/a.md": "# Rule\n",
    "agents/rules/b c.md": "",
    "agents/.processes/review.md": "[broken](missing.md)\n",
    "docs/guide.md": "[broken](missing.md)\n",
}


def broken(where, dest):
    return f"{where}: {dest} does not resolve to a file in the repository"


FAILURES = {
    "missing file": (
        {"agents/AGENTS.md": "# Index\n\n[rule](rules/none.md)\n"},
        {},
        [broken("agents/AGENTS.md:3", "rules/none.md")],
    ),
    "wrapped link text": (
        {"agents/AGENTS.md": "[wrapped\ntext](none.md)\n"},
        {},
        [broken("agents/AGENTS.md:2", "none.md")],
    ),
    "reference definition": (
        {"agents/AGENTS.md": "[label]: rules/none.md\n"},
        {},
        [broken("agents/AGENTS.md:1", "rules/none.md")],
    ),
    "outside the repository": (
        {"agents/AGENTS.md": "[up](../../outside.md)\n"},
        {},
        [broken("agents/AGENTS.md:1", "../../outside.md")],
    ),
    "ignored file": (
        {
            ".gitignore": "/agents/.processes/\n",
            "agents/.processes/review.md": "",
            "agents/AGENTS.md": "[review](.processes/review.md)\n",
        },
        {},
        [broken("agents/AGENTS.md:1", ".processes/review.md")],
    ),
    "wrong case": (
        {"agents/AGENTS.md": "[rule](rules/a.md)\n", "agents/rules/A.md": ""},
        {},
        [broken("agents/AGENTS.md:1", "rules/a.md")],
    ),
    "root page": (
        {"README.md": "[docs](docs.md)\n"},
        {},
        [broken("README.md:1", "docs.md")],
    ),
    "index name as a regular file": (
        {"AGENTS.md": "# Index\n", "agents/AGENTS.md": "# Index\n"},
        {"CLAUDE.md": "agents/AGENTS.md"},
        ["AGENTS.md: must be a symlink to agents/AGENTS.md"],
    ),
    "index link to another page": (
        {"README.md": "", "agents/AGENTS.md": "# Index\n"},
        {"AGENTS.md": "agents/AGENTS.md", "CLAUDE.md": "README.md"},
        ["CLAUDE.md: must be a symlink to agents/AGENTS.md"],
    ),
    "index link without the index": (
        {"LICENSE": ""},
        {"AGENTS.md": "agents/AGENTS.md"},
        ["AGENTS.md: must be a symlink to agents/AGENTS.md"],
    ),
    "every failure listed": (
        {
            "README.md": "[a](a.md)\n",
            "agents/AGENTS.md": "[b](b.md)\n\n[c](c.md)\n",
        },
        {"AGENTS.md": "agents/AGENTS.md", "CLAUDE.md": "README.md"},
        [
            "CLAUDE.md: must be a symlink to agents/AGENTS.md",
            broken("README.md:1", "a.md"),
            broken("agents/AGENTS.md:1", "b.md"),
            broken("agents/AGENTS.md:3", "c.md"),
        ],
    ),
}


def run_check(files, symlinks):
    with tempfile.TemporaryDirectory() as root:
        subprocess.run(["git", "init", "-q", root], check=True, capture_output=True, env=ENV)
        for path, text in files.items():
            os.makedirs(os.path.join(root, os.path.dirname(path)), exist_ok=True)
            with open(os.path.join(root, path), "w", encoding="utf-8") as page:
                page.write(text)
        for path, target in symlinks.items():
            os.symlink(target, os.path.join(root, path))
        return subprocess.run(
            [sys.executable, SCRIPT], cwd=root, env=ENV, capture_output=True, text=True
        )


class CheckDocsTest(unittest.TestCase):
    def test_passes_without_agent_docs(self):
        result = run_check({"LICENSE": ""}, {})
        self.assertEqual(
            (result.returncode, result.stdout, result.stderr),
            (0, "Checked 0 relative links in 0 Markdown files.\n", ""),
        )

    def test_checks_every_relative_link_outside_code(self):
        result = run_check(VALID, INDEX_LINKS)
        self.assertEqual(
            (result.returncode, result.stdout, result.stderr),
            (0, "Checked 14 relative links in 4 Markdown files.\n", ""),
        )

    def test_lists_every_failure(self):
        for name, (files, symlinks, errors) in FAILURES.items():
            with self.subTest(name):
                result = run_check(files, symlinks)
                self.assertEqual(
                    (result.returncode, result.stdout, result.stderr),
                    (1, "", "".join(f"{error}\n" for error in errors)),
                )


if __name__ == "__main__":
    unittest.main()
