export const links = {
  "source": "./docs/examples/workshop-example/records.html#r5-replacement-material-rule",
  "requirement": "./docs/examples/workshop-example/requirements.html#requirements-matrix",
  "assignment": "./docs/examples/workshop-example/change-case.html#bounded-implementation-brief",
  "workshop": "./docs/examples/workshop-example/workshop.html#exercise",
  "worksheet": "./docs/examples/workshop-example/worksheet.html#w1-material-and-source",
  "cases": "./docs/examples/workshop-example/model-handover.html#training-source",
  "review": "./docs/examples/workshop-example/change-case.html#verification-and-acceptance",
  "decision": "./docs/examples/workshop-example/records.html#r6-pending-human-choice"
};

export const nodes = {
  "research": {
    "title": "Research",
    "type": "AI Operator in Session A",
    "role": "Interpret sources and maintain research requirements.",
    "assignment": "Apply the replacement material rule to RQ-06 and prepare bounded assignments.",
    "knowledge": "R1 and R5, the requirement matrix, and the open format choice H-01.",
    "writes": "During the initial assignment, requirements.md only. After scoped owner authorization, record the decision and evidence in project knowledge. Preserve superseded sources as history.",
    "next": "Send bounded briefs to the two Operations contexts.",
    "setup": "Define the research question, maintained knowledge and decisions reserved for the project owner.",
    "sources": [
      [
        "Replacement source R5",
        "./docs/examples/workshop-example/records.html#r5-replacement-material-rule"
      ],
      [
        "Requirement RQ-06",
        "./docs/examples/workshop-example/requirements.html#requirements-matrix"
      ]
    ]
  },
  "workshop": {
    "title": "Workshop Operations",
    "type": "AI Operator in Session B",
    "role": "Prepare the workshop exercise and facilitator briefing.",
    "assignment": "Replace invitations to bring original excerpts with the supplied fictional cases.",
    "knowledge": "R5, RQ-06, retained requirements and both agenda variants.",
    "writes": "workshop.md only. Keep source records and requirements read-only.",
    "next": "Submit changed passages and checks to Verification; send Research a result notice.",
    "setup": "Give this operator a bounded artifact assignment and a write area that does not overlap another operator.",
    "sources": [
      [
        "Workshop exercise",
        "./docs/examples/workshop-example/workshop.html#exercise"
      ],
      [
        "Implementation brief",
        "./docs/examples/workshop-example/change-case.html#bounded-implementation-brief"
      ]
    ]
  },
  "materials": {
    "title": "Materials Operations",
    "type": "AI Operator in Session C",
    "role": "Prepare the worksheet and fictional training materials.",
    "assignment": "Use wholly fictional cases while retaining source references and open classification questions.",
    "knowledge": "R5, RQ-01–RQ-08 and the training-source specification.",
    "writes": "worksheet.md and model-handover.md only.",
    "next": "Submit artifacts with source references and performed checks to Verification.",
    "setup": "Separate responsibilities by actual files; add a parallel operator only when the work can be divided usefully.",
    "sources": [
      [
        "Worksheet",
        "./docs/examples/workshop-example/worksheet.html#w1-material-and-source"
      ],
      [
        "Training cases",
        "./docs/examples/workshop-example/model-handover.html#training-source"
      ]
    ]
  },
  "verification": {
    "title": "Verification",
    "type": "AI Operator in Session D",
    "role": "Assess the submitted result in a separate, read-only context.",
    "assignment": "Compare material instructions with R5 and check the retained requirements.",
    "knowledge": "The full submitted result, source revision and explicit assessment criteria.",
    "writes": "A verification finding in its own reporting location. No changes to evaluated artifacts.",
    "next": "Return the complete initial finding first to the project owner, who decides further routing.",
    "setup": "Verify context separation, read-only target access and the actual return route. A producer callback is insufficient.",
    "sources": [
      [
        "Assessment criteria",
        "./docs/examples/workshop-example/change-case.html#verification-and-acceptance"
      ],
      [
        "Review instruction R3",
        "./docs/examples/workshop-example/records.html#r3-review-instruction"
      ]
    ]
  },
  "knowledge": {
    "title": "Project Knowledge",
    "type": "Maintained across sessions",
    "role": "Keep sources, requirements, decisions and artifacts addressable.",
    "assignment": "Connect R5 to RQ-06 and the dependent workshop materials.",
    "knowledge": "Source wording, interpreted requirements, artifact revisions and unresolved choices remain distinguishable.",
    "writes": "One authorized writer per maintained object. Reading a document grants no write authority.",
    "next": "Subsequent sessions read the relevant current records and their supporting evidence.",
    "setup": "Start with a project knowledge folder. Add an external vault only with explicit selection and write-back boundaries.",
    "sources": [
      [
        "Source pack",
        "./docs/examples/workshop-example/README.html"
      ],
      [
        "Change record",
        "./docs/examples/workshop-example/change-case.html"
      ]
    ]
  },
  "owner": {
    "title": "Review and decisions",
    "type": "Project owner",
    "role": "Exercise reserved judgment and determine how findings enter further work.",
    "assignment": "Assess the complete verification finding and decide acceptance and further routing.",
    "knowledge": "The submitted artifacts, criteria, evidence and verification limits.",
    "writes": "Record the decision; authorize the appropriate responsible writer to apply its consequences.",
    "next": "Material approval and the open workshop-format choice are separate decisions.",
    "setup": "Name the decisions reserved for the project owner in each assignment and provide direct inspection paths.",
    "sources": [
      [
        "Acceptance boundary",
        "./docs/examples/workshop-example/change-case.html#verification-and-acceptance"
      ],
      [
        "Open choice H-01",
        "./docs/examples/workshop-example/records.html#r6-pending-human-choice"
      ]
    ]
  },
  "instructions": {
    "title": "Operator Knowledge",
    "type": "Working instructions",
    "role": "Define how an operator works within its responsibility and authority.",
    "assignment": "Provide role, remit, working principles and applicable procedures to each session.",
    "knowledge": "Kept distinct from subject-matter Project Knowledge and from the technical instruction channel.",
    "writes": "Maintained instructions do not confer additional tool permissions.",
    "next": "A new session receives the relevant instructions and reconstructs the current project state.",
    "setup": "Use a complete role contract, then adapt its project-specific remit and permissions.",
    "sources": [
      [
        "Role contracts",
        "./docs/orchestrators/README.html"
      ],
      [
        "Architecture",
        "./docs/knowledge/orchestration-architecture.html"
      ]
    ]
  }
};

