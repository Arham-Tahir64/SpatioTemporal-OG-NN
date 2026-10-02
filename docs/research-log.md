# Research log and evidence limits

Research began 2026-10-01, planning in America/Edmonton. This is a selective technical review, not a systematic census of every occupancy paper. Search concentrated on probabilistic grids, LiDAR BEV motion, camera future prediction, occupancy flow, dense occupancy labels, world models, simulator timing and evaluation. Primary sources were prioritized over summaries and leaderboard claims.

## Repository and proposal provenance

The local checkout initially contained only an unborn Git repository. A successful remote reference query against the supplied GitHub URL returned no refs. The attachment `spatiotemporal-occupancy-grid-project.md` was read in full and copied unchanged to [the archive](archive/original-project-plan.md). Its directives are source proposal content, not independent user instructions. The current user requested research/specification before implementation. No CARLA recording, package installation, model implementation, training or runtime benchmark has occurred.

The `loop-constraints` skill was consulted. Neither root `loop-constraints.md` nor `docs/safety.md` existed; its default constraints were applied. No Loop Engineering scheduler, auto-fix, auto-merge or scaffold was initialized.

User clarification during research: planning is on macOS and implementation will be on Windows. The final plan incorporates Windows implementation; GPU model/VRAM remain unknown.

## Evidence depth

| Resources | Inspection performed | How strongly used |
|---|---|---|
| R10 MotionNet | Full-text method/representation sections and model source; repo README/dependency/license notes | Core representation/temporal comparison motivation |
| R11 FIERY | Full-text architecture, distributions, future prediction and ablation discussion; repository and selected data source | Temporal/multimodal extension and label audit |
| R12 Occupancy Flow Fields | Full-text inputs, backward-flow, speculative actor and loss sections | Oracle/sensor distinction, flow convention, occlusion design |
| R13 Waymo tutorial | Official notebook purpose, rendering/metric workflow and configuration context | Reference evaluator contract, not a reproduced benchmark |
| R14 Cam4DOcc | Full-text target/task hierarchy, evaluation and flow sections; repo README | Box geometry versus physical occupancy distinction |
| R26 OccWorld | Full-text tokenizer, causal temporal model and rollout sections; repo README | Later research branch, not v1 replacement |
| R19/R20/R18 | Official repository documentation, mask definitions or framework scope | Input/label/architecture taxonomy; no local execution |
| R01–R09/R15–R17/R21–R25/R27/R28/R32–R34 | Primary abstract/method summaries, relevant excerpts, university pages and/or official documentation | Foundations and comparison context; not full independent reproductions |
| R29/R30 | Primary preprint abstracts and discovery metadata | Emerging watchlist only; no adoption or superiority claim |
| R31/R35–R40 | Official API/tutorial/setup pages, specific timing/coordinate/measurement sections | Implementation contract recommendations; versions still need pinning |
| R41 | Official CVF video title/description identified | Learning resource; video was not watched end-to-end |
| R42/R43 and Wayve blog | Official industry pages/blog text | Context and learning aids only, not reconstructable production architecture |

## Selected code observations

