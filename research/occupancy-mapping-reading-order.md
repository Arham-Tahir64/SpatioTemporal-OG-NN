# Occupancy mapping: resource assessment and reading order

Reviewed 2026-10-02. This sequence narrows the [full prerequisite roadmap](prerequisites.md) to the user's four suggested resources and the minimum additions needed to bridge mapping to forecasting. Planning remains on macOS; implementation will be on Windows.

## Assessment of the supplied resources

| Resource | Recommendation | What to take / qualification |
|---|---|---|
| [Think Autonomous](https://www.thinkautonomous.ai/blog/occupancy-grid-mapping/) | Optional first skim | Visual motivation and representation vocabulary. Keep occupancy, traversability and semantic labels distinct. Log odds reparameterizes probability; an unbounded logit does not add information. Do not transplant its illustrative height-collapse rule as a collision map. |
| [Naren Suri / Medium](https://medium.com/@SuriNaren/occupancy-grid-mapping-algorithm-e451701da0e8) | Optional recap after the lecture | Numerical updates can help, but the explanation conflates spatial factorization with temporal log-odds filtering. A product of cell marginals still discards joint dependencies; shared rays do not restore them in the stored representation. Use the lecture as the mathematical authority. |
| [Chebrolu: MSR 03, Occupancy Grid Mapping with Known Poses](https://www.youtube.com/watch?v=x_Ah685BFEQ) | Required foundation | Known poses match the initial CARLA assumption. Study the map posterior, independent-cell approximation, inverse sensor model and recursive update. Official video identity/course provenance verified; not watched end-to-end in this review. |
| [TempleRAIL occupancy_grid_mapping_torch](https://github.com/TempleRAIL/occupancy_grid_mapping_torch) | Recommended code study after theory | Mapping/data preparation rather than the future-prediction network. Read README, `local_occ_grid_map.py`, `bresenham_torch.py`, then `dataset_gmapping_node.py`. Compare evidence updates, ray endpoints and reference-frame handling with our contract. |

The mapper advertises Python 3.7 / PyTorch 1.7.1. Selected source inspection found a machine-specific Linux data path and scan-cleanup rules, so Windows compatibility and equivalence to CARLA inputs are unverified. No code was executed or imported. Use it to learn, not as an assumed drop-in dependency.

## Recommended sequence

1. **Think Autonomous — brief skim (optional).** Identify what a cell represents, grid resolution and the occupied/free/unknown distinction. Skip the off-road/planning detours for now.
2. **[Bonn Probability Primer and Bayes Filter](https://www.ipb.uni-bonn.de/online-training-robotics/) — if probability is rusty.** Be comfortable with prior, likelihood, posterior and recursive evidence updates. Otherwise proceed directly to step 3.
3. **Chebrolu's MSR 03 lecture — careful watch.** Pause to reconstruct the update from your own notes. This is the main mapping lesson, not just background viewing.
4. **[Modern Robotics homogeneous transforms](https://modernrobotics.northwestern.edu/nu-gm-book-resource/3-3-1-homogeneous-transformation-matrices/) — required before code.** Work one sensor→world→current-reference example. Review our project's axis/grid convention alongside it.
5. **Medium article — optional critical recap.** Check its worked updates against the formula below. Skip it if the lecture is already clear.
6. **TempleRAIL mapper — trace one scan by hand.** Follow the file order above; predict which cells receive hit, traversal or no evidence before looking at outputs. Running it can wait until Windows implementation.
7. **[Xie & Dames, Stochastic Occupancy Grid Map Prediction in Dynamic Scenes](https://proceedings.mlr.press/v229/xie23a.html), CoRL 2023 — recommended bridge to forecasting.** Read introduction, pipeline and inputs/outputs first, then uncertainty/model details. Its actual forecasting implementation is [TempleRAIL/SOGMP](https://github.com/TempleRAIL/SOGMP). This is distinct from the mapper repository. Its authors also provide [SCOPE](https://github.com/TempleRAIL/scope), the 2025 T-RO continuation; inspect that before choosing code to adapt, but keep it optional for initial study.
8. **[MotionNet](https://arxiv.org/abs/2003.06754) — required project-specific reading.** Read ego compensation, BEV representation and temporal processing; connect them to our LiDAR driving-scene architecture. Return to FIERY and Occupancy Flow Fields after this foundation.

Do not add more general mapping tutorials unless a specific concept remains unclear. CNN training can be learned alongside the later project phases.

## Mathematical distinction to retain

With data D, independent-cell mapping approximates `p(m|D)` by `product_i p(m_i|D)`. That is a spatial factorization assumption. For one cell, define `l=log(p/(1-p))`; recursive Bayesian updating under the usual static-map/measurement assumptions gives:

`l_t(i) = l_(t-1)(i) + logit(p(m_i|z_t,x_t)) - l_prior(i)`.

The second equation is not obtained merely by taking the logarithm of the first. Cells behind a new return receive no new information; a prior belief there should not be reset to 0.5. Repeated evidence also needs correlation/saturation care. Changing beliefs in a dynamic scene is not the same as forecasting future actor motion.

## Ready-to-move-on checklist

Before Phase 1, explain free versus unknown; compute a hit/free log-odds update; preserve occluded prior evidence; transform a point between frames; and distinguish mapping the observed present from forecasting future occupancy. Draw one ray on a small grid and label hit/traversed/unobserved cells. No GPU is needed for these exercises.

This resource review does not change the v1 architecture. SOGMP is an additional forecasting comparison/uncertainty reference to inspect before an advanced branch.
