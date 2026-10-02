# Prerequisite learning roadmap

Use this as a sequence of skills to demonstrate, not a reading checklist. Depth levels: **D1 explain** concepts/tradeoffs; **D2 derive/use** the relevant math and diagnose results; **D3 implement/verify** a minimal version and its invariants. You do not need to master all of robotics before Phase 1.

Every R-number links to the [reference catalog](references.md), which contains primary links, focus areas and priorities. “Required” below refers to when a skill is needed.

For a focused starting sequence using the suggested blogs, Chebrolu lecture and TempleRAIL code, follow the [occupancy-mapping reading order](occupancy-mapping-reading-order.md).

## Minimum path to the first dataset

| Prerequisite | What it is / why it matters | Required depth and concepts | Learning resource / concrete exit exercise |
|---|---|---|---|
| Linear algebra and geometry | Coordinates and poses must represent the same physical point across time | D3: vectors, matrix multiplication, inverses, dot/cross products, rotations, homogeneous coordinates, SE(2)/SE(3), quaternions at API boundaries | [R03](references.md): transform a point through sensor→world→reference and invert; rotate 90° and translate by known distances |
| Coordinate conventions | Handedness, units and tensor axes determine label orientation | D3: active/passive transformations, row/column vectors, meters/radians, CARLA y-right versus internal y-left, box-local offsets | [R03/R38/R39](references.md): overlay asymmetric landmarks and offset actor boxes; prove no mirror or 90° rotation error |
| Probability and estimation | Occupancy is a random event conditioned on incomplete evidence | D2: Bernoulli, conditional probability, Bayes rule, likelihood versus posterior, independence assumptions, expectation, entropy | [R01/R02](references.md): explain why a cell's probability does not give a crossing-event probability |
| Occupancy grids / inverse sensor models | Convert ranges into evidence about occupied/free/unknown space | D3: binary Bayes update, log odds, priors, clamping, ray traversal, range/no-return handling | [R01/R02/R04](references.md): implement a tiny analytic ray example; cells behind a hit stay unknown |
| BEV discretization | Metric 3D information is reduced to a 2D raster | D3: floor indexing, half-open bounds, clipping, cell centers, aliasing, height pooling | [R10/R16](references.md): place points at every boundary and verify cells; quantify a small footprint's area error |
| LiDAR representation | Irregular xyz/intensity samples encode observed surfaces, not solid objects | D3: polar sampling, channels, scan rate, sparsity, occlusion, ground estimation, pillars/voxels/range images | [R38/R10/R16](references.md): compare raw points, height map and hit map for one scene |
| Synchronization and timestamps | A correct geometric transform at the wrong time still yields wrong motion | D3: simulation versus wall time, frame joins, queues, fixed steps, clock drift and jitter | [R37/R38](references.md): pair every accepted sample by frame ID; deliberately delay callbacks and detect missing frames |
| Ego-motion compensation | Remove apparent motion induced by the observing vehicle | D3: pose composition, fixed reference frames, translation/rotation, timestamp interpolation, scan deskew distinction | [R03/R10](references.md): stationary wall stays stationary while a moving actor retains displacement |
| Ground and visibility geometry | Road returns and overhead rays can corrupt obstacle/free-space evidence | D3: plane fitting/RANSAC, local ground surfaces, height intervals, segment/cell traversal | [R02/R38](references.md): ground return, elevated beam and low obstacle fixtures; never clear a column from one high ray |
| Dataset generation and labels | Simulator truth must define a stable learning target without entering inputs | D3: polygon projection, box inflation, actor identity/lifecycle, occlusion, validity masks | [R39/R14/R19](references.md): hand-check labels at all four future times; modify future truth and verify inputs unchanged |
| Windows/Python engineering | Collection, preprocessing and training must be portable and recoverable | D3: environments, dependency pinning, path APIs, binary array schemas, checksums, tests, PowerShell commands | [R40/R31/R35](references.md): document a tested Windows version matrix and reload a small immutable episode |

## Before training the baseline