export const passages = {
  "baseline": "Paste your anonymized project excerpt and record its original location.",
  "corrected": "Use only Case U or Case C, revision training-v2. Original project content is prohibited, including anonymized, redacted and paraphrased excerpts.",
  "exerciseBefore": "Bring an anonymized excerpt from your project and use it as the source for your handover.",
  "exerciseAfter": "Use only Case U or Case C, revision training-v2, supplied in the training source.",
  "rule": "Original project material is prohibited throughout the workshop, including anonymized, redacted, paraphrased or otherwise transformed excerpts. Use only wholly fictional training material authored for the workshop."
};

export const steps = [
  {
    "id": "baseline",
    "title": "Inspect the original material",
    "revision": "baseline-v1",
    "summary": "The historical workshop allowed anonymized excerpts. The worksheet reflects that earlier permission.",
    "activity": [
      "Maintaining requirements",
      "Prepared historical plan",
      "Prepared historical worksheet",
      "No review submitted"
    ],
    "artifact": "worksheet",
    "worksheet": "baseline",
    "workshop": "baseline",
    "requirement": "historical",
    "message": {
      "from": "Historical source R1",
      "to": "Research",
      "artifact": "records.md",
      "body": "Participants may use anonymized excerpts. This is the earlier rule, superseded when R5 is applied.",
      "evidence": "R1 and the authored before passages",
      "href": "./docs/examples/workshop-example/change-case.html#wording-changes"
    }
  },
  {
    "id": "rule",
    "title": "A replacement rule arrives",
    "revision": "baseline-v1, R5 pending",
    "summary": "R5 prohibits every original excerpt. Apply the replacement to begin the revision branch.",
    "gate": "Apply source change in this illustration",
    "activity": [
      "Replacement source received",
      "Awaiting assignment",
      "Awaiting assignment",
      "Awaiting result"
    ],
    "artifact": "source",
    "worksheet": "baseline",
    "workshop": "baseline",
    "requirement": "historical",
    "message": {
      "from": "Fictional workshop sponsor",
      "to": "Research",
      "artifact": "records.md, R5",
      "body": "Original project material is prohibited throughout the workshop, including anonymized, redacted, paraphrased or otherwise transformed excerpts. Use only wholly fictional training material authored for the workshop.",
      "evidence": "R5 supersedes R1’s material permission",
      "href": "./docs/examples/workshop-example/records.html#r5-replacement-material-rule"
    }
  },
  {
    "id": "requirement",
    "title": "Research updates the requirement",
    "revision": "R5 applied, artifacts pending",
    "summary": "Research changes RQ-06 and prepares bounded assignments. The old worksheet now conflicts with the current rule.",
    "activity": [
      "Revising RQ-06",
      "Receiving workshop brief",
      "Receiving materials brief",
      "Awaiting result"
    ],
    "artifact": "requirement",
    "worksheet": "baseline",
    "workshop": "baseline",
    "requirement": "current",
    "message": {
      "from": "Research",
      "to": "Workshop Operations and Materials Operations",
      "artifact": "Implementation briefs",
      "body": "Apply R5 and RQ-06. Workshop Operations owns workshop.md. Materials Operations owns worksheet.md and model-handover.md. Preserve H-01 and the retained requirements.",
      "evidence": "Bounded brief, with a didactic split into disjoint write areas",
      "href": "./docs/examples/workshop-example/change-case.html#bounded-implementation-brief"
    }
  },
  {
    "id": "parallel",
    "title": "Two assignments run in parallel",
    "revision": "Intermediate teaching revision",
    "summary": "Workshop Operations revises the exercise and briefing. Materials Operations prepares fictional cases but leaves the worksheet instruction unchanged in this added failure scenario.",
    "activity": [
      "Tracking dependencies",
      "Revising exercise and briefing",
      "Preparing cases; worksheet instruction missed",
      "Awaiting submission"
    ],
    "artifact": "workshop",
    "worksheet": "baseline",
    "workshop": "current",
    "requirement": "current",
    "message": {
      "from": "Workshop Operations and Materials Operations",
      "to": "Verification",
      "artifact": "workshop.md, worksheet.md, model-handover.md",
      "body": "Producer claim in this authored submission. Material instructions updated to use fictional cases. The workshop and case files were prepared and their locations checked. A complete instruction-by-instruction check was not performed. Research receives a result notice. The worksheet passage shown alongside this claim supplies contrary evidence.",
      "evidence": "Deliberately incorrect completion claim in an added fictional submission. Submission is unverified; the published artifacts already contain correct wording.",
      "href": "./docs/examples/workshop-example/change-case.html#verification-and-acceptance"
    }
  },
  {
    "id": "submission",
    "title": "Operations submits its claimed completion",
    "revision": "Intermediate teaching revision, submitted",
    "summary": "Verification receives the complete intermediate result. Research receives a notice. The claimed update can now be compared with the still-outdated worksheet passage.",
    "activity": [
      "Result notice received",
      "Workshop submitted",
      "Materials submitted",
      "Reading submitted evidence"
    ],
    "artifact": "worksheet",
    "worksheet": "baseline",
    "workshop": "current",
    "requirement": "current",
    "message": {
      "from": "Workshop Operations and Materials Operations",
      "to": "Verification",
      "artifact": "workshop.md, worksheet.md, model-handover.md",
      "body": "Producer claim in this authored submission. Material instructions updated to use fictional cases. The workshop and case files were prepared and their locations checked. A complete instruction-by-instruction check was not performed. Research receives a result notice. The worksheet passage shown alongside this claim supplies contrary evidence.",
      "evidence": "Deliberately incorrect completion claim in an added fictional submission. Submission is unverified; the published artifacts already contain correct wording.",
      "href": "./docs/examples/workshop-example/change-case.html#verification-and-acceptance"
    }
  },
  {
    "id": "finding",
    "title": "Verification identifies the missed instruction",
    "revision": "Intermediate revision, deviation found",
    "summary": "The reviewer compares the worksheet with R5. The complete finding goes first to the project owner.",
    "activity": [
      "Awaiting routed finding",
      "Prepared workshop",
      "Awaiting review outcome",
      "Finding sent to project owner"
    ],
    "artifact": "worksheet",
    "worksheet": "baseline",
    "workshop": "current",
    "requirement": "current",
    "message": {
      "from": "Verification",
      "to": "Project owner",
      "artifact": "Finding on worksheet.md opening",
      "body": "The worksheet still asks for an anonymized original excerpt. This contradicts R5 and RQ-06. Route a correction to Materials Operations; retain the already revised workshop.",
      "evidence": "The quoted worksheet instruction compared with R5. This finding is an added teaching event.",
      "href": "./docs/examples/workshop-example/change-case.html#verification-and-acceptance"
    }
  },
  {
    "id": "routing",
    "title": "The owner routes a bounded correction",
    "revision": "Correction awaiting owner routing",
    "summary": "The initial finding is with the project owner. Continue by routing only the worksheet correction to Materials Operations.",
    "gate": "Route worksheet correction in this simulation",
    "activity": [
      "Awaiting owner routing",
      "No further change required",
      "Awaiting correction assignment",
      "Read-only finding retained"
    ],
    "artifact": "worksheet",
    "worksheet": "baseline",
    "workshop": "current",
    "requirement": "current",
    "message": {
      "from": "Project owner",
      "to": "Materials Operations",
      "artifact": "Correction assignment for worksheet.md only",
      "body": "Replace the outdated invitation with the fictional-material instruction. Preserve the handover evidence fields. Submit the correction for recheck.",
      "evidence": "Illustrative owner routing of the complete verification finding",
      "href": "./docs/examples/workshop-example/worksheet.html#w1-material-and-source"
    }
  },
  {
    "id": "correction",
    "title": "Materials corrects the worksheet",
    "revision": "restricted-v2, recheck pending",
    "summary": "Materials Operations changes only the worksheet instruction. The source record, requirement and revised workshop remain unchanged.",
    "activity": [
      "Tracking correction",
      "Workshop unchanged",
      "Correcting worksheet.md only",
      "Receiving corrected artifact"
    ],
    "artifact": "worksheet",
    "worksheet": "current",
    "workshop": "current",
    "requirement": "current",
    "message": {
      "from": "Materials Operations",
      "to": "Verification",
      "artifact": "Corrected worksheet.md opening",
      "body": "Use only Case U or Case C, revision training-v2. Original project content is prohibited, including anonymized, redacted and paraphrased excerpts.",
      "evidence": "Corrected wording matches the supplied worksheet, shown here as plain text with links and inline code expanded",
      "href": "./docs/examples/workshop-example/worksheet.html#w1-material-and-source"
    }
  },
  {
    "id": "recheck",
    "title": "Verification rechecks the correction",
    "revision": "restricted-v2, rechecked in illustration",
    "summary": "The separate context rechecks the changed instruction and returns its complete finding to the owner. Acceptance remains a separate decision.",
    "activity": [
      "Awaiting owner decision",
      "Prepared artifact",
      "Correction submitted",
      "Recheck sent to project owner"
    ],
    "artifact": "worksheet",
    "worksheet": "current",
    "workshop": "current",
    "requirement": "current",
    "message": {
      "from": "Verification",
      "to": "Project owner",
      "artifact": "Recheck finding",
      "body": "The corrected instruction requires the supplied fictional cases and prohibits original excerpts. The reviewed correction is consistent with R5. H-01 remains open.",
      "evidence": "Added fictional recheck, limited to the shown correction and sources",
      "href": "./docs/examples/workshop-example/change-case.html#verification-and-acceptance"
    }
  },
  {
    "id": "acceptance",
    "title": "The owner considers material acceptance",
    "revision": "restricted-v2, acceptance pending",
    "summary": "This teaching decision concerns the revised material. It does not settle H-01 or authorize workshop delivery in the real world.",
    "gate": "Simulate material acceptance",
    "activity": [
      "Awaiting authorization",
      "Prepared artifact",
      "Prepared artifact",
      "Finding available to owner"
    ],
    "artifact": "worksheet",
    "worksheet": "current",
    "workshop": "current",
    "requirement": "current",
    "message": {
      "from": "Project owner",
      "to": "Research",
      "artifact": "Illustrative material acceptance",
      "body": "Accept the revised material for this teaching scenario and record the decision with its evidence. Keep the workshop-format decision and final printing pending.",
      "evidence": "Additional fictional acceptance, absent from the original source pack",
      "href": "./docs/examples/workshop-example/README.html"
    }
  },
  {
    "id": "writeback",
    "title": "Research records the decision and evidence",
    "revision": "Illustrative decision recorded",
    "summary": "Research records the accepted material revision and its source and finding references. The walkthrough can now be rewound. No project file has been changed.",
    "activity": [
      "Recording decision and evidence",
      "Prepared workshop retained",
      "Corrected materials retained",
      "Findings retained"
    ],
    "artifact": "decision",
    "worksheet": "current",
    "workshop": "current",
    "requirement": "current",
    "message": {
      "from": "Research",
      "to": "Maintained project knowledge",
      "artifact": "Illustrative decision record",
      "body": "Material revision accepted in the simulation. Grounds: R5, RQ-06, submitted correction and recheck. H-01 remains open; final printing and case-sheet allocation wait.",
      "evidence": "Illustrative authorized write-back; no real acceptance or run occurred",
      "href": "./docs/examples/workshop-example/change-case.html#propagation-and-ownership"
    }
  },
  {
    "id": "resume",
    "title": "A new session resumes from the record",
    "revision": "restricted-v2, reconstructed from records",
    "summary": "A new Research session reads the recorded revision, findings and decision. It can prepare the next bounded task while final printing remains dependent on H-01.",
    "activity": [
      "New session reads recorded state",
      "Prepared workshop retained",
      "Corrected materials retained",
      "Finding scope retained"
    ],
    "artifact": "decision",
    "worksheet": "current",
    "workshop": "current",
    "requirement": "current",
    "message": {
      "from": "Maintained project knowledge",
      "to": "New Research session",
      "artifact": "Recorded revision, findings and unresolved H-01",
      "body": "Resume with corrected restricted-v2 materials and the scoped illustrative acceptance. Prepare the next task from the recorded evidence. Do not allocate final case sheets or print until the owner chooses the format.",
      "evidence": "Additional fictional resumption. The session reconstructs documented state, not the earlier context window.",
      "href": "./docs/examples/workshop-example/process-walkthrough.html"
    }
  }
];
