# SpatioTemporal-OG-NN

Predict where vehicles and pedestrians will be over the next three seconds using the last second of LiDAR observations in CARLA.

**Current stage: learning and planning on Mac. Implementation will happen on Windows.** The research and proposed design are documented; no data has been collected and no model has been trained. Numerical settings are proposals, not measured results.

**[Open Occupancy lab](visualizer/index.html)** — an editable scene, sensor/BEV views, tensor explorer, training sandbox and guided walkthrough. Open `visualizer/index.html` directly in a browser; keep the folder together. [Controls and run instructions](visualizer/README.md). Examples are synthetic; saved model artifacts can be imported.

## Start here

1. **[LEARNING.md](LEARNING.md)** — what to read/watch next, in order. Start here now.
2. **[ROADMAP.md](ROADMAP.md)** — the steps from foundations to a working model, with a completion checklist for each phase.

You do not need to read every document before starting. Use the **[technical reference shelf](docs/README.md)** when a phase calls for a particular detail.

## The first version

Six aligned LiDAR frames → a top-down grid → a small U-Net → vehicle/pedestrian occupancy probabilities at 0.5, 1, 2 and 3 seconds into the future.

The proposed grid covers 64 × 64 m at 0.5 m per cell. Stopped actors count too. An empty output cell means **no selected actor**, not guaranteed free space. Cameras, flow heads, attention and 3D world models are later experiments.

## What to do now

Follow the reading order in [LEARNING.md](LEARNING.md). Finish its short readiness checklist, then work through Phase 0 in [ROADMAP.md](ROADMAP.md). Windows setup and geometry validation come before data collection or training.

## Where things live

```text
README.md       Overview and next action
LEARNING.md     Reading/watch order
ROADMAP.md      Phases and completion criteria
visualizer/     Interactive playground (open index.html in a browser)
docs/           Detailed specifications, research and references
```

This repository remains the single source of truth. Code and data folders will be created when their phase begins, rather than left empty now. Large datasets/checkpoints must have versioned manifests or an agreed storage mechanism; see the [repository policy](docs/repository-structure.md).

When architecture, data contracts, metrics or phase status change, update `visualizer/` in the same change. Keep its embedded contract consistent with the specification and distinguish proposed settings, implemented behavior and measured results.
