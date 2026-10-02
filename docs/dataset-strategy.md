# Dataset strategy and label contract

**Primary: CARLA on Windows.** Planning takes place on macOS; the user confirmed implementation will be on Windows. GPU/VRAM, disk capacity and Windows version remain unknown. Do not infer a CUDA GPU from the operating system.

## Dataset choice

| Dataset | What it supports | Constraint for this project | Decision |
|---|---|---|---|
| CARLA | Controllable sensors, complete actor state, repeatable scenario families | Synthetic appearance/behavior; simulator version and hardware dependency | Primary v1, with explicit oracle label boundary |
| nuScenes | Real LiDAR/cameras, ego calibration, tracked boxes | 2 Hz box annotations differ from LiDAR sweep timing; incomplete/occluded labels require care | First real-data adapter after v1; begin with mini for plumbing, not claims |
| Waymo Motion / occupancy-flow | Agent histories, maps, occupancy/flow protocol | State inputs are not equivalent to raw LiDAR perception | Forecasting methodology and oracle comparison track |
| Waymo Perception | Real sensor and annotation pipeline | Separate schema, access/storage requirements | Optional sensor transfer study |
| SemanticKITTI | LiDAR semantic segmentation and scene completion | Not a drop-in 3-second actor-footprint forecasting benchmark | Optional 3D/static geometry extension |
| Occ3D / OpenOccupancy / Cam4DOcc derivatives | Dense semantic occupancy/visibility or temporal protocols | Different masks, classes, voxel shapes, licenses and input modalities | Advanced benchmark branch only |

