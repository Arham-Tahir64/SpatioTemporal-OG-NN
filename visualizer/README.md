# Occupancy lab

An editable, offline learning sandbox for the proposed spatiotemporal actor-occupancy forecaster. **This application runs a synthetic scene and toy predictors, not the planned neural network.**

## Run locally

Open `visualizer/index.html` directly in a current desktop browser on macOS or Windows. Keep the whole `visualizer/` folder together. No installation, server, build step, internet connection or Python environment is needed. JavaScript must be enabled.

If your browser or editor restricts local files, an optional standard-library server also works:

```sh
# macOS: run from the repository root
python3 -m http.server 8000 --bind 127.0.0.1
```

```powershell
# Windows: run from the repository root
py -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000/visualizer/`. Stop the server with Ctrl+C. Neither method needs frontend dependencies. The older explanatory lessons are retained in `reference.html`, linked from the app.

## A five-minute experiment

1. Select the pedestrian, drag it across the road, then change its velocity. The sensor returns, BEV, target and toy forecast update.
2. Play or scrub the anchor time. Use −0.2/+0.2 to step; rewind returns to −2 s. Horizon animation cycles current/0.5/1/2/3 s independently.
3. Compare aligned/unaligned histories. Turn compensation off and watch ego motion contaminate estimated actor velocity. Change the history length.
4. Switch to the occlusion scenario. The wall hides the pedestrian from LiDAR, while future truth can still contain it. Turn LiDAR off: evidence vanishes; low forecast probability does not prove absence.
5. Click the occupancy grid. Toggle truth, errors, velocity, backward flow or entropy. Adjust the threshold in Training lab; IoU changes while Brier/NLL stay fixed.
6. Open Network explorer. Follow tensor stages, select input time/channel and output horizon, and apply a real toy convolution to an evidence plane. Hidden learned channels are unavailable, not fabricated.
7. Open Training lab. Capture a patch around an interesting inspected cell, or use the default labeled patch. Make a confident mistake and take gradient steps. Mask a cell and confirm its gradient becomes zero.

Guided mode uses Previous/Next to walk through ten stages of the same live system. Explore mode leaves navigation free. Guided steps change relevant display settings/horizons but preserve scene edits. Switching architectures changes an explicitly labeled toy velocity aggregation, not a neural forward pass.

### Controls

- **Scene drag:** move an object at the current time. Numeric positions are its world position at t=0; velocities define linear trajectories.
- **Object selection:** use the dropdown for objects outside the view or for keyboard editing. Vehicles/pedestrians may move; structures stay static. Ego has editable position, velocity and yaw.
- **Pan:** enable Pan mode and drag, or Shift-drag either main canvas. **Zoom:** wheel over the canvas, or use +/− for both views. Fit views resets both. Scene and grid have independent camera controls.
- **Grid inspection:** click, or focus the grid and use arrow keys. Tensor rows increase with +y; screen y is reversed to render +y upward.
- **Undo:** reverses up to 40 scene object/scenario edits. It is not a full history of every visualization setting or playback tick.
- **Layer precedence:** Errors or Entropy replace the probability base; enabling either disables the other. Truth/structures/outlines/vectors overlay the base. Static/actor layers are teaching truth, not inferred segmentation.
- **Training patch:** click or use arrow keys, then change p, target or validity. The patch stays frozen until captured/reset. One or twenty steps updates independent logits.
- **Limits:** 30 objects; history 1–10 frames at 0.2 s intervals; 64 m square at 0.5 or 1 m cells. Default shape settings match v1. Other settings are experiments.

## What is and is not implemented

| Implemented here                                                | Scientific limitation                                                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| First-return 2D ray casting with occlusion                      | No 3D LiDAR, rolling acquisition, realistic noise or ground estimation                                                                    |
| Pose transforms and aligned histories                           | Fixed-yaw linear toy trajectories; the real pipeline uses full 3D sensor poses                                                            |
| Density, assigned height, hit and traversal planes              | Height is synthetic metadata; traversal is not a free-column certificate                                                                  |
| Positive-area rotated-rectangle/cell target intersection        | Actor boxes are approximations to physical geometry                                                                                       |
| Hit-centroid history → toy motion forecast                      | Oracle IDs and box dimensions assist association/footprints; not a fair sensor-only baseline                                              |
| Stack / recurrent-weighted / attention-weighted toy aggregation | No CNN/ConvLSTM/Transformer weights or neural training                                                                                    |
| Proposed U-Net tensor graph and parameter estimates             | Estimates assume bias-free 3×3 convs, affine GN8, parameter-free downsampling and biased heads; implementation choices remain provisional |
| Binary entropy, masked overlap/Brier/NLL metrics                | Entropy is ambiguity, not calibrated model uncertainty; no dataset benchmark or confidence intervals                                      |
| Independent-logit gradient descent                              | Demonstrates gradients, not shared-weight learning or generalization                                                                      |
| Frozen artifact import                                          | No live model adapter, checkpoint loading or experiment service yet                                                                       |