| Prerequisite | What it is / why it matters | Required depth and concepts | Learning resource / exit exercise |
|---|---|---|---|
| Differentiation and optimization | Learning adjusts spatial filters to reduce a defined objective | D2 math / D3 use: chain rule, gradients, minibatches, SGD/AdamW, learning rate, regularization, initialization | [R06](references.md): overfit 8–16 windows, inspect gradients and compare shuffled-label control |
| CNNs and dense prediction | Spatial filters infer footprints from sparse geometric evidence | D3: convolution, padding/stride, receptive field, skip connections, normalization, upsampling | [R06/R07](references.md): calculate each tensor shape and show localization loss from downsampling |
| Loss design and imbalance | Mostly empty scenes make trivial predictions attractive | D2/D3: logits BCE, weighting, focal, Dice/IoU surrogates, masks and reduction denominators | [R31/R32](references.md): derive weighted-BCE optimum, test all-empty/no-valid batches, ensure invalid cells have zero gradient |
| Evaluation and uncertainty | Probabilities and overlap require different evidence | D3: confusion counts, PR curves, proper scores, Brier/NLL, calibration, threshold selection | [R33/R34](references.md): all-empty predictor appears accurate but has zero occupied recall; draw reliability plots |
| Experimental design | Apparent improvement may be leakage, seed noise or extra compute | D3: grouped splits, paired comparisons, cluster bootstrap, matched budgets, test isolation | [evaluation protocol](../docs/evaluation-strategy.md): identify why random overlapping-window split is invalid; create reproducible run card |
| Classical tracking and kinematics | Gives a baseline that tests learned motion rather than perception alone | D2/D3: CV state transition, Kalman filtering, nearest/gated association, covariance, yaw and rigid transforms | [R02/R05/R12](references.md): two moving clusters with one missed observation; compare sensor and oracle CV |

## Before temporal and dynamic modeling

| Prerequisite | What it is / why it matters | Required depth and concepts | Learning resource / exit exercise |
|---|---|---|---|
| Spatiotemporal grids | Occupancy indexed by both place and time; motion becomes changing spatial support | D3: histories/horizons, temporal sampling, fixed versus moving frames, causality | [R10/R12/R14](references.md): render a translating rectangle at known horizons without changing frame |
| Temporal sensor fusion | Combine noisy partial observations while preserving motion | D3: early stack, feature fusion, temporal convolutions, late fusion, warping, timestamp features | [R10/R11](references.md): compare repeated-current, ordered history and shuffled history |
| Recurrent spatial architectures | Hidden maps retain evidence through time/occlusion | D3 for chosen GRU; D2 LSTM: gates, hidden/cell states, BPTT, initialization, truncated history, reset rules | [R08/R11](references.md): moving-square sequence with occlusion; ensure state resets between episodes |
| Dynamic-object behavior | Motion is not always straight-line extrapolation | D2: acceleration, constant-turn-rate models, stop/start, interaction, visibility, class priors | [R12/R14](references.md): classify CV failure cases into perception, maneuver, occlusion and entry errors |
| Flow / scene flow | Correspondence relates material points or grid support across time | D2 initially, D3 if adding head: 3D scene flow, 2D projected flow, forward/backward warp, disocclusion, rigidity | [R15/R12](references.md): warp a rotating box both ways and explain where correspondences are undefined |
| Multitask supervision | Auxiliary motion/semantics may improve shared features or compete with occupancy | D2/D3: masked losses, loss-scale balance, gradient interference, task-specific heads | [R10/R14](references.md): compare occupancy-only with current auxiliary head, then flow; retain failed experiments |

## Later specialties; learn only when the phase needs them

