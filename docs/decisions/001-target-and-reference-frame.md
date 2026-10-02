# ADR 001 — Target semantics and frame

Status: selected v1 default, pending geometry/label QA.

**Context:** “occupancy” can mean observed returns, solid geometry, selected actor footprints, current reconstruction or future prediction. An ambiguous label makes loss and metric comparisons meaningless.

**Evidence:** MotionNet separates motion/state/category; Cam4DOcc explicitly compares inflated versus fine geometry; Occ3D exposes visibility masks. See R10/R14/R19 in the [catalog](../references.md).

**Decision:** binary union of supported vehicle and pedestrian box footprints, including stopped actors, excluding ego; all horizons in one gravity-aligned current ego frame; 64 m square, 0.5 m cells. Unknown sensor evidence is independent of target validity. Zero means no supported actor, never globally free.

**Alternatives:** full semantic 3D occupancy needs new labels/compute; motion-only labels discard stopped obstacles; future-ego frames complicate causality and comparison; camera-only inputs introduce depth uncertainty before temporal reasoning is validated.

**Consequences:** simpler reproducible task; loses vertical geometry and coherent instance trajectories. Keep static obstacle evidence separate. Need conservative rasterizer bias analysis and visibility slices.

**Revisit:** multilevel roads, class-specific behavior, planning interface or measured pedestrian aliasing demands richer labels. Increment label schema and rerun baselines when changing target meaning.