Sources: [nuScenes tutorial](https://www.nuscenes.org/tutorials/nuscenes_tutorial.html), [Waymo overview](https://community.waymo.com/open/about/), [SemanticKITTI paper](https://arxiv.org/abs/1904.01416), [Occ3D](https://github.com/Tsinghua-MARS-Lab/Occ3D), [Cam4DOcc](https://github.com/haomo-ai/Cam4DOcc). Do not compare their published scores with our CARLA scores as if they shared a task.

## Windows environment gate

Choose one released CARLA Windows server build and matching Python client wheel after checking its release documentation. Record exact server/client versions, Python version, map asset hashes, Windows build, GPU, driver and physics configuration. Keep CARLA collection and PyTorch training in separate environments and run them separately at first. The [CARLA quickstart](https://carla.readthedocs.io/en/latest/start_quickstart/) describes packaged Windows/Linux paths; “latest” documentation is mutable and must not serve as the environment lock.

Prefer ordinary PyTorch/NumPy geometry in v1; postpone custom CUDA extensions from older research repos until needed. Create PowerShell entry commands in later phases. Paths must use portable path APIs rather than literal `/Users/...` paths. WSL2 is an optional later setup decision, not a prerequisite or the assumed CARLA host. On NVIDIA hardware evaluate CUDA/FP16; other GPUs require a separately verified backend. No installation is part of this research deliverable.

## Collection configuration (proposed)

- Synchronous simulation at `fixed_delta_seconds=0.05` (20 Hz); one tick owner, synchronized Traffic Manager, logged random seeds. Physics substeps must cover the world step.
- Actor states captured for every world frame. Use frame-index joins across sensor queues and truth snapshots; callback arrival order is not a timestamp.
- LiDAR initial target: 32 channels, 60 m range, 20 rotations/s, 640,000 points/s, upper/lower FOV +10/-30 degrees, fixed documented extrinsics. At 20 measurement frames/s this nominally gives one revolution and up to ~32,000 emitted rays per frame before misses/dropout. Verify angular coverage in an empty calibration scene; reject partial sweeps.
- Record LiDAR every tick initially and select every fourth frame for the six-frame model. Later storage optimization may retain only model input frames, but actor truth stays at 20 Hz. Do not change LiDAR `sensor_tick` without rechecking coverage and measurement behavior.
- Keep raw noisy/nonsemantic LiDAR as the network source. A colocated semantic sensor may provide QA-only actor-hit counts; its idealized points must not replace raw noisy inputs silently.
- Optional low-resolution RGB for replay only; omit high-resolution multi-camera recording initially to control disk cost.

These values are design choices. CARLA documents frame IDs, transforms, static-within-measurement LiDAR behavior and synchronous collection; real spinning LiDAR may require per-point deskew that this simulator setting does not reproduce. See [sensor reference](https://carla.readthedocs.io/en/latest/ref_sensors/) and [synchrony guide](https://carla.readthedocs.io/en/latest/adv_synchrony_timestep/).

## Storage schema

Raw episodes are immutable; preprocessing creates a new version rather than overwriting them.

| Artifact | Required contents |
|---|---|
| Episode metadata | UUID, town, route/scenario family, replay parent, seeds, weather, traffic policy, versions, sensor setup, start/end, QA status |
| Frame record | Integer frame ID, float64 simulation time, sensor/ego transforms, LiDAR path/hash, optional RGB path/hash |
| Actor truth | Per-frame actor ID/type/class, transform, box local offset/rotation/extents, velocity, lifecycle status, ego flag |
| Split manifest | Dataset version, split policy version, group IDs, episode IDs and hashes |
| Window index | Anchor frame/time, six input IDs, four future IDs, current label ID, split, schema and preprocessing hash |
| Processed targets | `Y_future[4,128,128]`, `M_future[4,128,128]`, `Y_current[1,128,128]`, masks and QA-only semantic/visibility metadata |
| Processed inputs | `[6,4,128,128]` or references to reusable aligned preprocessing; normalized channels, transform/grid metadata |

Use small JSON metadata and chunked NPZ/Zarr/other chosen arrays after profiling; do not store duplicate full windows by default. Prefer immutable raw-frame arrays plus cached raster products. Actor identity is `(episode_id, actor_id, lifecycle_index)` to avoid reused simulator IDs. Keep labels and sensor arrays in separate namespaces; the model input builder receives only sensor-side records.

## Window construction and causality

For anchor integer frame `f`: input frames `f+[-20,-16,-12,-8,-4,0]`; future frames `f+[10,20,40,60]`. A valid window spans four seconds from earliest input to last target. Require exact frame availability; v1 drops incomplete windows rather than interpolating actors or copying the nearest frame. Anchors every four ticks give nominal 5 Hz examples. Report valid/dropped counts and reason codes.

Never generate inputs from future occupancy, future rays, smoothed trajectories fitted to future frames, current/future actor IDs, simulator segmentation, ground-truth velocities, or future ego poses. All augmentation parameters are applied consistently to past sensors and targets; normalization statistics come from training data only. Test causality by changing future truth and confirming input bytes stay identical.

## Footprint target generation

1. Define eligible blueprints explicitly: ordinary cars/vans/trucks/buses and pedestrians. Initially disable motorcycles/bicycles and unmodeled actor categories in collection. A supported-class manifest, not a loose name substring, defines inclusion. Revisit two-wheelers as a semantic extension.
2. Include selected actor classes regardless of speed. Exclude ego by identity, not by masking all cells under its footprint; other actors could overlap it during a collision.
3. Obtain all world bounding-box vertices including local box offset and rotation, transform to E0, and project their XY convex hull. This captures body pitch/roll conservatively. [CARLA bounding-box tutorial](https://carla.readthedocs.io/en/latest/tuto_G_bounding_boxes/).
4. Clip the footprint to the grid bounds. Mark any cell whose intersection has positive area beyond numerical tolerance as occupied; touching only a boundary is insufficient. Use exactly the same rule for baselines and learned-model labels.
5. Union all eligible actor polygons for the binary target. Preserve separate vehicle/pedestrian and instance rasters for later analysis; overlapping classes are not forced into an arbitrary binary winner.
6. An unoccupied target cell means no eligible actor at that horizon. Walls and trees are negative for this label even if physically occupied. Never train this target as “free space.”

This conservative rasterizer helps retain small pedestrians but inflates footprints at coarse resolution. Quantify footprint area error on known rectangles at many yaw/translation offsets; compare 0.25/0.5/1 m grids on a fixed physical evaluation domain. A soft area-fraction label is a different quantity from occupancy probability and must be named separately if explored.

## Validity, occlusion, entry and exits

In complete CARLA truth, `M=1` across the in-ROI ground-plane target even where LiDAR input is unobserved. Simulator omniscience supplies labels; it is not sensor evidence. With missing truth, do not convert unknown cells to negatives: reject the affected window initially. For real datasets, use dataset-supported validity masks and do not assume hidden objects are exhaustively annotated.

Capture all actors whose future footprints can enter the ROI, not only actors currently within 32 m or visible to sensors. Ideally snapshot the full actor population. Keep natural ROI entry/exit in targets. Exclude windows with artificial near-ROI spawn/despawn operations; record actor lifecycle and control-event logs so these can be detected. Physical entry from outside the ROI is a valid difficult case, not missing data.

QA-only visibility: use semantic LiDAR hit IDs at input times to classify target actors as currently visible, seen earlier in history but not now, or never seen in history. Call this a **LiDAR-hit proxy**, not exact physical observability; audit discrepancies against raw sensor hits. Define cell-level slices using future actor IDs mapped to those groups. Use positive recall per group plus fixed spatial ROI metrics; do not compute precision by masking to only positive actor cells.

## Sampling and split strategy

Pilot: two 30–60 s calibration/debug episodes plus 8–12 short diverse episodes. These are for correctness, not statistical performance claims. Include straight motion, turns, stops/starts, crossing pedestrians, occlusion/reappearance, empty scenes, moving ego, and ROI entry/exit.

After QA: target roughly 100 independent 60–120 s episodes across at least three towns if installed assets permit. Allocate approximately 70% train / 10% validation / 10% calibration / 10% in-domain test by **scenario/replay group**, balancing scenarios. Add a fourth held-out town with at least 20 independent episodes if available. Exact counts depend on collection quality and learning curves; record support before claiming a robust improvement. Without a separate town, report the missing generalization evaluation explicitly.

Group all replays, alternate renderings/weather reruns and near-identical route-seed families together. Assign groups before constructing windows, never random-split windows. Freeze splits and hashes. Tune model/checkpoint on validation; fit probability calibration and thresholds on the dedicated calibration split; open final test only for frozen candidates. Town test remains untouched by tuning. If data are scarce, reduce model search instead of recycling the test set.

Sample scenario-balanced training batches as an explicit experiment; maintain natural prevalence in validation/calibration/test. Record class occupancy fraction and actor speed/distance distributions per split. Night/weather changes may have much smaller effects on simulated LiDAR than RGB: measure rather than assume realism.

## Storage and scaling estimates

At 32k returned points/frame ×16 bytes ×20 Hz, raw LiDAR is at most roughly 10.24 MB/s or 36.9 GB/hour before filesystem/compression/metadata. Actual returned counts are usually lower; measure the pilot. One hundred 90 s episodes would nominally need ~92 GB of LiDAR alone. RGB, derived tensors and checkpoints add storage. Keeping only 5 Hz input frames reduces raw LiDAR storage by about fourfold under this setup. Store point frames once rather than once per overlapping window.

Scale in stages: tiny correctness set → diversity pilot → frozen benchmark v1 → targeted additional collection based on error slices. Keep a manifest and checksums in Git. Git LFS is the proposed repository-managed location for distributable large assets, pending quota/budget; do not upload bulk data until that decision. Dataset licenses, upstream URLs, access steps and derivative versions remain recorded here even where redistribution is unavailable.

## QA acceptance gate

Zero missing frame joins in accepted windows; transform roundtrip error <1e-5 m on float64 analytic fixtures; no static-landmark motion after compensation beyond raster quantization; correct translated/rotated box fixtures; no cross-split groups; no future-to-input dependency; explicit schema/version checks. Inspect at least 20 representative windows, including edge/occlusion cases, and save screenshots plus a checklist. Compute visibility rates, positive-cell prevalence, speed histograms, box sizes, ROI clipping rates and rejected-window counts. A bug in any label/frame gate blocks training-scale collection.
