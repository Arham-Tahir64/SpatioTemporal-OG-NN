# Literature review and engineering synthesis

Read with the [curated catalog](references.md). Source-specific notes below complement rather than replace papers. Recommendations are our engineering judgments; performance transfers to this dataset are unproven.

## Distinguish six tasks often called occupancy prediction

1. **Mapping:** update belief about space from noisy range observations, usually assuming static structure. Classical occupancy grids (R01/R02) establish the probabilistic vocabulary.
2. **Dynamic occupancy filtering:** estimate present occupancy and motion using recursive updates (R05). Velocity distributions are useful, but not automatically behavior forecasts.
3. **Present BEV perception:** estimate current objects or semantics in a metric plane (R16–R18).
4. **3D semantic occupancy/completion:** recover vertical geometry, semantics and hidden volume (R19/R20/R22). “Prediction” may mean current reconstruction rather than future forecasting.
5. **Future occupancy/flow:** predict spatial events at future times (R10–R14). Information available at inference varies substantially across benchmarks.
6. **World modeling:** generate coherent future scene states, sometimes conditioned on ego action (R26/R27). This is a larger objective than four independent probability maps.

Our v1 is task 5 with a deliberately limited actor-footprint label. It borrows geometry and evaluation discipline from the others without claiming their outputs.

## Close-read findings

### MotionNet — closest input representation

