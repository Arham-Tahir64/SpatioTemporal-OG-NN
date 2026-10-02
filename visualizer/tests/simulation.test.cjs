const { test } = require("node:test"),
  assert = require("node:assert/strict");
const S = require("../js/simulation.js"),
  N = require("../js/network.js"),
  A = require("../js/artifacts.js");
const config = require("../../docs/v1-proposed.json");
test("default representation matches the proposed contract", () => {
  assert.deepEqual(S.contract.history, config.timing.history_offsets_s);
  assert.deepEqual(S.contract.horizons, config.timing.forecast_horizons_s);
  assert.deepEqual(S.contract.widths, config.model.encoder_widths);
  assert.equal(S.contract.size, config.grid.shape_hw[0]);
  assert.equal(S.contract.resolution, config.grid.resolution_m);
  assert.equal(S.contract.channels, config.input.channels.length);
});
test("coordinate transforms roundtrip and boundaries are half-open", () => {
  const e = { x: 3, y: -8, yaw: 0.7 },
    p = { x: 11, y: 5 };
  const q = S.local(S.world(p, e), e);
  assert(Math.abs(q.x - p.x) < 1e-10);
  assert(Math.abs(q.y - p.y) < 1e-10);
  assert.equal(S.cell(-32, -32), 0);
  assert.equal(S.cell(32, 0), -1);
  assert.equal(S.cell(0, 32), -1);
  assert.equal(S.cell(31.99, 31.99), 16383);
});
test("rotated positive-area rasterization rejects touching cells", () => {
  const box = { x: 0, y: 0, w: 2, h: 2, yaw: 0 };
  assert(S.overlap(0, 0, 0.5, box));
  assert(!S.overlap(1.25, 0, 0.5, box));
  assert(S.overlap(1.24, 0, 0.5, box));
  assert(S.overlap(1, 0, 0.5, { ...box, yaw: Math.PI / 4 }));
  assert(!S.overlap(2, 2, 0.5, { ...box, yaw: Math.PI / 4 }));
});
test("ray stops at first rectangle intersection, including rotated boxes", () => {
  const o = { x: 10, y: 0, yaw: 0, w: 4, h: 2 };
  assert.equal(S.rayBox({ x: 0, y: 0 }, 1, 0, o), 8);
  assert.equal(S.rayBox({ x: 0, y: 3 }, 1, 0, o), null);
  assert.equal(S.rayBox({ x: 0, y: 0 }, 1, 0, { ...o, yaw: Math.PI / 2 }), 9);
});
test("occluder hides actor hits; turning off LiDAR produces no tracks or evidence", () => {
  const s = S.defaults();
  s.objects = [
    { id: 1, type: "obstacle", x: 0, y: 0, vx: 0, vy: 0, w: 4, h: 8, yaw: 0 },
    {
      id: 2,
      type: "pedestrian",
      x: 5,
      y: 0,
      vx: 0,
      vy: 0,
      w: 0.8,
      h: 0.8,
      yaw: 0,
    },
  ];
  assert(!S.scan(s, 0).some((p) => p.id === 2));
  s.lidar = false;
  const d = S.compute(s);
  assert.equal(d.tracks.length, 0);
  assert(!d.hit.some(Boolean));
  assert(d.truth.some(Boolean));
  assert(d.prob.every((p) => Math.abs(p - 0.015) < 1e-6));
});
test("scene movement changes evidence, target and forecast", () => {
  const s = S.defaults(),
    a = S.compute(s);
  s.objects[0].y += 6;
  const b = S.compute(s);
  assert.notDeepEqual(a.hit, b.hit);
  assert.notDeepEqual(a.truth, b.truth);
  assert.notDeepEqual(a.prob, b.prob);
});
test("history and compensation affect toy motion while camera remains demo only", () => {
  const s = S.defaults(),
    a = S.compute(s);
  s.history = 1;
  const b = S.compute(s);
  assert.notDeepEqual(a.prob, b.prob);
  s.history = 6;
  s.compensate = false;
  const c = S.compute(s);
  assert.notDeepEqual(a.prob, c.prob);
  s.compensate = true;
  s.camera = false;
  assert.deepEqual(a.prob, S.compute(s).prob);
});
test("stopped actors count as targets; structures do not", () => {
  const s = S.defaults(),
    d = S.compute(s);
  const p = S.local({ x: 20, y: -8 }, d.reference),
    w = S.local({ x: 0, y: -10 }, d.reference);
  assert.equal(d.truth[S.cell(p.x, p.y)], 1);
  assert.equal(d.truth[S.cell(w.x, w.y)], 0);
  assert.equal(d.staticGrid[S.cell(w.x, w.y)], 1);
});
test("backward flow has the right direction and support", () => {
  const s = S.defaults();
  s.objects = [
    { id: 1, type: "vehicle", x: 0, y: 0, vx: 2, vy: 1, yaw: 0, w: 4, h: 2 },
  ];
  const d = S.compute(s),
    k = d.flowValid.findIndex(Boolean);
  assert(k >= 0);
  assert.equal(d.flowX[k], -4);
  assert.equal(d.flowY[k], -2);
});
test("metrics mask invalid labels and threshold does not change proper scores", () => {
  const p = [0.9, 0.6, 0.4, 0.1],
    y = [1, 0, 1, 0],
    v = [1, 1, 1, 1],
    a = S.metrics(p, y, v, 0.5),
    b = S.metrics(p, y, v, 0.8);
  assert.deepEqual([a.tp, a.fp, a.fn, a.tn], [1, 1, 1, 1]);
  assert.equal(a.f1, 0.5);
  assert.equal(a.brier, b.brier);
  assert.equal(a.nll, b.nll);
  assert.notEqual(a.precision, b.precision);
  assert.equal(S.metrics([0.1], [0], [1]).iou, null);
  assert.equal(S.metrics([0.1], [1], [0]).nll, null);
  assert.equal(S.metrics([0.1], [1], [0]).count, 0);
});
test("architecture skip dimensions and parameter assumptions are coherent", () => {
  const layers = N.layers(S.defaults());
  assert(layers[5].input.includes("384"));
  assert(layers[6].input.includes("192"));
  assert(layers[7].input.includes("96"));
  assert.equal(layers[8].parameters, 165);
  assert.equal(layers[0].c, 24);
  assert.equal(layers[4].h, 16);
  const a = N.convolve(
    Float32Array.of(0, 0, 0, 0, 1, 0, 0, 0, 0),
    3,
    "identity",
  );
  assert.equal(a[4], 1);
  assert.equal(
    a.reduce((x, y) => x + y),
    1,
  );
});
test("artifact roundtrip, mask validation and model provenance requirements", () => {
  const s = S.defaults(),
    d = S.compute(s),
    a = A.pack(s, d),
    b = A.validate(a);
  assert.deepEqual(b.prob, d.prob);
  assert.equal(b.n, 128);
  assert.throws(() => A.validate({ ...a, kind: "model" }), /model_id/);
  const model = {
    ...a,
    kind: "model",
    provenance: {
      source: "test",
      model_id: "m",
      dataset_id: "d",
      checkpoint_id: "c",
    },
  };
  assert.equal(A.validate(model).n, 128);
  assert.throws(() => A.validate({ ...a, probabilities: [0.5] }), /length/);
  const bad = structuredClone(a);
  bad.valid[0] = 2;
  assert.throws(() => A.validate(bad), /Invalid values/);
  bad.valid[0] = 1;
  bad.probabilities[0] = NaN;
  assert.throws(() => A.validate(bad), /Invalid values/);
});
test("numerics remain finite over alternate history, resolution and fusion choices", () => {
  for (const architecture of ["stack", "lstm", "attention"])
    for (const history of [1, 10]) {
      const s = {
        ...S.defaults(),
        architecture,
        history,
        resolution: 1,
        time: 3.5,
        horizon: 3,
      };
      const d = S.compute(s);
      assert.equal(d.prob.length, 4096);
      assert(d.prob.every((p) => Number.isFinite(p) && p >= 0 && p <= 1));
      assert.equal(S.metrics(d.prob, d.truth, d.valid).count, 4096);
    }
});
