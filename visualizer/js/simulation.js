/* Deterministic educational geometry and sensors. No learned model. */
(function (root) {
  "use strict";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const contract = {
    schema: "actor-bev-v1-proposed",
    resolution: 0.5,
    size: 128,
    extent: [-32, 32],
    history: [-1, -0.8, -0.6, -0.4, -0.2, 0],
    horizons: [0.5, 1, 2, 3],
    channels: 4,
    widths: [32, 64, 128, 256],
  };
  const defaults = () => ({
    time: 0,
    history: 6,
    horizon: 2,
    resolution: 0.5,
    compensate: true,
    lidar: true,
    camera: true,
    architecture: "stack",
    bias: 0,
    spread: 0.65,
    threshold: 0.5,
    ego: { x: -10, y: 0, yaw: 0, vx: 3, vy: 0 },
    objects: [
      {
        id: 1,
        type: "vehicle",
        x: 4,
        y: 6,
        vx: 3,
        vy: 0,
        w: 4.5,
        h: 2,
        yaw: 0,
      },
      {
        id: 2,
        type: "pedestrian",
        x: 11,
        y: -5,
        vx: 0,
        vy: 1.4,
        w: 0.8,
        h: 0.8,
        yaw: 0,
      },
      {
        id: 3,
        type: "vehicle",
        x: 20,
        y: -8,
        vx: 0,
        vy: 0,
        w: 4.5,
        h: 2,
        yaw: 0,
      },
      {
        id: 4,
        type: "obstacle",
        x: 0,
        y: -10,
        vx: 0,
        vy: 0,
        w: 7,
        h: 3,
        yaw: 0,
      },
      {
        id: 5,
        type: "obstacle",
        x: 14,
        y: 18,
        vx: 0,
        vy: 0,
        w: 18,
        h: 3,
        yaw: 0,
      },
    ],
  });
  function pose(o, t) {
    return { ...o, x: o.x + o.vx * t, y: o.y + o.vy * t };
  }
  function local(p, e) {
    const x = p.x - e.x,
      y = p.y - e.y,
      c = Math.cos(e.yaw),
      s = Math.sin(e.yaw);
    return { x: c * x + s * y, y: -s * x + c * y };
  }
  function world(p, e) {
    const c = Math.cos(e.yaw),
      s = Math.sin(e.yaw);
    return { x: e.x + c * p.x - s * p.y, y: e.y + s * p.x + c * p.y };
  }
  function cell(x, y, r = 0.5) {
    const n = 64 / r,
      i = Math.floor((y + 32) / r),
      j = Math.floor((x + 32) / r);
    return i >= 0 && i < n && j >= 0 && j < n ? i * n + j : -1;
  }
  function rayBox(origin, dx, dy, o) {
    const p = local(origin, o),
      c = Math.cos(o.yaw),
      s = Math.sin(o.yaw),
      d = { x: c * dx + s * dy, y: -s * dx + c * dy };
    let lo = 0,
      hi = 60;
    for (const [v, k, size] of [
      [p.x, d.x, o.w],
      [p.y, d.y, o.h],
    ]) {
      if (Math.abs(k) < 1e-10) {
        if (Math.abs(v) > size / 2) return null;
      } else {
        const a = (-size / 2 - v) / k,
          b = (size / 2 - v) / k;
        lo = Math.max(lo, Math.min(a, b));
        hi = Math.min(hi, Math.max(a, b));
      }
    }
    return hi >= lo && hi > 0 ? lo : null;
  }
  function scan(s, t) {
    if (!s.lidar) return [];
    const e = pose(s.ego, t),
      objects = s.objects.map((o) => pose(o, t)),
      hits = [];
    for (let k = 0; k < 360; k++) {
      const a = e.yaw + (k * Math.PI) / 180,
        dx = Math.cos(a),
        dy = Math.sin(a);
      let distance = 60,
        actor = null;
      for (const o of objects) {
        const d = rayBox(e, dx, dy, o);
        if (d !== null && d < distance) {
          distance = d;
          actor = o;
        }
      }
      if (actor)
        hits.push({
          x: e.x + distance * dx,
          y: e.y + distance * dy,
          id: actor.id,
          type: actor.type,
          origin: { x: e.x, y: e.y },
          height:
            actor.type === "pedestrian"
              ? 1.7
              : actor.type === "obstacle"
                ? 3
                : 1.5,
        });
    }
    return hits;
  }
  // Positive-area intersection of a rotated rectangle with a grid cell via SAT.
  function overlap(x, y, r, o) {
    const c = Math.cos(o.yaw),
      s = Math.sin(o.yaw),
      dx = x - o.x,
      dy = y - o.y,
      half = r / 2,
      eps = 1e-9;
    return (
      Math.abs(dx) <
        half + (Math.abs(c) * o.w) / 2 + (Math.abs(s) * o.h) / 2 - eps &&
      Math.abs(dy) <
        half + (Math.abs(s) * o.w) / 2 + (Math.abs(c) * o.h) / 2 - eps &&
      Math.abs(c * dx + s * dy) <
        o.w / 2 + half * (Math.abs(c) + Math.abs(s)) - eps &&
      Math.abs(-s * dx + c * dy) <
        o.h / 2 + half * (Math.abs(c) + Math.abs(s)) - eps
    );
  }
  function inReference(o, e) {
    return { ...o, ...local(o, e), yaw: o.yaw - e.yaw };
  }
  function evidencePlane(points, reference, resolution) {
    const n = 64 / resolution,
      len = n * n,
      density = new Float32Array(len),
      height = new Float32Array(len),
      hit = new Uint8Array(len),
      traversal = new Uint8Array(len);
    for (const p of points) {
      const ix = cell(p.x, p.y, resolution);
      if (ix >= 0) {
        density[ix]++;
        hit[ix] = 1;
        height[ix] = Math.max(height[ix], p.height / 4);
      }
      const origin = local(p.origin, reference),
        dx = p.x - origin.x,
        dy = p.y - origin.y,
        steps = Math.ceil(Math.hypot(dx, dy) / (resolution / 3));
      for (let k = 0; k < steps; k++) {
        const j = cell(
          origin.x + (dx * k) / steps,
          origin.y + (dy * k) / steps,
          resolution,
        );
        if (j >= 0 && j !== ix) traversal[j] = 1;
      }
    }
    for (let k = 0; k < len; k++)
      density[k] = Math.min(Math.log1p(density[k]) / Math.log(33), 1);
    return { density, height, hit, traversal };
  }
  function compute(s) {
    const n = 64 / s.resolution,
      len = n * n,
      reference = pose(s.ego, s.time),
      frames = [],
      density = new Float32Array(len),
      height = new Float32Array(len),
      hit = new Uint8Array(len),
      traversal = new Uint8Array(len),
      historyMap = new Float32Array(len);
    for (let k = 0; k < s.history; k++) {
      const t = s.time - (s.history - 1 - k) * 0.2,
        hits = scan(s, t),
        framePose = pose(s.ego, t),
        points = hits.map((p) => ({
          ...p,
          ...local(p, s.compensate ? reference : framePose),
        }));
      frames.push({ t, hits, points });
      for (const p of points) {
        const ix = cell(p.x, p.y, s.resolution);
        if (ix >= 0) historyMap[ix] += (k + 1) / s.history;
      }
    }
    for (const p of frames.at(-1).points) {
      const ix = cell(p.x, p.y, s.resolution);
      if (ix >= 0) {
        density[ix]++;
        hit[ix] = 1;
        height[ix] = Math.max(height[ix], p.height / 4);
      }
      const origin = local(p.origin, reference),
        dx = p.x - origin.x,
        dy = p.y - origin.y,
        steps = Math.ceil(Math.hypot(dx, dy) / (s.resolution / 3));
      for (let k = 0; k < steps; k++) {
        const j = cell(
          origin.x + (dx * k) / steps,
          origin.y + (dy * k) / steps,
          s.resolution,
        );
        if (j >= 0 && j !== ix) traversal[j] = 1;
      }
    }
    for (let i = 0; i < len; i++)
      density[i] = Math.min(Math.log1p(density[i]) / Math.log(33), 1);
    const truth = new Uint8Array(len),
      staticGrid = new Uint8Array(len),
      prob = new Float32Array(len),
      flowX = new Float32Array(len),
      flowY = new Float32Array(len),
      flowValid = new Uint8Array(len),
      classes = new Uint8Array(len);
    const future = s.objects
        .filter((o) => o.type !== "obstacle")
        .map((o) => inReference(pose(o, s.time + s.horizon), reference)),
      obstacles = s.objects
        .filter((o) => o.type === "obstacle")
        .map((o) => inReference(pose(o, s.time), reference));
    // Sensor-conditioned teaching tracks. IDs and box dimensions are synthetic oracle metadata,
    // explicitly NOT a fair sensor-only baseline. Velocity is estimated from noisy hit centroids.
    const tracks = [];
    for (const o of s.objects.filter((o) => o.type !== "obstacle")) {
      const observations = [];
      frames.forEach((f) => {
        const pts = f.points.filter((p) => p.id === o.id);
        if (pts.length)
          observations.push({
            t: f.t,
            x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
            y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
          });
      });
      if (!observations.length) continue;
      const last = observations.at(-1),
        first = observations[0],
        dt = last.t - first.t;
      let vx = dt > 0 ? (last.x - first.x) / dt : 0,
        vy = dt > 0 ? (last.y - first.y) / dt : 0;
      // Different toy fusers genuinely change how hit-centroid motion estimates are aggregated.
      if (s.architecture === "lstm" || s.architecture === "attention") {
        const vs = [];
        for (let k = 1; k < observations.length; k++) {
          const a = observations[k - 1],
            b = observations[k];
          vs.push({
            vx: (b.x - a.x) / (b.t - a.t),
            vy: (b.y - a.y) / (b.t - a.t),
            weight:
              s.architecture === "lstm"
                ? Math.pow(0.65, observations.length - 1 - k)
                : Math.exp(-(s.time - b.t) * 2),
          });
        }
        const sum = vs.reduce((a, v) => a + v.weight, 0);
        if (sum) {
          vx = vs.reduce((a, v) => a + v.vx * v.weight, 0) / sum;
          vy = vs.reduce((a, v) => a + v.vy * v.weight, 0) / sum;
        }
      }
      vx = clamp(vx, -15, 15) + s.bias;
      vy = clamp(vy, -15, 15);
      const age = s.time - last.t,
        lead = age + s.horizon;
      tracks.push({
        ...o,
        x: last.x + vx * lead,
        y: last.y + vy * lead,
        yaw: o.yaw - reference.yaw,
        vx,
        vy,
        observations: observations.length,
      });
    }
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const k = i * n + j,
          x = -32 + (j + 0.5) * s.resolution,
          y = -32 + (i + 0.5) * s.resolution;
        let matches = [];
        future.forEach((o) => {
          if (overlap(x, y, s.resolution, o)) {
            truth[k] = 1;
            classes[k] = o.type === "vehicle" ? 1 : 2;
            matches.push(o);
          }
        });
        if (matches.length === 1) {
          const original = s.objects.find((o) => o.id === matches[0].id),
            now = inReference(pose(original, s.time), reference),
            source = {
              x: x + now.x - matches[0].x,
              y: y + now.y - matches[0].y,
            };
          if (cell(source.x, source.y, s.resolution) >= 0) {
            flowValid[k] = 1;
            flowX[k] = source.x - x;
            flowY[k] = source.y - y;
          }
        }
        staticGrid[k] = obstacles.some((o) => overlap(x, y, s.resolution, o))
          ? 1
          : 0;
        let p = 0.015;
        for (const o of tracks) {
          const q = local({ x, y }, o),
            dx = Math.max(0, Math.abs(q.x) - o.w / 2),
            dy = Math.max(0, Math.abs(q.y) - o.h / 2);
          p = Math.max(
            p,
            0.86 * Math.exp(-(dx * dx + dy * dy) / (2 * s.spread * s.spread)),
          );
        }
        prob[k] = p;
      }
    return {
      n,
      reference,
      frames,
      density,
      height,
      hit,
      traversal,
      historyMap,
      truth,
      staticGrid,
      prob,
      flowX,
      flowY,
      flowValid,
      classes,
      tracks,
      valid: new Uint8Array(len).fill(1),
    };
  }
  const sigmoid = (z) => 1 / (1 + Math.exp(-z));
  function metrics(prob, truth, valid, threshold = 0.5) {
    let tp = 0,
      fp = 0,
      fn = 0,
      tn = 0,
      brier = 0,
      nll = 0,
      count = 0;
    for (let k = 0; k < prob.length; k++) {
      if (valid && !valid[k]) continue;
      count++;
      const p = clamp(prob[k], 1e-6, 1 - 1e-6),
        y = truth[k],
        pred = prob[k] >= threshold;
      if (y && pred) tp++;
      else if (y) fn++;
      else if (pred) fp++;
      else tn++;
      brier += (prob[k] - y) ** 2;
      nll -= y * Math.log(p) + (1 - y) * Math.log(1 - p);
    }
    const ratio = (a, b) => (b ? a / b : null);
    return {
      tp,
      fp,
      fn,
      tn,
      count,
      iou: ratio(tp, tp + fp + fn),
      precision: ratio(tp, tp + fp),
      recall: ratio(tp, tp + fn),
      f1: ratio(2 * tp, 2 * tp + fp + fn),
      brier: ratio(brier, count),
      nll: ratio(nll, count),
    };
  }
  function entropy(p) {
    return p <= 0 || p >= 1
      ? 0
      : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
  }
  const api = {
    contract,
    defaults,
    clamp,
    pose,
    local,
    world,
    cell,
    rayBox,
    overlap,
    inReference,
    scan,
    evidencePlane,
    compute,
    metrics,
    sigmoid,
    entropy,
  };
  root.OGSim = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
