# Repository structure and source-of-truth policy

The project root is the canonical home for authored code, specs, notes, data definitions, experiments and results. Current directories contain documentation only. The tree below is the **intended implementation layout**, not a claim these modules already exist.

```text
SpatioTemporal-OG-NN/
  README.md
  docs/
    project-specification.md
    architecture.md
    dataset-strategy.md
    evaluation-strategy.md
    implementation-roadmap.md
    repository-structure.md
    open-questions.md
    decisions/                    # numbered ADRs
    archive/original-project-plan.md
    environment-windows.md        # create after environment validation
    demo.md                       # create with working demo
  research/
    prerequisites.md
    literature-review.md
    references.md                 # stable resource IDs and reading priorities
    research-log.md                # inspected evidence and limits
  src/stognn/                     # one importable package; create in implementation
    data/                         # schemas, recorder, windows, labels, loaders
    geometry/                     # frames, grid, ground, rays, rasterization
    models/                       # encoders, fusion, heads
    baselines/                    # persistence, tracking, constant velocity
    training/                     # engine, losses, checkpointing
    evaluation/                   # metrics, slices, calibration, bootstrap
    visualization/                # BEV panels and replay
    deployment/                   # inference, buffering, export, adapters
  configs/
    data/ models/ training/ evaluation/ deployment/
  datasets/
    README.md
    manifests/ splits/            # small versioned definitions and hashes
    fixtures/                     # tiny redistributable test cases
    raw/ processed/               # bulk data; versioned via LFS/manifest policy
  models/
    cards/ manifests/             # metadata and evaluation links
    checkpoints/                  # large artifacts, not Python model source
  experiments/
    experiment-plan.md
    run-card-template.md
    E03/<run-id>/                  # resolved config, notes, metrics, figures
  training/                       # operating recipes; implementation stays in src
  evaluation/
    reports/                      # final benchmark tables and failure galleries
  visualization/
    examples/                     # curated small renders/demo manifests
  scripts/                        # thin Windows PowerShell / Python entrypoints
  tests/                          # meaningful invariant/integration tests
  pyproject.toml                  # add with code, not a fake working package now
  environment*.lock              # generate from tested environments later
```

## Avoid duplicate ownership

Top-level `models/` holds cards and artifacts; `src/stognn/models/` holds code. Likewise top-level training/evaluation/visualization directories hold recipes/reports/examples, with reusable logic under `src/stognn/`. Notebooks can explore results but must call tested modules and link their source data; they cannot be the only copy of label generation or metrics. Configs are immutable per run and expanded defaults are saved.

## Artifact tiers

1. **Ordinary Git:** authored Markdown, source, configs, small JSON/CSV metrics, ADRs, split/manifest files and small synthetic fixtures. Prefer reviewable text. Every research source has a stable catalog ID and link.
2. **Git LFS proposal for distributable binary assets:** raw/processed arrays, trained checkpoints and long demos at the repository paths above. Before collecting benchmark-scale data, choose a storage quota/retention budget and configure explicit patterns. No LFS setup or bulk upload has been performed here.
3. **Licensed external datasets:** retain canonical download/access instructions, source release identity, local relative paths and cryptographic hashes in this repository. Where redistribution is prohibited or impractical, a manifest is the source-of-truth record; copying unlicensed raw files into Git is not required. An external object store may be considered only as a documented backing store, never an untracked alternate project location.

No dataset or checkpoint may be the only unversioned copy on a workstation. Manifests must say whether an artifact is local-only, uploaded, reproducible from raw, or externally restricted. Raw episodes are immutable. Processed caches may be regenerated but their version/hash must be recorded. Retain the raw data and manifests needed for published results before deleting any cache.

## Naming and provenance

Episode ID: unique UUID plus human-readable town/scenario tag. Window ID: episode ID + anchor frame + preprocessing version. Run ID: experiment ID + UTC start stamp + short config hash + seed. A run records source commit, optional dirty patch hash, dataset/label/split/config hashes, environment, hardware and checkpoint hash. Use relative paths in manifests; Windows drive letters and machine-specific macOS paths never enter portable configs.

Each dataset version gets a data card: collection purpose, simulator/sensor settings, label definition, class map, scenario distribution, train/test grouping, QA, limitations and license. Each model card references training data/config, inputs/outputs, calibration, measured metrics/hardware and known failure modes. Do not publish a model card with unmeasured claims.

## Decision process

Number architecture decision records; include problem, evidence, alternatives, selected default, tradeoffs and revisit trigger. A change in target meaning, reference frame, rasterizer, split or mask requires a contract version change and rerunning baselines. Documentation disagreements are resolved by the ownership table in the project specification, not by whichever notebook is newest.

## Git and collaboration

Use small topical commits and `codex/` branches for future changes. Preserve experiment failures and dated conclusions. Do not commit credentials, environment secrets, simulator binaries or copied third-party code without provenance. Bulk data/checkpoints are ignored by ordinary Git until an explicit storage mechanism is selected. A future implementation should add meaningful geometry, causality, split and metric checks before CI training jobs; research documentation alone does not need a neural-network test suite.
