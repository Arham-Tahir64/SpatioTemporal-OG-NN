(function (root) {
  "use strict";
  function validate(a) {
    const fail = (m) => {
      throw new Error(m);
    };
    if (!a || a.schema !== "occupancy-inspection-v1")
      fail("Expected schema occupancy-inspection-v1.");
    if (!["synthetic", "model"].includes(a.kind))
      fail("kind must be synthetic or model.");
    if (
      !a.provenance ||
      typeof a.provenance.source !== "string" ||
      !a.provenance.source.trim()
    )
      fail("provenance.source is required.");
    if (
      a.kind === "model" &&
      ["model_id", "dataset_id", "checkpoint_id"].some(
        (k) => typeof a.provenance[k] !== "string" || !a.provenance[k].trim(),
      )
    )
      fail("Model artifacts need model_id, dataset_id and checkpoint_id.");
    if (
      !a.grid ||
      ![64, 128].includes(a.grid.size) ||
      a.grid.resolution !== 64 / a.grid.size ||
      a.grid.frame !== "E0_x_forward_y_left" ||
      JSON.stringify(a.grid.extent) !== "[-32,32]"
    )
      fail(
        "Grid must be 64/128 square, cover [-32,32) m, and use E0_x_forward_y_left.",
      );
    if (
      !Number.isFinite(a.anchor_time) ||
      !Number.isFinite(a.horizon_s) ||
      a.horizon_s < 0 ||
      a.horizon_s > 10
    )
      fail("Invalid anchor_time/horizon_s.");
    const len = a.grid.size ** 2;
    for (const key of ["probabilities", "truth", "valid"]) {
      if (!Array.isArray(a[key]) || a[key].length !== len)
        fail(key + " length must equal grid.size².");
      if (
        a[key].some(
          (v) =>
            !Number.isFinite(v) ||
            (key === "probabilities" ? v < 0 || v > 1 : v !== 0 && v !== 1),
        )
      )
        fail("Invalid values in " + key);
    }
    return {
      n: a.grid.size,
      prob: Float32Array.from(a.probabilities),
      truth: Uint8Array.from(a.truth),
      valid: Uint8Array.from(a.valid),
    };
  }
  function pack(s, d) {
    return {
      schema: "occupancy-inspection-v1",
      kind: "synthetic",
      provenance: {
        source:
          "editable toy scene; oracle IDs/box sizes and hit-centroid motion, no trained model",
      },
      grid: {
        size: d.n,
        resolution: s.resolution,
        extent: [-32, 32],
        frame: "E0_x_forward_y_left",
      },
      anchor_time: s.time,
      horizon_s: s.horizon,
      probabilities: Array.from(d.prob),
      truth: Array.from(d.truth),
      valid: Array.from(d.valid),
    };
  }
  root.OGArtifacts = { validate, pack };
  if (typeof module !== "undefined") module.exports = root.OGArtifacts;
})(globalThis);
