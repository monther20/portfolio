#!/usr/bin/env python3
"""Generate the public CV from src/data/portfolio.ts (no separate content copy).

Requires Node.js with the project's TypeScript dependency, plus Python ReportLab.
Run: python scripts/generate-cv.py
The output is deterministic: no generation date, random IDs, or remote assets.
"""

from __future__ import annotations

import argparse
import html
from pathlib import Path
import json
import re
import subprocess

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
INK = colors.HexColor("#17252D")
MUTED = colors.HexColor("#52616A")
ACCENT = colors.HexColor("#247C7C")
RULE = colors.HexColor("#D6E1DE")


def source_content(node: str) -> dict:
    """Evaluate the local content module after removing TypeScript syntax."""
    program = """
      import fs from 'node:fs';
      import ts from 'typescript';
      const source = fs.readFileSync('src/data/portfolio.ts', 'utf8');
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
      });
      const data = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
      const { contact, corridor, skills, projects, journeyMilestones } = data;
      process.stdout.write(JSON.stringify({ contact, corridor, skills, projects, journeyMilestones }));
    """
    result = subprocess.run(
        [node, "--input-type=module", "-e", program],
        cwd=ROOT, capture_output=True, text=True, check=True, encoding="utf-8",
    )
    return json.loads(result.stdout)


def plain(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\u2013", "-").replace("\u2014", "-")).strip()


def safe(text: str) -> str:
    return html.escape(plain(text), quote=True)


def link(label: str, target: str) -> str:
    return f'<link href="{html.escape(target, quote=True)}" color="#247C7C">{safe(label)}</link>'


def build(output: Path, content: dict) -> None:
    contact = content["contact"]
    corridor = content["corridor"]
    # The full name is present in the portfolio's contact email.
    name = contact["email"].split("@")[0].replace(".", " ").title()
    styles = {
        "name": ParagraphStyle("Name", fontName="Helvetica-Bold", fontSize=26, leading=30, textColor=INK),
        "role": ParagraphStyle("Role", fontName="Helvetica", fontSize=12, leading=17, textColor=ACCENT),
        "contact": ParagraphStyle("Contact", fontName="Helvetica", fontSize=9, leading=14, textColor=MUTED),
        "section": ParagraphStyle("Section", fontName="Helvetica-Bold", fontSize=10, leading=13, spaceBefore=18, spaceAfter=8, textColor=ACCENT),
        "body": ParagraphStyle("Body", fontName="Helvetica", fontSize=10, leading=14.3, textColor=INK),
        "entry": ParagraphStyle("Entry", fontName="Helvetica-Bold", fontSize=10.6, leading=15, textColor=INK),
        "detail": ParagraphStyle("Detail", fontName="Helvetica", fontSize=9.2, leading=13.5, textColor=MUTED),
        "bullet": ParagraphStyle("Bullet", fontName="Helvetica", fontSize=10, leading=14.3, leftIndent=11, firstLineIndent=-9, spaceBefore=4, textColor=INK),
    }

    def p(text: str, style: str = "body") -> Paragraph:
        return Paragraph(text, styles[style])

    phone_target = "tel:" + re.sub(r"\s", "", contact["phone"])
    story = [
        p(safe(name), "name"),
        p(safe(corridor["tagline"].split("|")[0]), "role"),
        Spacer(1, 10),
        p(f'{safe(contact["location"])} &nbsp; | &nbsp; {link(contact["email"], "mailto:" + contact["email"])} &nbsp; | &nbsp; {link(contact["phone"], phone_target)}', "contact"),
        p(f'{link("Portfolio", contact["portfolio"])} &nbsp; | &nbsp; {link(contact["github"].replace("https://", ""), contact["github"])}', "contact"),
        p("PROFILE", "section"),
        p(safe(" ".join(corridor["stations"][0]["lines"] + corridor["stations"][1]["lines"]))),
        p("EXPERIENCE &amp; SELECTED WORK", "section"),
    ]

    projects = {project["name"]: project for project in content["projects"]}
    for index, milestone in enumerate(reversed(content["journeyMilestones"][1:])):
        project_name, role = milestone["title"].split(" \u00b7 ", 1)
        project = projects[project_name]
        # Employer is taken verbatim from the milestone, where one is supplied.
        employer_match = re.search(r" at ([^.]+)\.$", milestone["text"])
        employer = employer_match.group(1) if employer_match else project_name
        entry = [
            p(f'{safe(role)} <font color="#52616A">| {safe(employer)}</font>', "entry"),
            p(f'{safe(milestone["year"])} &nbsp; / &nbsp; {link(project_name, project["link"])} &nbsp; / &nbsp; {safe(", ".join(project["tech"]))}', "detail"),
        ]
        entry.extend(p(f'- {safe(bullet)}', "bullet") for bullet in project["bullets"])
        story.append(KeepTogether(entry))
        if index == 0:
            story.append(Spacer(1, 13))

    story.extend([
        p("TECHNICAL SKILLS", "section"),
        p(safe(" | ".join(skill["label"] for skill in content["skills"]))),
        p("EDUCATION", "section"),
        p("B.Sc. Computer Science", "entry"),
        p(safe(content["journeyMilestones"][0]["text"].replace("B.Sc. Computer Science in progress at ", "").replace("; expected graduation in ", " | Expected graduation: ")), "body"),
    ])

    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(output), pagesize=A4, rightMargin=46, leftMargin=46,
        topMargin=44, bottomMargin=43, title=f"{name} - CV",
        author=name, subject="Software Developer | Web and mobile applications",
        pageCompression=1, invariant=1,
    )

    def page_details(canvas, _doc):
        canvas.saveState()
        canvas.setStrokeColor(ACCENT)
        canvas.setLineWidth(2)
        canvas.line(46, A4[1] - 31, 90, A4[1] - 31)
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.6)
        canvas.line(46, 35, A4[0] - 46, 35)
        canvas.restoreState()

    doc.build(story, onFirstPage=page_details, onLaterPages=page_details)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--node", default="node", help="Node.js executable (default: node)")
    parser.add_argument("--output", type=Path, default=ROOT / "public/Monther-Abdelrazek-CV.pdf")
    args = parser.parse_args()
    build(args.output, source_content(args.node))
    print(f"Created {args.output} ({args.output.stat().st_size:,} bytes)")
