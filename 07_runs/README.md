# 07_runs — Course Run Outputs

Each course processed generates a subfolder named `XXXXXXX_name/`.

## Structure per course

```
XXXXXXX_name/
├── input/
│   ├── source.html              ← HTML MASTER (source language, full course)
│   └── srt/
│       ├── video_01.srt
│       └── video_02.srt
├── output/
│   ├── translated.html          ← HTML revised (target language)
│   ├── decision_log.xlsx        ← Full comparative table of all choices
│   └── srt/
│       ├── video_01_[lang].srt
│       └── video_02_[lang].srt
└── temp_glossary_XXXXXXX.csv   ← Course-level glossary patch (merged into domain CSVs after validation)
```

## Hierarchy rule
The HTML MASTER is always translated FIRST.
All SRT and other assets for the same course MUST align with the `decision_log.xlsx` produced during HTML PEMT.
The decision_log is the authority — no terminology deviation allowed in downstream assets.

## Run ID format
`XXXXXXX_name` where XXXXXXX is the 7-digit OpenClassrooms course ID.
