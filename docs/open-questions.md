# Open questions and risk register

Resolved user preference: **planning on macOS, implementation on Windows**. The baseline architecture is concrete; items below are validation decisions, not reasons to delay learning and specification work.

| ID | Decision / risk | Proposed default and evidence | Resolution gate / next action |
|---|---|---|---|
| Q01 | Windows GPU/VRAM/driver unknown | Batch 4 and small CNN are starting points, not fit guarantees | Phase 0: record machine specs and profile before scale |
| Q02 | CARLA release/client compatibility | One released Windows server and matching wheel | Phase 0: test connection, sensors and supported Python; pin exact versions |
| Q03 | Large data exceeds Git/storage quota | Repository paths + versioned manifests; LFS proposed | Before bulk collection: measure pilot and select retention/quota |
| Q04 | 2D grid merges overpasses/slopes | Flat single-level pilot; gravity-aligned frame, local ground validation | Phase 1: exclude multilevel scenes until layer-aware labels exist |
| Q05 | Rays do not prove 2D columns empty | Partial ray-evidence channel, not free-space certificate | Phase 1: high-beam/low-obstacle fixture and QA |
| Q06 | Box inflation hurts small actors | Positive-area footprint rasterizer with explicit target meaning | E09: evaluate quantization/area bias and pedestrian recall |
| Q07 | Synthetic hidden actors may be unpredictable | All-actor truth with visibility/entry slices | Phase 4: measure visible vs history-hidden vs unseen performance |
| Q08 | Repeated routes leak across splits | Group replays/route families before windows | Phase 1: manifest audit; new dataset version if violated |
| Q09 | Temporal model learns stationary prevalence | Matched repeated-frame and single-frame controls | E03/E04: moving slices and no-alignment controls |
| Q10 | Weighted/focal loss distorts probabilities | Unweighted BCE first | E12/E21: compare raw/calibrated Brier/NLL |
| Q11 | CV uses unfair oracle information | Separate sensor and oracle tracks | Phase 2: explicit feature allowlist and run metadata |
| Q12 | Interaction needs ego policy or traffic lights | v1 marginal forecast under collection policy | Later action/map/traffic-light experiment; no causal planning claims |
| Q13 | Richer model is slower without useful gain | Stack first, then temporal convolution/ConvGRU | E07 and hardware Pareto comparison |
| Q14 | Research code breaks on Windows | Reimplement simple published ideas in portable modules | Pin/check exact dependencies only when adopted; no blanket clone/install |
| Q15 | Real-data label timing/visibility differs | Dedicated adapter with independent protocol | After v1: nuScenes mini plumbing and full-data evaluation plan |
| Q16 | Model latency hides stale queued inputs | Timestamp/freshness metadata and bounded queues | Phase 7: delay/reset tests and wall-clock measurement |
| Q17 | Original 8–10-week schedule too optimistic | Gate-based roadmap with scoped effort ranges | After pilot: re-estimate from actual throughput and learning gaps |

## Research stopping rule for v1

The representation, timestamping, targets, baselines, losses and evaluation are specified well enough to begin Phase 0/1 implementation. Remaining optimal-architecture questions are empirical and belong in the experiment plan. Do not continue accumulating papers indefinitely or replace the baseline because a newer system reports better scores on a different task.