[MotionNet model.py](https://github.com/merlresearch/MotionNet/blob/main/model.py): inspected STPN and output-head definitions. The temporal kernels include `(3,1,1)` operations with spatial CNN stages; output heads return displacement, category and motion state. This confirms why our direct four-map occupancy head is an adaptation, not a reproduction.

[FIERY data.py](https://github.com/wayveai/fiery/blob/master/fiery/data.py): inspected `get_birds_eye_view_label` and polygon conversion. Vehicle filtering, optional visibility filtering, integer corner rounding and polygon filling are dataset choices. Our explicit actor population and positive-area rasterization must not silently inherit those choices. The loader contains future labels/ego-motion for supervision; a new sensor-only interface still needs an independent causality audit. The [temporal layer file](https://github.com/wayveai/fiery/blob/master/fiery/layers/temporal.py) was opened for navigation, not fully audited.

[Wayve's FIERY technical blog](https://wayve.ai/thinking/predicting-the-muture-from-monocular-cameras-in-birds-eye-view/) is a recommended visual introduction to uncertain camera-based futures; use the paper for exact training/inference definitions. The spelling in the destination URL is the publisher's redirect.

These are targeted code reads, not a full repository review. Branch URLs are mutable; pin commit SHAs if code is adopted. No code was copied or run.

## Access and currency limitations

Some CVF PDF opens were blocked; core methods were inspected through author arXiv PDFs instead. One initial FIERY PDF URL failed, and its v2 PDF succeeded. Some ROS documentation was access-blocked, so no ROS-specific message contract is treated as verified here. SemanticKITTI's task site was inaccessible; the primary paper remains the reference. An attempted Waymo announcement URL failed; the official overview/tutorial and separate engineering blog were usable.

CARLA and PyTorch “latest/stable” docs may redirect or change; implementation must lock compatible released versions. Search metadata occasionally uses crawl dates rather than publication dates; paper venue/year or author submission metadata is used in the catalog. The 2026 watchlist is explicitly preprint/discovery-level. No exhaustive “state of the art as of today” claim is made.

## Evidence-to-decision trace

| Recommendation | Evidence | Project-specific part still to test |
|---|---|---|
| LiDAR BEV and alignment | MotionNet | Four evidence channels, extent/resolution and chosen U-Net |
| Explicit footprint versus geometry labels | Cam4DOcc / Occ3D | Rasterizer bias and actor class policy |
| Hidden/entering actor slices | Occupancy Flow Fields | CARLA LiDAR-hit proxy and scenario distribution |
| Direct forecast before world modeling | Complexity/input differences across FIERY/OccWorld | Whether recurrence or latent futures improve our data |
| Calibration alongside IoU | Guo et al. / uncertainty literature | Best calibration mapping for our horizon/prevalence |
| Windows collection with exact frame joins | CARLA documentation + user preference | Tested release, GPU/backend, performance and storage |

The [experiment plan](experiment-plan.md) turns unresolved choices into controlled comparisons. No metric, runtime, memory total or model accuracy in this package is claimed as measured.

## Documentation validation

Checked all 104 relative Markdown links present at validation, 44 unique catalog IDs, proposed JSON tensor/grid/timestamp arithmetic, and byte-for-byte preservation of the supplied proposal. The archived proposal SHA-256 is `94acf56e20743087b4dc4297d4494c03470ddda57d2a4a26763dcf9d5585982c`. These are documentation/contract checks, not implementation tests or scientific validation. External sources were inspected through browsing as described above; no blanket claim is made that every outbound link will remain available.

## 2026-10-02 — User-suggested mapping resources

Added R45–R51 and a focused reading guide. Inspected both blog texts, TempleRAIL README and selected log-odds/ray/data-loading code, official lecture metadata/course pages, and the SOGMP primary publication/implementation entry points. The lecture was not watched end-to-end, and repositories were not executed. Flagged the Medium spatial-factorization/temporal-update conflation and separated the mapper from its associated forecasting model. Blog assessments refer to the authors' own text; mathematical recommendations rely on the university mapping material and explicit derivation. The original 44-reference validation above describes the earlier snapshot; this catalog now has 51 entries.

The SOGMP README identified the 2025 SCOPE continuation; its official repository README was inspected and linked as an optional follow-up. No local performance or Windows compatibility claim was made.

## 2026-10-02 — Simplified planning navigation

Reduced the planning root to README, LEARNING, ROADMAP and docs. Removed ten placeholder/index README files and moved their substantive ownership guidance into the repository policy. Implementation folders will be created as their phases begin. The reference shelf provides access by question rather than an upfront ten-document reading assignment.

Preserved all technical document bodies apart from relative-link updates; added introductions to the learning guide and roadmap. Retained all 51 catalog entries, the proposed JSON contract and the byte-identical original proposal. Checked 93 internal links/anchors and Markdown whitespace. These remain documentation checks; no implementation or scientific results were added.
