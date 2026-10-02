# ADR 002 — First model and objective

Status: selected v1 default, empirical comparison pending.

**Context:** six aligned frames at 128×128 allow several plausible temporal models; hardware and dataset scale are not yet measured.

**Evidence:** U-Net offers a simple dense decoder; MotionNet motivates efficient temporal BEV processing; FIERY and ConvLSTM motivate recurrence/stochastic extensions. Calibration literature separates probability quality from classification overlap. See R07/R08/R10/R11/R33 in the [catalog](../../research/references.md).

**Decision:** four evidence channels × six frames, channel-stacked 2D U-Net, direct four-horizon binary logits, optional current head weighted 0.25. Unweighted masked BCE first, with per-horizon probability evaluation. GroupNorm avoids relying on large batches. Compare shared-encoder temporal convolution and ConvGRU after baseline validation.

**Alternatives:** recurrence adds state/order handling; attention adds memory/data demand; flow-only propagation cannot represent all entrants; multimodal latent models change evaluation needs. None is ruled out by the baseline choice.

**Consequences:** fixed temporal window and marginal rather than joint forecasts; simple debugging and export path. Exact widths/learning rate are tunable proposed defaults.

**Revisit:** controlled ablations show a robust quality/compute benefit or recurrent occlusion memory solves a measured failure. Never promote on a single favorable scene or test-set tuning.