Its method combines ego-motion alignment, height-discretized BEV and factorized spatial/temporal processing, with category/state/displacement heads. Focus on §3 and the ablations rather than importing reported speed to another machine. Our recommendation is to retain LiDAR BEV and compare lightweight temporal fusion; hand-engineered density/height features and direct future occupancy are project-specific choices. The code is a reference, not the starting dependency tree. [Paper](https://arxiv.org/pdf/2003.06754), [implementation](https://github.com/merlresearch/MotionNet).

### FIERY — alignment and stochastic future structure

The method lifts camera features, aligns historical BEV, and predicts future instance-related quantities. It distinguishes a future-conditioned training distribution from the past-conditioned inference distribution. This is an instructive leakage boundary if we later add conditional latent futures. The ablation discussion makes alignment a high-priority test, but its camera and instance task differs from ours. Start deterministic and add multimodal prediction only after probability evaluation is reliable. [Paper](https://arxiv.org/pdf/2104.10490v2), [code](https://github.com/wayveai/fiery).

### Occupancy Flow Fields — useful output idea, different inputs

The model consumes agent-state, road and traffic-light information. It couples occupancy with backward flow and treats future appearances of previously unseen actors explicitly. Our recommendations are to report sensor and oracle tracks separately, preserve ROI entrants, and define flow direction before implementation. Do not assume a forward-displacement head can use the same warp loss. Flow-based transport alone cannot account for births without source occupancy. [Paper](https://arxiv.org/pdf/2203.03875), [official tutorial](https://github.com/waymo-research/waymo-open-dataset/blob/master/tutorial/tutorial_occupancy_flow.ipynb).

### Cam4DOcc — target semantics matter as much as backbone

Its task hierarchy distinguishes inflated movable-object labels, fine geometry, static objects and free space. This is particularly relevant because the original plan uses boxes. We adopt an explicit box-footprint benchmark first. Extending to general obstacle occupancy requires different labels, not renaming the existing output. The proposed optional rigid backward displacement is deliberately different from its backward centripetal flow. [Paper](https://arxiv.org/pdf/2311.17663), [code](https://github.com/haomo-ai/Cam4DOcc).

### OccWorld — later scene modeling rather than v1 shortcut

The scene tokenizer uses vector quantization; the world model combines spatial aggregation and causal temporal attention and can roll out predicted occupancy/ego states. Our inference: perception quality, tokenizer reconstruction error and rollout error must be isolated before such a system can fairly replace a sensor-to-grid baseline. A future oracle-occupancy-input study would answer a different question from the LiDAR model. [Paper](https://arxiv.org/pdf/2311.16038), [code](https://github.com/wzzheng/OccWorld).

## Architecture families and transfer limits

| Family | Established contribution | What we take | What we defer |
|---|---|---|---|
| Bayesian OGM / DOGMa | Measurement update, occupancy/motion uncertainty | Unknown-space discipline, simple classical baselines | Full particle/RFS machinery |
| Dense 2D CNN / U-Net | Multiscale local features and spatial decoding | Small baseline with inspectable feature geometry | Any claim that segmentation architecture alone solves behavior |
| ConvLSTM / ConvGRU | Gated spatial temporal memory | Fixed-window recurrent ablation | Persistent online state until frame warping works |
| Factorized temporal convolution | Spatial and temporal processing without full 4D attention | Strong low-complexity challenger | Blind reproduction of paper preprocessing |
| Learned pillars | Learned aggregation of irregular LiDAR | Encoder ablation if geometry features limit performance | Large detection framework dependency |
| Lift/splat camera BEV | Metric projection with learned depth | Camera extension path | Multi-camera training in v1 |
| BEV attention | Cross-view and temporal feature querying | Low-resolution attention hypothesis | Full-resolution joint space-time attention |
| Dense semantic 3D grids | Vertical structure and richer targets | New task if overpasses/geometry become necessary | Conflating voxel mIoU with footprint IoU |
| Tokenized/generative world models | Scene-level temporal generation | Investigate correlated future modes and action conditioning | Tokenization/diffusion before baseline evidence |

References and source-specific sections to read: R05, R07–R09, R16–R20 and R26–R27 in the catalog. “Established contribution” means published technique, not proof of suitability for this project.

## Recent directions through the research snapshot

The 2024 surveys (R24/R25) organize representation, fusion, supervision and efficiency tradeoffs. They provide taxonomy, not a single best architecture. Drive-OccWorld (AAAI 2025, R27) is relevant when future ego actions become model inputs. UniOcc (ICCV 2025, R28) is useful for comparing domains and aligning label protocols; its reported simulation/real-data mixing difficulties argue for a measured transfer study.

The 2026 preprints GEM and InterOCF (R29/R30) are watchlist items, inspected at abstract/discovery level only. They suggest continuous-time representations and richer camera interactions as questions for later investigation. No “latest SOTA” or local reproducibility claim is made. This research is selective; it prioritizes methods whose assumptions can be mapped to this project's inputs and labels.

## Implementation adoption assessment

- **MotionNet:** inspect representation, temporal network and data-generation conventions. MERL and original author repositories are related references with potentially different conditions; pin exact code before reuse.
- **FIERY:** inspect geometry utilities, future target generation, training/inference split and qualitative tooling. Use a separate environment if attempting reproduction.
- **Waymo devkit:** useful target/metric examples. Its full task configuration must accompany any reported benchmark score.
- **BEVFormer / OpenOccupancy / Cam4DOcc:** useful modern reference systems but broader framework/CUDA dependencies make them poor initial Windows dependencies. Compatibility has not been tested here.
- **Occ3D:** inspect labels/masks before considering a 3D branch; raw sensor absence does not identify empty voxels.
- **OccWorld:** useful later when the scene-reconstruction stage is itself evaluated.

No external code has been vendored, installed, trained or benchmarked. License/readme inspection is preliminary; record each exact dependency and its terms at adoption.

## Research questions turned into experiments

| Question | Evidence-informed hypothesis | How this project resolves it |
|---|---|---|
| Does history help beyond a current map? | Alignment enables motion cues | Matched single-frame, stacked and repeated-frame controls |
| Does recurrence help six frames? | Gating can retain useful history | ConvGRU versus stack and temporal convolution, same data/budget |
| Is 0.5 m too coarse for pedestrians? | Raster quantization can dominate | Area-error fixtures and fixed-domain resolution ablation |
| Does flow help occupancy? | Explicit motion is a useful auxiliary signal | Joint loss versus occupancy-only, valid correspondence masks |
| Are maps truly probabilistic? | Overlap-optimized losses need calibration checks | NLL/Brier/reliability, held-out calibration |
| Is richer architecture worth it? | More representation capacity adds dependencies | Pareto comparison of accuracy, memory and end-to-end latency |
| Can CARLA results transfer? | Sensor/behavior/label domains differ | Frozen real-data protocol and explicit domain adaptation experiments |

These questions justify experiments; none is presented as already answered by a paper from another benchmark.