| Prerequisite | What it is / why it matters | Depth and techniques | Learning resource / exit exercise |
|---|---|---|---|
| Camera geometry and BEV | Images offer appearance cues but lack directly observed metric depth | D2 then D3: intrinsics/extrinsics, pinhole projection, frustums, depth distributions, inverse perspective limitations, lift/splat | [R17/R18](references.md): project known LiDAR points into camera and BEV; handle behind-camera points |
| Transformers / temporal attention | Query relevant history/context rather than fixed local filtering | D2 then D3: Q/K/V, softmax scaling, positional/time encodings, masks, deformable/local attention, memory complexity | [R09/R18](references.md): count tokens and memory; implement only bottleneck temporal attention first |
| Sensor fusion and radar | Different modalities resolve different failure cases | D1 then D2: early/intermediate/late fusion, time/extrinsic alignment, modality dropout, Doppler radial velocity ambiguity | [R25/R38](references.md): explain why radar radial speed is not full planar velocity; define a causal fusion contract |
| 3D occupancy / completion | Vertical volume avoids overpass and overhang collapse | D2: dense/sparse voxels, semantic labels, visibility masks, sparse convolutions, tri-plane alternatives | [R19/R20/R22/R24](references.md): distinguish full occupancy, unknown voxels and projected footprints |
| Aleatoric/epistemic uncertainty | Uncertain future behavior and uncertain model knowledge differ | D2: calibration, ensembles, distribution shift, conditional latent variables, coverage versus diversity | [R33/R34/R11](references.md): distinguish several plausible turning futures from random pixel noise |
| World models | Learn scene evolution, potentially conditional on ego actions | D1 initially; D3 only on separate branch: VQ tokenization, autoregression, latent state, causal attention, rollout drift | [R26/R27/R29](references.md): separate input-perception, reconstruction and rollout errors |
| Real-time deployment | Runtime includes data age, preprocessing and memory transfers | D3: profiling, batching versus latency, mixed precision, export, queues, pinned memory, numerical parity | [R35/R36](references.md): report batch-1 p95 wall time and prediction age on Windows |
| Robotics/planning interface | Converts grids into time-aligned costs for an ego footprint | D2: coordinate/time metadata, footprint convolution, swept volumes, unknown-space policy, expected cost versus collision probability | [architecture planning interface](../docs/architecture.md): score a fixed trajectory while accounting for footprint and horizon gaps |
| Domain shift and reproducibility | Simulator success may not transfer to real sensing/behavior | D2/D3: stratified evaluation, sensor noise, calibration shift, dataset versioning, frozen adapters | [R21/R28](references.md): compare label timing and sensor distributions before interpreting transfer failure |

## Mathematical checkpoints

For a static cell, let `l_t = log(p_t/(1-p_t))`. Under the usual conditional-independence/static-map assumptions, `l_t = l_(t-1) + logit(p(m|z_t,x_t)) - logit(p_prior)`. This is a classical evidence update, not the temporal neural forecast objective. Repeated correlated rays violate the independence approximation; never interpret accumulated confidence as perfect certainty.

For constant velocity `c(t+h)=c(t)+h*v(t)` in E0. Changing heading, acceleration and interaction violate this baseline. Ground-truth velocity is privileged even if mathematically simple.

For occupancy score `z`, `p=sigmoid(z)` and unweighted expected Bernoulli cross-entropy is minimized at the true conditional probability in the idealized population setting. Finite data/model error and domain shift still require calibration evaluation.

For resolution `r`, BEV cell count scales as `1/r²`; halving r quadruples raster memory and roughly spatial convolution work at unchanged widths. Dense 3D grids add a vertical factor. Attention over all tokens squares token count. Use these estimates before choosing a richer representation.

## Suggested study sequence

1. Geometry, probability, mapping and timestamps; complete fixtures before collecting benchmark data (roughly 12–20 focused hours if Python/math foundations exist).
2. Data semantics and split discipline while building the pilot (8–16 hours study plus implementation).
3. CNN/loss/metrics during the single-frame baseline (12–20 hours).
4. Temporal fusion and tracking during the first forecast model (8–16 hours).
5. Select one advanced branch based on measured failures; do not study every extension upfront.

These are planning ranges for study, not delivery promises. If an exit exercise is easy, proceed; if it fails, resolve the gap before adding more architecture.
