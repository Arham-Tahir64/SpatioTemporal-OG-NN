# Curated reference catalog

Research snapshot: 2026-10-01. **Required** means necessary for the next relevant phase, not “read everything before starting.” **Recommended** strengthens implementation choices. **Optional** is a later research branch. Links are primary publications, author repositories, official documentation or university resources. The [research log](research-log.md) records depth of inspection and access limits. Descriptions are concise; this is not a claim that every codebase has been reproduced.

## Mapping, geometry and core learning

| ID / priority | Resource | Introduces; why relevant | Focus and implementation influence |
|---|---|---|---|
| R01 Required | [Elfes, Occupancy Grids: A Stochastic Spatial Representation for Active Robot Perception](https://arxiv.org/abs/1304.1098) (archival upload of foundational work) | Spatial random fields and uncertain occupancy | Read representation/sensor-model sections; distinguish latent occupancy from a measured hit |
| R02 Required | [Stachniss, Mobile Sensing and Robotics I](https://www.ipb.uni-bonn.de/msr1-2021/index.html) (2021 university lectures with videos) | Occupancy mapping, motion and observation models | Watch Occupancy Grid Maps, Observation Models and Kalman Filter; derive inverse-sensor/log-odds updates and CV tracking |
| R03 Required | [Lynch & Park, Modern Robotics §3.3.1](https://modernrobotics.northwestern.edu/nu-gm-book-resource/3-3-1-homogeneous-transformation-matrices/) (book video/transcript) | Homogeneous transforms and frame composition | Work through inverse/composition examples; build frame roundtrip fixtures |
| R04 Recommended | [MRPT occupancy-grid tutorial](https://www.mrpt.org/tutorials/programming/maps-for-localization-slam-map-building/occupancy_grids/) and [API](https://docs.mrpt.org/reference/stable/class_mrpt_maps_COccupancyGridMap2D.html) | Practical log-odds storage and ray insertion | Inspect probability convention: this API's 0/1 convention differs from ours; borrow tests/ideas rather than assume compatible arrays |
| R05 Recommended | [Nuss et al., A Random Finite Set Approach for Dynamic Occupancy Grid Maps](https://arxiv.org/abs/1605.02406) (2016 preprint; later IJRR) | Bayesian dynamic grids and particle representations | Focus on occupancy/velocity uncertainty and update/prediction split; informs a classical DOGMa extension, not mandatory v1 machinery |
| R06 Required | [Stanford CS231n](https://cs231n.stanford.edu/) (university course) | CNNs, optimization, backpropagation and vision models | Learn tensor shapes, receptive fields, gradient debugging and overfitting; enough to implement and diagnose a small segmenter |
| R07 Required | [Ronneberger et al., U-Net](https://arxiv.org/abs/1505.04597) (2015) | Encoder-decoder segmentation with skip connections | Focus on context/localization tradeoff; adapt the topology, not biomedical augmentation or benchmark claims |
| R08 Recommended | [Shi et al., ConvLSTM](https://arxiv.org/abs/1506.04214) (2015) | Convolutional recurrent state for spatial forecasting | Study gates and hidden/cell-state dimensions; compare recurrent fusion only after fixed-window baseline |
| R09 Recommended | [Vaswani et al., Attention Is All You Need](https://arxiv.org/abs/1706.03762) (2017) | Scaled dot-product attention and positional information | Understand Q/K/V, masks and quadratic cost; implement downsampled temporal attention as an ablation |

## Closest forecasting systems

| ID / priority | Resource | Introduces; why relevant | Focus and implementation influence |
|---|---|---|---|
| R10 Required | [Wu et al., MotionNet](https://arxiv.org/abs/2003.06754) (CVPR 2020), [MERL code](https://github.com/merlresearch/MotionNet), [original author code](https://github.com/pxiangwu/MotionNet) | LiDAR sequence to BEV category, motion state and displacement | Read §3.1–3.5, temporal backbone and evaluation; motivates alignment and lightweight temporal convolutions. It does not directly reproduce our four occupancy outputs. MERL README identifies AGPL-3.0-or-later plus distinct adapted devkit terms; inspect exact files before reuse |
| R11 Recommended | [Hu et al., FIERY](https://arxiv.org/abs/2104.10490) (ICCV 2021), [code](https://github.com/wayveai/fiery) | Camera-to-BEV future instances and stochastic future prediction | Read §3.3–3.6 and ablations; use alignment and causal inference lessons. Conditional latent futures and instance heads are later extensions. Repo advertises MIT; dependencies/data remain separate |
| R12 Required | [Mahjourian et al., Occupancy Flow Fields](https://arxiv.org/abs/2203.03875) (2022) | Occupancy plus backward flow, including speculative actors | Focus on problem inputs, flow direction and loss definitions. State/map inputs differ from raw LiDAR; inspires oracle track and occlusion slices rather than direct score comparison |
| R13 Recommended | [Waymo occupancy-flow tutorial](https://github.com/waymo-research/waymo-open-dataset/blob/master/tutorial/tutorial_occupancy_flow.ipynb), [official devkit](https://github.com/waymo-research/waymo-open-dataset) | Rendering targets and implementing benchmark metrics | Study rasterization, waypoint configuration and metric conventions; use its evaluator only if adopting its full benchmark contract |
| R14 Recommended | [Ma et al., Cam4DOcc](https://arxiv.org/abs/2311.17663) (CVPR 2024), [code](https://github.com/haomo-ai/Cam4DOcc) | Camera-based 4D forecasting with several label/task levels | Focus on inflated versus fine geometry and static versus movable classes; informs our label scope. Its backward centripetal flow is not rigid material-point displacement |
| R15 Optional | [Liu et al., FlowNet3D](https://openaccess.thecvf.com/content_CVPR_2019/papers/Liu_FlowNet3D_Learning_Scene_Flow_in_3D_Point_Clouds_CVPR_2019_paper.pdf), [code](https://github.com/xingyul/flownet3d) (CVPR 2019) | Motion correspondence on irregular point clouds | Study flow embedding and occlusion; useful for sensor-CV upgrades. Estimating between two observed frames is different from forecasting future flow |

## BEV perception and occupancy datasets

| ID / priority | Resource | Introduces; why relevant | Focus and implementation influence |
|---|---|---|---|
| R16 Recommended | [Lang et al., PointPillars](https://arxiv.org/abs/1812.05784) (CVPR 2019) | Learned point features in vertical pillars feeding 2D CNNs | Focus on feature construction/scatter; possible richer LiDAR encoder after hand-engineered BEV baseline |
| R17 Recommended | [Philion & Fidler, Lift, Splat, Shoot](https://arxiv.org/abs/2008.05711), [code](https://github.com/nv-tlabs/lift-splat-shoot) (ECCV 2020) | Image features lifted using depth distributions and pooled into BEV | Study coordinate/calibration and depth uncertainty; first camera pathway if the sensor ablation is justified |
| R18 Recommended | [BEVFormer official repository](https://github.com/fundamentalvision/BEVFormer) (ECCV 2022; paper, slides and author talks linked) | Spatiotemporal attention for camera-based BEV perception | Focus on temporal alignment and spatial cross-attention; it is originally a perception framework, not a ready occupancy forecaster |
| R19 Recommended | [Occ3D official project](https://github.com/Tsinghua-MARS-Lab/Occ3D) | 3D occupancy labels and distinct visibility masks | Inspect voxel labels, camera/LiDAR masks and dataset restrictions; prevents confusing unobserved volume with empty volume |
| R20 Optional | [OpenOccupancy](https://github.com/JeffWang987/OpenOccupancy) (ICCV 2023) | Surrounding semantic occupancy benchmark and multimodal baselines | Focus on annotation generation and modality splits; reference for full-scene 3D extension rather than v1 dependency |
| R21 Recommended | [nuScenes devkit tutorial](https://www.nuscenes.org/tutorials/nuscenes_tutorial.html) | Relational sensor/ego/annotation schema, 2 Hz annotated samples | Read sample versus sample_data and transform chains; guides real-data adapter and prevents timing assumptions |
| R22 Optional | [SemanticKITTI](https://arxiv.org/abs/1904.01416) (ICCV 2019) | Sequence-level LiDAR semantics and scene-completion tasks | Focus on task/label validity definitions; useful when expanding beyond actor footprints |
| R23 Optional | [Waymo Open Dataset overview](https://community.waymo.com/open/about/) | Distinct Perception, Motion and driving data products | Check source availability and terms; choose data by required input/label contract, not brand name |

## Surveys and world models

| ID / priority | Resource | Introduces; why relevant | Focus and implementation influence |
|---|---|---|---|
| R24 Recommended | [Zhang et al., Vision-based 3D occupancy prediction: a review and outlook](https://arxiv.org/abs/2405.02595) (2024), [author-maintained catalog](https://github.com/zya3d/Awesome-3D-Occupancy-Prediction) | Taxonomy of features, efficiency and label requirements | Read scope/taxonomy first; use references for discovery, verify individual methods at primary sources |
| R25 Recommended | [Xu et al., Occupancy Perception: The Information Fusion Perspective](https://arxiv.org/abs/2405.05173) (2024) | Occupancy methods organized by information fusion | Focus on input modalities and fusion stages; informs LiDAR/camera/radar decisions |
| R26 Optional | [Zheng et al., OccWorld](https://arxiv.org/abs/2311.16038), [code](https://github.com/wzzheng/OccWorld) (ECCV 2024) | Tokenized occupancy and autoregressive scene/ego evolution | Read tokenizer, temporal causal attention and input variants; test oracle/perceived occupancy separately if adopted |
| R27 Optional | [Yang et al., Drive-OccWorld](https://arxiv.org/abs/2408.14197) (AAAI 2025) | Vision-centric occupancy/flow forecasting with action conditioning | Focus on action inputs and memory; relevant only once considering interactive ego-conditioned forecasts |
| R28 Recommended for extension | [Wang et al., UniOcc](https://www.openaccess.thecvf.com/content/ICCV2025/papers/Wang_UniOcc_A_Unified_Benchmark_for_Occupancy_Forecasting_and_Prediction_in_ICCV_2025_paper.pdf) (ICCV 2025) | Unified occupancy benchmark across data domains | Focus on protocol harmonization and domain gaps; warns against treating synthetic and real data mixing as automatically beneficial |
| R29 Optional / emerging | [Chen et al., GEM](https://arxiv.org/abs/2605.17682) (May 2026 preprint) | Continuous-time Gaussian scene evolution | Abstract-level lead only: examine arbitrary-time queries as a later alternative to fixed horizons. No reproduction or superiority claim adopted here |
| R30 Optional / emerging | [InterOCF](https://arxiv.org/abs/2607.24431) (July 2026 preprint) | Camera 2D/3D interaction for occupancy forecasting | Discovery-level lead; inspect full method and code before allowing it to alter v1 |

## Losses, uncertainty and deployment

| ID / priority | Resource | Introduces; why relevant | Focus and implementation influence |
|---|---|---|---|
| R31 Required | [PyTorch BCEWithLogitsLoss](https://docs.pytorch.org/docs/stable/generated/torch.nn.BCEWithLogitsLoss.html) | Stable sigmoid/cross-entropy and weighting behavior | Check reduction/broadcast semantics for the pinned version; use explicit validity-mask normalization |
| R32 Recommended | [Lin et al., Focal Loss](https://arxiv.org/abs/1708.02002) (ICCV 2017) | Downweights easy examples under imbalance | Understand alpha/gamma; compare with BCE without assuming better calibration |
| R33 Required before probability claims | [Guo et al., On Calibration of Modern Neural Networks](https://proceedings.mlr.press/v70/guo17a.html) (ICML 2017) | Reliability evaluation and post-hoc temperature scaling | Use a separate calibration split; verify per-horizon probabilities rather than equating sigmoid with calibration |
| R34 Recommended | [Kendall & Gal, What Uncertainties Do We Need?](https://arxiv.org/abs/1703.04977) (NeurIPS 2017) | Aleatoric versus epistemic uncertainty | Learn distinction; reserve ensembles/latent futures for separate questions instead of one generic uncertainty head |
| R35 Required for optimization | [PyTorch profiler recipe](https://docs.pytorch.org/tutorials/recipes/recipes/profiler_recipe.html) | CPU/accelerator time and memory inspection | Profile preprocessing, transfer and network separately; use measured bottlenecks |
| R36 Optional, NVIDIA only | [TensorRT performance guide](https://docs.nvidia.com/deeplearning/tensorrt/latest/performance/best-practices.html) | Inference precision and timing practices | Read timing/synchronization and precision sections; require accuracy/calibration parity before export adoption |

## Simulator, implementation resources and industry context

| ID / priority | Resource | Introduces; why relevant | Focus and implementation influence |
|---|---|---|---|
| R37 Required | [CARLA synchrony/time-step](https://carla.readthedocs.io/en/latest/adv_synchrony_timestep/) | Fixed-step synchronous collection and physics constraints | Match sensor callbacks by frame ID, use one tick owner, log reproducibility conditions |
| R38 Required | [CARLA sensor reference](https://carla.readthedocs.io/en/latest/ref_sensors/) | Measurement formats, frames, LiDAR and semantic sensors | Validate scan coverage, coordinate handedness and input/label separation |
| R39 Required | [CARLA bounding boxes](https://carla.readthedocs.io/en/latest/tuto_G_bounding_boxes/) | Box-local and world geometry | Generate polygons from correct vertices; build offset/rotation fixtures |
| R40 Required for Windows setup | [CARLA packaged installation](https://carla.readthedocs.io/en/latest/start_quickstart/) | Windows/Linux server/client setup | Select a compatible release, then pin its docs and wheel; do not assume latest page is a lockfile |
| R41 Recommended video | [MotionNet conference presentation, CVF YouTube](https://www.youtube.com/watch?v=YodXMWLDKKo) (2020) | Author presentation of the temporal BEV pipeline | Watch alongside §3; inspect representation and motion examples before reading implementation |
| R42 Optional industry context | [Tesla AI & Robotics](https://www.tesla.com/AI) | Public industry description of perception/planning | Motivation for occupancy-oriented systems only; closed implementation/training details are not reproducible evidence for our architecture |
| R43 Optional technical blog | [Waymo: How we built a scalable autonomous driver](https://waymo.com/blog/2022/05/howwevebuiltascalableautonomousdriver/) (2022) | Official engineering overview of a driving system | Read perception/prediction/planning context; helps position the forecaster within a larger stack, not derive tensor specifications |
| R44 Recommended technical blog | [Wayve: Predicting the future from monocular cameras in BEV](https://wayve.ai/thinking/predicting-the-muture-from-monocular-cameras-in-birds-eye-view/) | Author-side visual explanation of FIERY | Use the illustrations to understand multiple futures; rely on the paper for exact objective and causal inference details |

## Added mapping resources — 2026-10-02

| ID / priority | Resource | Focus and project use |
|---|---|---|
| R45 Optional overview | [Think Autonomous occupancy mapping](https://www.thinkautonomous.ai/blog/occupancy-grid-mapping/) | Visual introduction; see distinctions and caveats in the reading guide |
| R46 Optional recap | [Naren Suri occupancy mapping](https://medium.com/@SuriNaren/occupancy-grid-mapping-algorithm-e451701da0e8) | Worked examples; mathematical caveats documented in the reading guide |
| R47 Required | [Chebrolu MSR 03 lecture](https://www.youtube.com/watch?v=x_Ah685BFEQ) | Main known-pose mapping foundation |
| R48 Recommended | [TempleRAIL PyTorch mapper](https://github.com/TempleRAIL/occupancy_grid_mapping_torch) | Reference mapping code; inspect before adaptation |
| R49 Recommended | [Xie & Dames, Stochastic Occupancy Grid Map Prediction in Dynamic Scenes](https://proceedings.mlr.press/v229/xie23a.html), [SOGMP code](https://github.com/TempleRAIL/SOGMP) (CoRL 2023) | Bridge from map construction to stochastic future prediction; a variational model, not our direct-map baseline |
| R50 Required if probability needs review | [Bonn online robotics: Probability Primer / Bayes Filter](https://www.ipb.uni-bonn.de/online-training-robotics/) | Prerequisite before the mapping lecture |
| R51 Optional continuation | [SCOPE, official repository](https://github.com/TempleRAIL/scope) (T-RO 2025) | Author-designated continuation of SOGMP; inspect before a forecasting-code adoption decision, not required for basic mapping |

Follow the [ordered reading guide](occupancy-mapping-reading-order.md) rather than consuming these as an unordered list.

## How to maintain this catalog

Add a stable ID, title/year, primary URL, paper/code distinction, priority, focus, implementation consequence and inspection status in the research log. Link the experiment/ADR that used it. Do not copy entire papers into the repository. Record author code commit and LICENSE when actually importing or running it. Keep superseded sources with a note; a new leaderboard result alone is not a reason to change the baseline.
