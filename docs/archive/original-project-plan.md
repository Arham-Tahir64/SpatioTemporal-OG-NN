# Spatiotemporal Occupancy Grid Neural Network

## Project goal

Build a neural network that observes the last second of a driving scene and predicts which areas will be occupied over the next three seconds. Use CARLA to generate training data and demonstrate the predictions.

The project combines perception, temporal learning, and autonomous planning.

## 1. Define exactly what the model predicts

Use a **bird’s-eye-view 2D grid** around the vehicle. Each cell represents a patch of ground, and the model predicts its probability of being occupied at several future times.

For example, a pedestrian approaching the road could produce a predicted region of occupancy that extends into the road and becomes more spread out at longer horizons.

These are **per-cell occupancy probabilities**: an 80% probability in one cell does not directly mean an 80% probability of crossing the road.

### Starting specification

| Component | Initial design |
|---|---|
| Environment | CARLA urban driving |
| Sensor input | LiDAR plus ego poses for frame alignment |
| Grid coverage | 64 m × 64 m around the vehicle |
| Cell size | 0.5 m, producing a 128 × 128 grid |
| History | Six observations spaced 0.2 seconds apart |
| Forecasts | Occupancy at +0.5, +1, +2, and +3 seconds |
| First prediction target | Vehicle and pedestrian footprints |
| Later extension | Static obstacles, semantics, and motion vectors |

Start with **dynamic occupancy forecasting**. Keep a separate current static-obstacle grid for visualization and eventual planning.

## 2. Build the dataset before the network

Record synchronized CARLA episodes containing:

- LiDAR point clouds and sensor/ego poses.
- Vehicle and pedestrian bounding boxes at each timestamp.
- Actor IDs and classes for generating labels and evaluating results.

CARLA exposes semantic LiDAR and actor information that can support this pipeline. Keep simulator-only labels out of the model’s inputs. See the [CARLA sensor reference](https://carla.readthedocs.io/en/latest/ref_sensors/) and [Python API](https://carla.readthedocs.io/en/latest/python_api/).

For each training example:

1. Gather the preceding second of LiDAR observations.
2. Transform every observation into the **current ego coordinate frame**.
3. Rasterize the point clouds into input grids.
4. Rasterize future actor footprints into four target grids, also expressed in that same current frame.

**Frame alignment is critical:** otherwise, your vehicle moving forward makes stationary objects appear to move backward.

Use bounding-box footprints as your initial definition of occupied space. They are convenient labels, but they approximate object shapes.

For input grids, preserve **occupied, observed-free, and unknown** information. An empty LiDAR cell may simply be unobserved. Generating free-space evidence requires ray tracing; missing returns alone do not establish free space.

## 3. Start with a small model

Proposed first architecture:

**Stacked historical grids → small 2D U-Net → four future occupancy maps**

Stack the time steps along the channel dimension. Each time step can contain:

- Obstacle-return density, after ground filtering.
- Maximum obstacle height.
- An observed-space mask.

Approximate input shape:

```text
[batch, 18 channels, 128, 128]
```

Output shape:

```text
[batch, 4 forecast horizons, 128, 128]
```

This is a straightforward starting point before adding recurrent layers or attention. It should be a reasonable small-model workload for your desktop GPU; actual memory requirements depend on model width and batch size. Generate data and train separately.

Once it works, compare it against a **shared frame encoder + ConvGRU + decoder** to test whether explicit temporal processing improves forecasting.

[MotionNet](https://openaccess.thecvf.com/content_CVPR_2020/html/Wu_MotionNet_Joint_Perception_and_Motion_Prediction_for_Autonomous_Driving_Based_CVPR_2020_paper.html) is a useful reference: it processes sequences of LiDAR sweeps into BEV representations and predicts cell-level categories and motion. This project borrows the general temporal-BEV approach while directly predicting future occupancy.

## 4. Prove that it learns useful motion

Build two baselines before training:

| Baseline | What it tests |
|---|---|
| Persistence: repeat current occupancy | Whether forecasting beats assuming nothing moves |
| Constant-velocity extrapolation | Whether learning adds value beyond simple motion prediction |

If constant velocity uses simulator-provided positions and velocities, label it an **oracle-state baseline** because it receives better information than the LiDAR model.

Start with binary cross-entropy, with modest positive weighting if necessary. Evaluate:

- Occupancy IoU separately at each forecast horizon.
- Precision and recall for occupied cells.
- Brier score or another calibration measure for probabilities.
- Inference latency and GPU memory.

Avoid overall accuracy: predicting empty space everywhere can score deceptively well. Weighted losses can also distort probabilities, so check calibration before interpreting outputs as confidence.

**Split by entire driving episodes**, with a separate held-out-town test if possible. Randomly splitting overlapping windows would leak nearly identical scenes across training and evaluation.

## 5. Work through these milestones

At roughly **8–10 hours per week**, budget **8–10 weeks** as a planning estimate.

| Period | Deliverable |
|---|---|
| Weeks 1–2 | Data recorder and correctly aligned BEV visualization |
| Week 3 | Future occupancy labels and dataset splits |
| Week 4 | Persistence and constant-velocity baselines |
| Weeks 5–6 | Train and evaluate the small U-Net |
| Weeks 7–8 | ConvGRU comparison and failure analysis |
| Weeks 9–10 | Polished demo and optional planning integration |

Include stopped traffic, turns, crossings, and partial occlusions. Begin with a small dataset to debug the pipeline before collecting hours of driving.

## 6. Make the final demo explain the result

Show four synchronized views:

- CARLA camera feed.
- Current LiDAR occupancy.
- Predicted future occupancy.
- Actual future occupancy.

Add a timeline slider and report performance against the baselines. Particularly useful examples are a turning car, a crossing pedestrian, and an actor temporarily hidden behind another vehicle.

For a stretch goal, score candidate ego trajectories against the predicted occupancy at matching future times, accounting for the vehicle’s footprint. That connects the network to planning without requiring a full autonomous-driving stack.

## First concrete task

Record one short CARLA episode and render six aligned historical grids alongside the four future target grids. Once those are correct, the learning problem becomes much easier to debug.
