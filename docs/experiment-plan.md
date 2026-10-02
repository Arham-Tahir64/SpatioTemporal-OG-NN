# Experiment and ablation plan

No runs have been executed. IDs below are pre-registered comparisons; expected outcomes are hypotheses. Use the fixed [evaluation protocol](evaluation-strategy.md) and [dataset contract](dataset-strategy.md).

## Common controls

Keep dataset/split/label hashes, ROI, horizon semantics, evaluator, augmentation, optimizer and update budget fixed unless that factor is the question. Primary screening budget: one seed and at most 50 epochs with the stated early stopping; final candidates repeat three seeds. Log actual optimizer steps, parameter count, peak memory, training time and input volume. Report both roughly parameter-matched and equal-runtime comparisons when architectures have different computational costs. Do not claim an isolated architecture gain after changing its data or loss too.

Use a modest validation screening matrix, not the full Cartesian product. Start with core correctness/temporal hypotheses. Add a branch only if its failure analysis provides a reason. Rerun the frozen baseline whenever changing the dataset version.

## Ordered matrix

| ID | Hypothesis and variants | Controls / special measurement | Decision informed |
|---|---|---|---|
| E00 | Analytic geometry and label cases | Known static wall, translating/rotating rectangle, box offset, boundary, high ray, missing frame | Correctness gate; no training until pass |
| E01 | Empty/prevalence/raw-hit/learned persistence vs sensor CV vs oracle persistence/CV | Same target; label privileged inputs prominently | Whether forecasting adds value beyond simple motion |
| E02 | Current-time single-frame model can learn the target | 8–16 windows, augmentation off; shuffled-label debugging control | Input/target/optimization sanity |
| E03 | History helps: current-only vs six repeats of current vs six ordered frames | Same 24-channel stack interface for repeated-frame control; additionally train compact 4-channel model | Information benefit versus parameter count |
| E04 | Ego compensation matters: correct alignment vs none | Evaluate high/low ego motion separately; missing alignment is a diagnostic negative control | Detect motion shortcut or incorrect transforms |
| E05 | Window length: T=1,3,6,11 at 0.2 s spacing | 0/0.4/1/2 s span; restrict all runs to anchors valid for longest span | Context benefit versus data/compute cost |
| E06 | Temporal sample density: 3,6,11 samples over the same 1 s | 0.5/0.2/0.1 s spacing; data frame rate supports all | Frequency versus history-duration effects |
| E07 | Fusion: stack vs shared encoder+temporal convolution vs ConvGRU | Same heads, loss and anchor set; report parameters and latency | Main architecture decision |
| E08 | ConvLSTM versus GRU versus bottleneck temporal attention | After E07; comparable widths/budgets and reset behavior | Whether added memory/attention complexity pays |
| E09 | BEV resolution: 1/0.5/0.25 m | Same 64 m extent; report native scores AND rerasterize/evaluate all at common 0.5 m protocol | Accuracy/aliasing/runtime tradeoff |
| E10 | Extent: 64 m square vs wider forward-biased context | Common inner target ROI and additional outer-domain report | Whether context/outside entrants limit forecasts |
| E11 | Horizons: short-only 0.5/1 s vs all four; direct multihead vs rollout | Compare common horizons; fixed 3 s target for long-horizon claim | Joint-horizon interference and rollout drift |
| E12 | Loss: BCE vs positive-weight BCE (2,4) vs focal (gamma 2) vs BCE+Dice | Same selected data; val-tuned loss coefficient, raw and calibrated scores | Imbalance benefit versus probability quality |
| E13 | Input evidence: density+height vs add hit vs add ray evidence | Rebuild schema/version, preserve dataset anchors; evaluate occlusion/range | Whether ray evidence justifies preprocessing cost |
| E14 | Auxiliary current loss: lambda=0 vs 0.25; later 0.5 if needed | Identical forecast backbone and optimizer steps | Shared perception benefit |
| E15 | Union head vs separate vehicle/pedestrian heads | Same actor population; report union metric plus per-class outputs | Small-actor performance and semantic utility |
| E16 | Occupancy-only vs occupancy+backward flow | Identical targets; defined valid rigid correspondences, Smooth L1 scale | Whether explicit motion improves forecasts |
| E17 | Static/dynamic design: actor-only plus measured obstacle layer vs learned separate static layer | Obtain independently valid static labels; report actor and static metrics separately | Cost of general obstacle representation |
| E18 | Hand-engineered BEV versus learned pillar encoder | Same raw points, fixed temporal method | Whether vertical/point detail is bottleneck |
| E19 | LiDAR vs camera vs LiDAR+camera | New camera data contract; same scenes, temporal window and target domain; oracle depth labeled | Whether modality gain justifies complexity |
| E20 | Pose perturbation, dropped frames, sparse beams, range/dropout changes | Controlled severity curves; no truth inputs; missing-frame policy explicit | Robustness and model limitations |
| E21 | Raw versus temperature/affine calibration; later 3-model ensemble | Calibration set only; include extra inference cost | Probability quality and epistemic disagreement |
| E22 | Town/scenario holdout; optional real-data adaptation | Frozen test protocols and matched label definitions | Generalization rather than memorization |
| E23 | FP32 vs FP16/export; INT8 only after parity | Same checkpoint/data; Windows hardware; calibration and latency together | Deployable model selection |
| E24 | World-model/latent-future extension | Separate proposal and label contract; fixed sample count and coherent-future metrics | Research branch, not required v1 ablation |

## Important protocol details

E09: coarse predictions cannot be compared to fine labels by casual nearest-neighbor resampling. For common 0.5 m evaluation, regenerate ground truth from polygons. If converting prediction probabilities across grids, predefine aggregation (e.g. area-weighted mean as a score resampling convention) and state that it does not preserve the original “any actor intersects cell” probability. Report common-grid ranking as a diagnostic alongside native metrics, not as an exact calibrated probability comparison. An alternative is to train each resolution with a fixed final 0.5 m output head; prefer this for the main resolution ablation.

E10: changing extent changes both visible context and class prevalence. Keep the same scored target region to isolate context gains. E11: direct output predicts all horizons in one pass; autoregressive rollout needs an intermediate target cadence and must be scored for accumulated error. Do not silently interpolate labels at unsupported times.

E13: “unknown” is input evidence status, not a forecast class. E17: absence of an actor is not a static obstacle label. E19: camera-only and fusion runs require their own calibration/visibility QA before comparing scores.

## Metrics recorded for every run

Per-horizon IoU@0.5, precision/recall/F1, AP, Brier, NLL; tuned-threshold metrics; raw/calibrated reliability and support; class/motion/visibility recall; scenario and distance metrics; paired group confidence intervals; parameters, updates, wall training time, peak memory; batch-1 p50/p95/p99 network and pipeline latency; input age; false positives in empty scenes; qualitative failures. Optional heads add flow EPE or semantic mIoU without replacing occupancy metrics.

## Result card and promotion

Use [run-card-template.md](run-card-template.md). Record failed runs with failure reason; do not leave holes in the experiment sequence. Promote a change only after the acceptance rule in the evaluation strategy, plus complexity/latency analysis. If improvements are smaller than seed or group variation, mark inconclusive. Freeze the final candidate/config before test; do not use the final test to decide E03–E24.

## Initial research budget recommendation

First execute E00–E04. Then E05/E07/E13/E14 as small validation screens. Confirm only the best two temporal candidates across three seeds. Defer attention, cameras and world models unless a specific observed limitation remains. Learning curves at 10/25/50/100% of training episodes determine whether additional collection is more valuable than a bigger model. These screens are a priority order, not authorization to launch compute now.