The output class is **selected actor versus no selected actor**. Ground-truth vehicle/pedestrian class is shown only for synthetic labels. There is no predicted semantic head. A true negative can contain a wall: it must not be labeled certified free space. Stopped vehicles remain positive actor targets. Backward flow is an optional truth-correspondence illustration with overlap/out-of-ROI masking, not a v1 model output. RGB is only a drawn frustum and does not affect the predictor.

## Artifact contract

Use **Real-data inspector → Export synthetic snapshot** for a valid example, then replace arrays/provenance from a future evaluation adapter. The importer accepts at most 8 MiB and validates before changing the active display. Imported artifacts lock synthetic controls; Return to simulation restores the previous scene. Threshold and probability/error/entropy inspection remain available. Geometry, sensor features and learned activations are not supplied by this v1 artifact format.

```json
{
  "schema": "occupancy-inspection-v1",
  "kind": "model",
  "provenance": {
    "source": "evaluation run and scene/window identity",
    "model_id": "model version",
    "dataset_id": "dataset/split version",
    "checkpoint_id": "checkpoint SHA-256"
  },
  "grid": {
    "size": 128,
    "resolution": 0.5,
    "extent": [-32, 32],
    "frame": "E0_x_forward_y_left"
  },
  "anchor_time": 12.0,
  "horizon_s": 2.0,
  "probabilities": [0.1],
  "truth": [0],
  "valid": [1]
}
```

The three arrays above are shortened for illustration; **each must contain size² values**, flattened row-major (index = row×size + column). Row is y, column is x. Valid values: probability in [0,1], truth/mask exactly 0 or 1. Nonfinite values are rejected. Accepted grids are 128²/0.5 m or 64²/1 m covering [-32,32)². All labels/probabilities must refer to the same frozen E₀ and horizon. Artifact kind is `synthetic` or `model`; model records require the three identity strings. Provenance is displayed as untrusted text, not HTML, and claims are not independently verified.

Only valid cells are scored. Zero-denominator metrics are null. NLL clamps to [1e-6,1−1e-6]. Per-cell entropy remains inspectable even where labels are invalid. An artifact is one anchor/horizon, not a sequence. Future schemas should add explicit multi-horizon arrays, sensor poses, input evidence, activation references and flow conventions before exposing corresponding controls. No implicit interpretation of foreign benchmark grids is allowed.

## Code map

```text
index.html              App controls and workspaces
styles.css              Responsive workspace layout
js/simulation.js        Geometry, sensors, evidence, toy forecast, metrics
js/network.js           Proposed tensor graph, parameter assumptions, toy kernels
js/render.js            Canvas drawing and coordinate/view transforms
js/artifacts.js         Validated frozen prediction import/export contract
js/app.js               Interaction state, guided mode, training patch, UI wiring
reference.html          Supplemental original concept lessons
tests/                 Numerical and mocked-interface regression checks
```

No generated assets, vendored libraries, telemetry or runtime network calls. All visualizer code stays here; it does not initialize the ML package.

## Verification

Node.js is needed **only for tests**, not to run the visualizer:

```sh
node --test visualizer/tests/simulation.test.cjs visualizer/tests/interface.test.cjs
```

Tests cover coordinate/ROI invariants, rotated rasterization, ray occlusion, scene-to-output propagation, history/alignment changes, actor semantics, flow direction, probability metrics, masks, artifact validation, parameter shapes, guided controls, editing/undo, timeline and gradient behavior. Interface tests use a small DOM/canvas harness: they do not verify browser layout, pointer rendering or cross-browser behavior.

Manual browser acceptance checklist: open at desktop and narrow widths; drag ego/actors; add/remove/undo; wheel/Shift-pan both canvases; scrub/play/pause; toggle sensors/history/alignment; complete all guided steps; inspect grid and network stages with keyboard; train a patch; export and reimport; reject malformed input; return to simulation. Reduced-motion preferences remove decorative transitions and playback begins only on explicit action.

## Maintain alongside the model

When the project contract changes, update the numerical contract, graph, labels, tests, explanations and roadmap status together. Default tensor settings mirror `../docs/v1-proposed.json`; owning documents remain authoritative for scope, labels and evaluation. Preserve proposed/implemented/measured distinctions. Update the supplemental lessons when their concepts change. Replace toy output paths only through explicit adapters carrying dataset/checkpoint provenance; never relabel synthetic values as model results.
