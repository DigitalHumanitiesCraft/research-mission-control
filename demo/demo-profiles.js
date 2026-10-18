window.MISSION_CONTROL_DEMO_PROFILES = {
  "schema": "mission-control-demo-profiles-1",
  "defaultProfile": "project-folder",
  "invariant": {
    "en": "The research question, claims, results, limits, logical source identities and links stay the same. Only source organization changes. This example makes no claim about research effectiveness.",
    "de": "Forschungsfrage, Aussagen, Ergebnisse, Grenzen, logische Quellenidentitäten und Links bleiben gleich. Nur die Quellenablage ändert sich. Das Beispiel behauptet keine Forschungswirkung."
  },
  "profiles": [
    {
      "id": "project-folder",
      "title": {
        "en": "Project folders",
        "de": "Projektordner"
      },
      "description": {
        "en": "Sources are filed with their explicitly linked example project; unassigned roles remain shared.",
        "de": "Quellen liegen beim ausdrücklich zugeordneten Beispielprojekt; nicht zugeordnete Rollen bleiben gemeinsam abgelegt."
      },
      "prefix": "profiles/project-folder/",
      "sources": [
        {
          "id": "demo-guide",
          "title": "Traceable project handovers: records, requirements and workshop materials",
          "revision": "5ea4dd714c5e2e1499bd3145ea2bdfdd584d0dc54d61974cd2fe8cac756b01db",
          "storagePath": "profiles/project-folder/projects/demo-atlas/sources/demo-guide.json"
        },
        {
          "id": "demo-sources/demo-research.md",
          "title": "Fictional profile: Researcher",
          "revision": "7ab2f2742c9e21eb4b77a59b21c73de6a7da41941402704fc58cb7964b711f40",
          "storagePath": "profiles/project-folder/projects/demo-atlas/sources/demo-research.json"
        },
        {
          "id": "demo-sources/demo-curation.md",
          "title": "Fictional profile: Knowledge Curation",
          "revision": "07a07c860089a939871e394671af3c5ead40f7aa2be5b1875e9d09f965604609",
          "storagePath": "profiles/project-folder/projects/demo-exhibit/sources/demo-curation.json"
        },
        {
          "id": "demo-sources/demo-writing.md",
          "title": "Fictional profile: Research Developer",
          "revision": "d6611c83e23a00f497f29d8865f9eae3976fd7d19df9a3750ef4c82b30fdcf71",
          "storagePath": "profiles/project-folder/projects/demo-exhibit/sources/demo-writing.json"
        },
        {
          "id": "demo-sources/demo-teaching.md",
          "title": "Fictional profile: Teaching",
          "revision": "eaec5924b2259869ed35f769e1d304071d9eba65b4126787e0ba15b6c67837d7",
          "storagePath": "profiles/project-folder/projects/shared/sources/demo-teaching.json"
        },
        {
          "id": "demo-sources/demo-observer.md",
          "title": "Fictional profile: Quality Review",
          "revision": "d56a7857c56110aa0bf639e08f6e875d6d6c5496c51a71ae04e49dd41d8380ae",
          "storagePath": "profiles/project-folder/projects/shared/sources/demo-observer.json"
        }
      ]
    },
    {
      "id": "linked-notes",
      "title": {
        "en": "Linked notes",
        "de": "Verknüpfte Notizen"
      },
      "description": {
        "en": "The same sources form a flat note collection with their existing explicit links.",
        "de": "Dieselben Quellen bilden eine flache Notizsammlung mit ihren bestehenden ausdrücklichen Links."
      },
      "prefix": "profiles/linked-notes/",
      "sources": [
        {
          "id": "demo-guide",
          "title": "Traceable project handovers: records, requirements and workshop materials",
          "revision": "5ea4dd714c5e2e1499bd3145ea2bdfdd584d0dc54d61974cd2fe8cac756b01db",
          "storagePath": "profiles/linked-notes/notes/demo-guide.json"
        },
        {
          "id": "demo-sources/demo-research.md",
          "title": "Fictional profile: Researcher",
          "revision": "7ab2f2742c9e21eb4b77a59b21c73de6a7da41941402704fc58cb7964b711f40",
          "storagePath": "profiles/linked-notes/notes/demo-research.json"
        },
        {
          "id": "demo-sources/demo-curation.md",
          "title": "Fictional profile: Knowledge Curation",
          "revision": "07a07c860089a939871e394671af3c5ead40f7aa2be5b1875e9d09f965604609",
          "storagePath": "profiles/linked-notes/notes/demo-curation.json"
        },
        {
          "id": "demo-sources/demo-writing.md",
          "title": "Fictional profile: Research Developer",
          "revision": "d6611c83e23a00f497f29d8865f9eae3976fd7d19df9a3750ef4c82b30fdcf71",
          "storagePath": "profiles/linked-notes/notes/demo-writing.json"
        },
        {
          "id": "demo-sources/demo-teaching.md",
          "title": "Fictional profile: Teaching",
          "revision": "eaec5924b2259869ed35f769e1d304071d9eba65b4126787e0ba15b6c67837d7",
          "storagePath": "profiles/linked-notes/notes/demo-teaching.json"
        },
        {
          "id": "demo-sources/demo-observer.md",
          "title": "Fictional profile: Quality Review",
          "revision": "d56a7857c56110aa0bf639e08f6e875d6d6c5496c51a71ae04e49dd41d8380ae",
          "storagePath": "profiles/linked-notes/notes/demo-observer.json"
        }
      ]
    },
    {
      "id": "shared-sources",
      "title": {
        "en": "Shared sources",
        "de": "Gemeinsame Quellen"
      },
      "description": {
        "en": "The same material is held in a common source collection, separate from project work.",
        "de": "Dasselbe Material liegt in einer gemeinsamen Quellensammlung, getrennt von der Projektarbeit."
      },
      "prefix": "profiles/shared-sources/",
      "sources": [
        {
          "id": "demo-guide",
          "title": "Traceable project handovers: records, requirements and workshop materials",
          "revision": "5ea4dd714c5e2e1499bd3145ea2bdfdd584d0dc54d61974cd2fe8cac756b01db",
          "storagePath": "profiles/shared-sources/sources/shared/demo-guide.json"
        },
        {
          "id": "demo-sources/demo-research.md",
          "title": "Fictional profile: Researcher",
          "revision": "7ab2f2742c9e21eb4b77a59b21c73de6a7da41941402704fc58cb7964b711f40",
          "storagePath": "profiles/shared-sources/sources/operators/demo-research.json"
        },
        {
          "id": "demo-sources/demo-curation.md",
          "title": "Fictional profile: Knowledge Curation",
          "revision": "07a07c860089a939871e394671af3c5ead40f7aa2be5b1875e9d09f965604609",
          "storagePath": "profiles/shared-sources/sources/operators/demo-curation.json"
        },
        {
          "id": "demo-sources/demo-writing.md",
          "title": "Fictional profile: Research Developer",
          "revision": "d6611c83e23a00f497f29d8865f9eae3976fd7d19df9a3750ef4c82b30fdcf71",
          "storagePath": "profiles/shared-sources/sources/operators/demo-writing.json"
        },
        {
          "id": "demo-sources/demo-teaching.md",
          "title": "Fictional profile: Teaching",
          "revision": "eaec5924b2259869ed35f769e1d304071d9eba65b4126787e0ba15b6c67837d7",
          "storagePath": "profiles/shared-sources/sources/operators/demo-teaching.json"
        },
        {
          "id": "demo-sources/demo-observer.md",
          "title": "Fictional profile: Quality Review",
          "revision": "d56a7857c56110aa0bf639e08f6e875d6d6c5496c51a71ae04e49dd41d8380ae",
          "storagePath": "profiles/shared-sources/sources/operators/demo-observer.json"
        }
      ]
    }
  ]
};
