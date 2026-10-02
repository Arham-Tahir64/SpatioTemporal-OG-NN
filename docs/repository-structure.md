# Repository structure and source-of-truth policy

The repository is the canonical home for project knowledge and reproducibility records. During planning it has only three entry documents, an offline visualizer folder and one documentation folder:

```text
README.md       Project overview and next action
LEARNING.md     Ordered resources and readiness exercises
ROADMAP.md      Phases, tasks and completion gates
visualizer/     Editable offline playground; run instructions inside
docs/           Detailed contracts, research, decisions and original proposal
```

The [reference shelf](README.md) indexes the details by the question they answer. Research sources retain stable catalog IDs; new conclusions should connect to a decision or experiment instead of accumulating disconnected notes.

## Grow the repository only when needed

The following are future destinations, not folders to scaffold now. The roadmap names individual modules at the phase where they become useful.

| Create when | Destination and responsibility |
|---|---|
| Phase 0 implementation | `src/stognn/geometry/`, `tests/`, `configs/`: geometry, invariant tests and executable settings; record the tested environment in `docs/environment-windows.md` |
| Phase 1 | `src/stognn/data/` and `src/stognn/visualization/`; `datasets/manifests/`, `splits/`, `fixtures/`, `raw/`, `processed/`: collection, labels, small QA fixtures and tracked data identities |
| Phase 2 | `src/stognn/baselines/`, `src/stognn/evaluation/`, `experiments/<experiment-id>/<run-id>/`: comparisons, resolved settings, metrics and interpretation |
| Phase 3 onward | `src/stognn/models/`, `src/stognn/training/`; `models/cards/`, `manifests/`, `checkpoints/`: model code, training and identified artifacts |
| Evaluation and demo | `src/stognn/deployment/`, `evaluation/reports/`, `visualization/examples/`, `docs/demo.md`: export/inference, benchmark reports, failure galleries and demo instructions |
| As commands become real | `scripts/`: thin Python/Windows PowerShell entrypoints; `pyproject.toml` and environment lock files from tested environments |

Keep input observations separate from privileged supervision. Test frame/raster invariants, timestamps, split isolation, causality, metric fixtures and streaming resets. Visualizations distinguish sensor evidence, forecast probabilities and future ground truth. Model checkpoints identify source/config/data hashes and calibration metadata. Save run metrics in reviewable JSON/CSV with resolved configs and interpretation; planned experiments are not completed results.

The proposed settings in `docs/v1-proposed.json` remain a design contract. Create runnable configs only during implementation. Add config subfolders for data/models/training/evaluation/deployment only as needed. Training recipes may stay in documentation until enough exist to justify a separate folder.

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
