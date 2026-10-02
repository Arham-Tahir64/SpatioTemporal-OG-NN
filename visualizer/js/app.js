/* UI orchestration. Simulation, numerical helpers and artifact validation are separate. */
(function () {
  "use strict";
  const S = OGSim,
    R = OGRender,
    N = OGNetwork,
    A = OGArtifacts,
    $ = (id) => document.getElementById(id),
    on = (id, event, fn) => $(id).addEventListener(event, fn),
    value = (id) => Number($(id).value),
    check = (id) => $(id).checked;
  let s = S.defaults(),
    data = S.compute(s),
    selected = "ego",
    selectedCell = 64 * 128 + 84,
    layer = 0,
    tab = "temporal",
    mode = "explore",
    guide = 0,
    imported = null,
    undo = [],
    nextID = 6;
  const views = {
    scene: { zoom: 1, x: 0, y: 0 },
    grid: { zoom: 1, x: 0, y: 0 },
  };
  let playback = 0,
    animation = 0,
    dirty = false;
  const layerIDs = [
    "Static",
    "Actors",
    "Truth",
    "Prediction",
    "Velocity",
    "Flow",
    "Uncertainty",
    "Errors",
    "Rays",
    "Frames",
  ];
  const layers = () =>
    Object.fromEntries(
      layerIDs.map((x) => [x.toLowerCase(), check("layer" + x)]),
    );
  function status(msg) {
    $("editStatus").textContent = msg;
  }
  function historyEdit() {
    undo.push(JSON.stringify(s));
    if (undo.length > 40) undo.shift();
    $("undo").disabled = false;
  }
  function object() {
    return selected === "ego"
      ? s.ego
      : s.objects.find((o) => o.id === selected);
  }
  function fillSelection() {
    const list = $("selection");
    list.replaceChildren();
    for (const [id, name] of [
      ["ego", "Ego vehicle"],
      ...s.objects.map((o) => [o.id, `${o.type} ${o.id}`]),
    ]) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = name;
      list.append(option);
    }
    list.value = String(selected);
    objectFields();
  }
  function objectFields() {
    const o = object();
    if (!o) return;
    for (const [id, key] of [
      ["objectX", "x"],
      ["objectY", "y"],
      ["velocityX", "vx"],
      ["velocityY", "vy"],
    ])
      $(id).value = o[key].toFixed(2);
    $("objectYaw").value = ((o.yaw * 180) / Math.PI).toFixed(0);
    $("removeObject").disabled = selected === "ego" || !!imported;
    ["velocityX", "velocityY"].forEach(
      (id) => ($(id).disabled = o.type === "obstacle" || !!imported),
    );
  }
  function syncControls() {
    for (const id of [
      "history",
      "horizon",
      "resolution",
      "architecture",
      "bias",
      "spread",
      "threshold",
    ])
      $(id).value = s[id];
    for (const id of ["lidar", "camera", "compensate"]) $(id).checked = s[id];
    $("time").value = s.time;
    fillSelection();
  }
  function selectedXY() {
    const n = data.n,
      r = 64 / n,
      i = Math.floor(selectedCell / n),
      j = selectedCell % n;
    return { i, j, x: -32 + (j + 0.5) * r, y: -32 + (i + 0.5) * r };
  }
  function inspect() {
    const { i, j, x, y } = selectedXY(),
      k = selectedCell,
      p = data.prob[k],
      valid = data.valid[k],
      pred = p >= s.threshold,
      ytrue = data.truth[k];
    $("cellName").textContent = `[${i}, ${j}]`;
    let text = `E₀ center (${x.toFixed(2)}, ${y.toFixed(2)}) m\np(actor)       ${p.toFixed(4)}\npredicted      ${pred ? "actor" : "no selected actor"}\ntruth          ${valid ? (ytrue ? "actor" : "no selected actor") : "invalid / not scored"}\nvalid mask     ${valid}\nentropy        ${S.entropy(p).toFixed(3)} bits\nerror type     ${!valid ? "not scored" : ytrue ? (pred ? "TP" : "FN") : pred ? "FP" : "TN"}\n`;
    if (!imported) {
      const track = data.tracks.find((o) => S.overlap(x, y, 64 / data.n, o));
      text += `truth class    ${data.classes[k] === 1 ? "vehicle" : data.classes[k] === 2 ? "pedestrian" : "none"}\nhit / traverse ${data.hit[k]} / ${data.traversal[k]}\ninput evidence ${data.hit[k] || data.traversal[k] ? "partial observation" : "unknown / absent"}\nvelocity       ${track ? `(${track.vx.toFixed(2)}, ${track.vy.toFixed(2)}) m/s` : "no toy track here"}\nbackward flow  ${data.flowValid[k] ? `(${data.flowX[k].toFixed(2)}, ${data.flowY[k].toFixed(2)}) m` : "no valid correspondence"}\n`;
    } else text += "sensor/class/flow not supplied\n";
    $("cellInfo").textContent = text;
    const m = S.metrics(data.prob, data.truth, data.valid, s.threshold),
      fmt = (x) => (x === null ? "null" : x.toFixed(3));
    $("metrics").innerHTML = [
      ["IoU", m.iou],
      ["Precision", m.precision],
      ["Recall", m.recall],
      ["F1", m.f1],
      ["Brier", m.brier],
      ["NLL", m.nll],
    ]
      .map(([name, v]) => `<span>${name}<b>${fmt(v)}</b></span>`)
      .join("");
    $("support").textContent =
      `${imported ? imported.artifact.kind.toUpperCase() + " ARTIFACT" : "SYNTHETIC"} · ${m.count} valid cells\nTP ${m.tp} / FP ${m.fp} / FN ${m.fn} / TN ${m.tn}. No-actor ≠ safe free space.`;
  }
  function draw() {
    const l = layers();
    if (!imported) R.scene($("scene"), s, data, views.scene, selected, l);
    R.occupancy($("grid"), s, data, views.grid, selectedCell, l, !!imported);
    inspect();
    $("timeLabel").textContent = `t = ${s.time.toFixed(2)} s`;
    $("time").value = s.time;
    $("historyLabel").textContent =
      `${s.history} / ${((s.history - 1) * 0.2).toFixed(1)} s`;
    $("biasLabel").textContent = `${s.bias.toFixed(2)} m/s`;
    $("spreadLabel").textContent = `${s.spread.toFixed(2)} m`;
    $("thresholdLabel").textContent = s.threshold.toFixed(2);
    $("sceneMeta").textContent = imported
      ? "Simulation frozen; not artifact context"
      : `${s.objects.length} objects · drag to edit`;
    $("gridMeta").textContent =
      `E₀ · ${s.horizon === 0 ? "current" : `+${s.horizon}s`} · ${data.n}²`;
    $("variant").textContent =
      s.history === 6 && s.resolution === 0.5 && s.architecture === "stack"
        ? "Proposed v1 shape settings. Predictions are still synthetic."
        : "Experimental shape/fusion settings; not the frozen v1 architecture.";
    if (tab === "temporal" && !imported) drawTemporal();
    if (tab === "network" && !imported) drawNetwork();
    if (tab === "training") drawTraining();
  }
  function update() {
    if (imported) return;
    data = S.compute(s);
    selectedCell = S.clamp(selectedCell, 0, data.n ** 2 - 1);
    draw();
  }
  function schedule() {
    if (dirty) return;
    dirty = true;
    requestAnimationFrame(() => {
      dirty = false;
      update();
    });
  }
  function showTab(name) {
    tab = name;
    document
      .querySelectorAll(".tab")
      .forEach((el) => (el.hidden = el.id !== name));
    document
      .querySelectorAll("[data-tab]")
      .forEach((el) =>
        el.setAttribute("aria-pressed", el.dataset.tab === name),
      );
    draw();
  }
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  function drawTemporal() {
    let slot = S.clamp(value("historySlot"), 0, s.history - 1);
    $("historySlot").max = s.history - 1;
    $("historySlot").value = slot;
    const f = data.frames[slot];
    $("slotLabel").textContent = `t ${(f.t - s.time || 0).toFixed(1)} s`;
    R.temporal($("aligned"), s, data, true, slot);
    R.temporal($("unaligned"), s, data, false, slot);
    R.evidence($("bev"), data, $("channel").value);
    $("channelLabel").textContent = $("channel").selectedOptions[0].textContent;
    const p = f.hits[0];
    if (p) {
      const lp = S.local(p, S.pose(s.ego, f.t)),
        ep = S.local(p, data.reference),
        k = S.cell(ep.x, ep.y, s.resolution);
      $("pointReadout").textContent =
        `First return in selected slot\nSensor: (${lp.x.toFixed(2)}, ${lp.y.toFixed(2)}) m\nWorld:  (${p.x.toFixed(2)}, ${p.y.toFixed(2)}) m\nE₀:     (${ep.x.toFixed(2)}, ${ep.y.toFixed(2)}) m\ncell:   ${k < 0 ? "outside ROI" : `[${Math.floor(k / data.n)}, ${k % data.n}]`}\np_E₀ = inverse(T_W_E₀) · T_W_Sₖ · p_Sₖ`;
    } else
      $("pointReadout").textContent =
        "No returns in this slot.\nNo observations do not certify free space.";
  }
  on("channel", "change", drawTemporal);
  on("historySlot", "input", drawTemporal);
  function drawNetwork() {
    const nodes = N.layers(s);
    layer = S.clamp(layer, 0, nodes.length - 1);
    const holder = $("networkNodes");
    holder.replaceChildren();
    nodes.forEach((node, i) => {
      const b = document.createElement("button");
      b.innerHTML = `${node.name}<small>${node.c} × ${node.h}²</small>`;
      b.style.height = 85 + (70 * node.h) / data.n + "px";
      b.setAttribute("aria-pressed", layer === i);
      b.title = node.output;
      b.onclick = () => {
        layer = i;
        drawNetwork();
      };
      holder.append(b);
    });
    const n = nodes[layer];
    $("layerName").textContent = n.name;
    $("layerDetails").textContent =
      `Input   ${n.input}\nOutput  ${n.output}\nChannels ${n.c} · spatial ${n.h} × ${n.h}\nStride on input grid: ${data.n / n.h}× (${(64 / n.h).toFixed(2)} m / feature cell)\nParameters: ${typeof n.parameters === "number" ? n.parameters.toLocaleString() + " (estimate)" : n.parameters}\n${n.equation}`;
    $("layerPurpose").textContent = n.why;
    $("architectureNote").textContent =
      s.architecture === "stack"
        ? "Proposed v1: temporal fusion happens in the first stacked convolution, before spatial encoding is complete. Parameter estimates assume bias-free 3×3 convs, GN affine weights, parameter-free downsampling and biased 1×1 heads; implementation choices are not frozen."
        : "Conceptual challenger, not implemented. Toy forecast changes to " +
          (s.architecture === "lstm"
            ? "exponentially weighted adjacent centroid velocities."
            : "recency-softmax-weighted adjacent centroid velocities.");
    $("tensorPrev").disabled = layer === 0;
    $("tensorNext").disabled = layer === nodes.length - 1;
    $("tensorChannel").max = n.c - 1;
    $("tensorChannel").value = Math.min(value("tensorChannel"), n.c - 1);
    $("tensorChannelValue").textContent =
      `${value("tensorChannel")} / ${n.c - 1}`;
    $("tensorChannel").disabled = layer !== 0 && layer !== nodes.length - 1;
    $("featureChannel").disabled = layer === 0 || layer === nodes.length - 1;
    $("kernel").disabled = layer === nodes.length - 1;
    let source = [data.hit, data.density, data.height, data.traversal][
      value("featureChannel")
    ];
    let label = $("featureChannel").selectedOptions[0].textContent;
    if (layer === 0) {
      const ch = value("tensorChannel") % 4,
        slot =
          s.architecture === "stack"
            ? Math.floor(value("tensorChannel") / 4)
            : s.history - 1,
        frame = data.frames[slot],
        ref = s.compensate ? data.reference : S.pose(s.ego, frame.t),
        planes = S.evidencePlane(frame.points, ref, s.resolution);
      source = [planes.density, planes.height, planes.hit, planes.traversal][
        ch
      ];
      label = `slot ${slot}, evidence channel ${ch}`;
    }
    if (layer === nodes.length - 1) {
      const h = S.contract.horizons[value("tensorChannel")],
        forecast = S.compute({ ...s, horizon: h });
      source = forecast.prob;
      label = `toy probability head +${h}s`;
    }

    const response =
        layer === nodes.length - 1
          ? source
          : N.convolve(source, data.n, $("kernel").value),
      down = N.downsample(response, data.n, n.h);
    R.features($("features"), down, n.h);
    $("featureTitle").textContent = `${label} → ${n.h}²`;
  }
  for (const id of ["kernel", "featureChannel", "tensorChannel"])
    on(id, id === "tensorChannel" ? "input" : "change", drawNetwork);
  on("tensorPrev", "click", () => {
    layer--;
    drawNetwork();
  });
  on("tensorNext", "click", () => {
    layer++;
    drawNetwork();
  });
  // Scene edits and history.
  on("selection", "change", () => {
    selected =
      $("selection").value === "ego" ? "ego" : Number($("selection").value);
    objectFields();
    draw();
  });
  for (const [id, key, lo, hi] of [
    ["objectX", "x", -100, 100],
    ["objectY", "y", -100, 100],
    ["velocityX", "vx", -10, 10],
    ["velocityY", "vy", -10, 10],
    ["objectYaw", "yaw", -180, 180],
  ])
    on(id, "change", () => {
      if (imported) return;
      const v = value(id);
      if (!Number.isFinite(v)) {
        objectFields();
        return;
      }
      historyEdit();
      object()[key] = S.clamp(v, lo, hi) * (key === "yaw" ? Math.PI / 180 : 1);
      objectFields();
      update();
    });
  for (const [id, type] of [
    ["addVehicle", "vehicle"],
    ["addPedestrian", "pedestrian"],
    ["addObstacle", "obstacle"],
  ])
    on(id, "click", () => {
      if (imported) return;
      if (s.objects.length >= 30) {
        status("Limit: 30 scene objects for interactive performance.");
        return;
      }
      historyEdit();
      const e = S.pose(s.ego, s.time),
        id = nextID++;
      s.objects.push({
        id,
        type,
        x: e.x + 10,
        y: e.y + 3 + (id % 5) * 2,
        vx: 0,
        vy: 0,
        yaw: 0,
        w: type === "pedestrian" ? 0.8 : type === "obstacle" ? 4 : 4.5,
        h: type === "pedestrian" ? 0.8 : type === "obstacle" ? 4 : 2,
      });
      selected = id;
      fillSelection();
      update();
      status("Object added. Drag it or edit its position and velocity.");
    });
  on("removeObject", "click", () => {
    if (imported || selected === "ego") return;
    historyEdit();
    s.objects = s.objects.filter((o) => o.id !== selected);
    selected = "ego";
    fillSelection();
    update();
  });
  function scenario() {
    stop();
    historyEdit();
    s = S.defaults();
    const name = $("scenario").value;
    if (name === "empty") s.objects = [];
    if (name === "turn") s.ego.yaw = Math.PI / 4;
    if (name === "occlusion") {
      s.objects = [
        {
          id: 1,
          type: "obstacle",
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          w: 4,
          h: 8,
          yaw: 0,
        },
        {
          id: 2,
          type: "pedestrian",
          x: 5,
          y: 0,
          vx: 0,
          vy: 1.5,
          w: 0.8,
          h: 0.8,
          yaw: 0,
        },
      ];
    }
    nextID = 6;
    selected = "ego";
    selectedCell = 64 * 128 + 84;
    views.scene = { zoom: 1, x: 0, y: 0 };
    views.grid = { zoom: 1, x: 0, y: 0 };
    syncControls();
    update();
    resetPatch();
  }
  on("scenario", "change", scenario);
  on("reset", "click", scenario);
  on("undo", "click", () => {
    if (imported || !undo.length) return;
    stop();
    s = JSON.parse(undo.pop());
    nextID = Math.max(nextID, ...s.objects.map((o) => o.id + 1));
    selected = "ego";
    syncControls();
    update();
    $("undo").disabled = !undo.length;
  });
  for (const id of [
    "history",
    "horizon",
    "resolution",
    "architecture",
    "bias",
    "spread",
    "threshold",
  ])
    on(
      id,
      ["history", "bias", "spread", "threshold"].includes(id)
        ? "input"
        : "change",
      () => {
        if (imported) {
          if (id === "threshold") {
            s.threshold = value(id);
            draw();
          }
          return;
        }
        s[id] = id === "architecture" ? $(id).value : value(id);
        if (id === "resolution") {
          selectedCell = Math.floor((64 / s.resolution) ** 2 / 2);
          views.grid = { zoom: 1, x: 0, y: 0 };
        }
        if (id === "history") $("historySlot").value = s.history - 1;
        update();
      },
    );
  for (const id of ["lidar", "camera", "compensate"])
    on(id, "change", () => {
      if (imported) return;
      s[id] = check(id);
      update();
    });
  for (const id of layerIDs)
    on("layer" + id, "change", () => {
      if (check("layer" + id) && ["Errors", "Uncertainty"].includes(id)) {
        for (const other of ["Errors", "Uncertainty"])
          if (other !== id) $("layer" + other).checked = false;
      }
      draw();
    });
  function stop() {
    clearInterval(playback);
    clearInterval(animation);
    playback = 0;
    animation = 0;
    $("play").textContent = "Play";
    $("animateHorizon").checked = false;
  }
  function setTime(t) {
    if (imported) return;
    s.time = S.clamp(t, -2, 4);
    update();
  }
  on("time", "input", () => {
    stop();
    setTime(value("time"));
  });
  on("rewind", "click", () => {
    stop();
    setTime(-2);
  });
  on("stepBack", "click", () => {
    stop();
    setTime(s.time - 0.2);
  });
  on("stepForward", "click", () => {
    stop();
    setTime(s.time + 0.2);
  });
  on("play", "click", () => {
    if (imported) return;
    if (playback) {
      stop();
      return;
    }
    playback = setInterval(
      () => setTime(s.time >= 3.99 ? -2 : s.time + 0.1),
      100,
    );
    $("play").textContent = "Pause";
  });
  on("animateHorizon", "change", () => {
    clearInterval(animation);
    if (check("animateHorizon") && !imported)
      animation = setInterval(() => {
        const h = [0, 0.5, 1, 2, 3];
        s.horizon = h[(h.indexOf(s.horizon) + 1) % h.length];
        $("horizon").value = s.horizon;
        update();
      }, 700);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  for (const [id, factor] of [
    ["zoomIn", 1.25],
    ["zoomOut", 0.8],
  ])
    on(id, "click", () => {
      for (const name of ["scene", "grid"])
        views[name].zoom = S.clamp(views[name].zoom * factor, 0.6, 8);
      draw();
    });
  on("homeView", "click", () => {
    views.scene = { zoom: 1, x: 0, y: 0 };
    views.grid = { zoom: 1, x: 0, y: 0 };
    draw();
  });
  // Pointer transforms use backing-canvas coordinates; controls provide keyboard alternatives.
  for (const id of ["scene", "grid"]) {
    const canvas = $(id);
    let drag = null;
    const pixel = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) * canvas.width) / r.width,
        y: ((e.clientY - r.top) * canvas.height) / r.height,
      };
    };
    on(id, "pointerdown", (e) => {
      if (e.button !== 0) return;
      canvas.focus();
      const p = pixel(e),
        q = R.transform(canvas, views[id]).inverse(p.x, p.y);
      if (e.shiftKey || check("panMode")) {
        drag = { kind: "pan", p, view: { ...views[id] } };
      } else if (id === "scene" && !imported) {
        const candidates = [
          { ...S.pose(s.ego, s.time), w: 4.5, h: 2, id: "ego" },
          ...s.objects.map((o) => S.pose(o, s.time)),
        ].reverse();
        const hit = candidates.find((o) => {
          const p = S.local(q, o);
          return Math.abs(p.x) < o.w / 2 + 0.8 && Math.abs(p.y) < o.h / 2 + 0.8;
        });
        if (hit) {
          selected = hit.id;
          historyEdit();
          drag = { kind: "object", offset: { x: q.x - hit.x, y: q.y - hit.y } };
          fillSelection();
          draw();
        }
      } else if (id === "grid") {
        const k = S.cell(q.x, q.y, 64 / data.n);
        if (k >= 0) {
          selectedCell = k;
          draw();
        }
      }
      canvas.setPointerCapture(e.pointerId);
    });
    on(id, "pointermove", (e) => {
      if (!drag) return;
      const p = pixel(e);
      if (drag.kind === "pan") {
        views[id].x = drag.view.x + p.x - drag.p.x;
        views[id].y = drag.view.y + p.y - drag.p.y;
        draw();
      } else {
        const q = R.transform(canvas, views[id]).inverse(p.x, p.y),
          o = object();
        o.x = S.clamp(q.x - drag.offset.x - o.vx * s.time, -100, 100);
        o.y = S.clamp(q.y - drag.offset.y - o.vy * s.time, -100, 100);
        objectFields();
        schedule();
      }
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      on(id, event, () => {
        drag = null;
      });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const p = pixel(e),
          old = R.transform(canvas, views[id]).inverse(p.x, p.y);
        views[id].zoom = S.clamp(
          views[id].zoom * Math.exp(-e.deltaY * 0.001),
          0.6,
          8,
        );
        const next = R.transform(canvas, views[id]).xy(old.x, old.y);
        views[id].x += p.x - next[0];
        views[id].y += p.y - next[1];
        draw();
      },
      { passive: false },
    );
  }
  on("grid", "keydown", (e) => {
    const moves = {
      ArrowUp: data.n,
      ArrowDown: -data.n,
      ArrowLeft: -1,
      ArrowRight: 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const { i, j } = selectedXY();
    const ii = S.clamp(
        i + (e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0),
        0,
        data.n - 1,
      ),
      jj = S.clamp(
        j + (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0),
        0,
        data.n - 1,
      );
    selectedCell = ii * data.n + jj;
    draw();
  });
  // Train a frozen 8x8 patch of independent logits.
  let patch,
    patchCell = 27,
    steps = 0,
    lossHistory = [];
  function resetPatch() {
    patch = {
      logits: new Float32Array(64),
      truth: new Uint8Array(64),
      valid: new Uint8Array(64).fill(1),
    };
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++)
        patch.truth[i * 8 + j] = i >= 2 && i <= 5 && j >= 3 && j <= 4 ? 1 : 0;
    steps = 0;
    lossHistory = [];
    patchControls();
    drawTraining();
  }
  function patchMetrics() {
    return S.metrics(
      Float32Array.from(patch.logits, S.sigmoid),
      patch.truth,
      patch.valid,
      s.threshold,
    );
  }
  function patchControls() {
    $("trainP").value = S.sigmoid(patch.logits[patchCell]);
    $("trainY").value = patch.truth[patchCell];
    $("trainValid").checked = !!patch.valid[patchCell];
  }
  function drawTraining() {
    if (!patch) return;
    const g = R.context($("trainPatch")),
      cell = 31,
      left = 95,
      top = 25;
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++) {
        const k = i * 8 + j,
          p = S.sigmoid(patch.logits[k]);
        g.fillStyle = `rgb(${25 + p * 141},${40 + p * 199},${42 + p * 138})`;
        g.fillRect(left + j * cell, top + (7 - i) * cell, cell - 2, cell - 2);
        g.strokeStyle =
          k === patchCell
            ? "white"
            : patch.truth[k]
              ? R.colors.amber
              : R.colors.grid;
        g.lineWidth = k === patchCell ? 3 : 1;
        g.strokeRect(left + j * cell, top + (7 - i) * cell, cell - 2, cell - 2);
        if (!patch.valid[k])
          R.line(
            g,
            left + j * cell,
            top + (8 - i) * cell - 2,
            left + (j + 1) * cell - 2,
            top + (7 - i) * cell,
            R.colors.red,
          );
      }
    R.text(g, "Amber outlines = target 1 · slash = invalid", 35, 302);
    const plot = R.context($("lossPlot")),
      y = patch.truth[patchCell];
    for (let t = 0; t <= 4; t++) {
      R.line(plot, 40, 185 - t * 35, 490, 185 - t * 35, R.colors.grid);
      R.text(plot, String(t), 18, 190 - t * 35);
    }
    plot.beginPath();
    for (let k = 1; k < 100; k++) {
      const p = k / 100,
        l = -y * Math.log(p) - (1 - y) * Math.log(1 - p),
        x = 40 + p * 450,
        yy = 185 - l * 35;
      k === 1 ? plot.moveTo(x, yy) : plot.lineTo(x, yy);
    }
    plot.strokeStyle = R.colors.green;
    plot.stroke();
    const p = S.sigmoid(patch.logits[patchCell]),
      bce =
        -y * Math.log(Math.max(p, 1e-9)) -
        (1 - y) * Math.log(Math.max(1 - p, 1e-9));
    plot.fillStyle = R.colors.amber;
    plot.beginPath();
    plot.arc(40 + p * 450, 185 - bce * 35, 5, 0, 2 * Math.PI);
    plot.fill();
    R.text(plot, "p = 0", 40, 210);
    R.text(plot, "p = 1", 450, 210);
    R.text(plot, "Patch mean BCE across updates", 40, 243);
    if (lossHistory.length) {
      const max = Math.max(1, ...lossHistory.filter(Number.isFinite));
      lossHistory.forEach((v, i) => {
        if (i && v !== null && lossHistory[i - 1] !== null)
          R.line(
            plot,
            40 + ((i - 1) * 450) / Math.max(1, lossHistory.length - 1),
            302 - (lossHistory[i - 1] / max) * 45,
            40 + (i * 450) / Math.max(1, lossHistory.length - 1),
            302 - (v / max) * 45,
            R.colors.green,
            2,
          );
      });
    }
    const m = patchMetrics(),
      f = (v) => (v === null ? "null" : v.toFixed(4));
    $("trainSteps").textContent = `${steps} updates`;
    $("lrLabel").textContent = value("learningRate").toFixed(1);
    $("trainingReadout").textContent =
      `Cell [${Math.floor(patchCell / 8)}, ${patchCell % 8}] · p=${p.toFixed(4)} · y=${y} · valid=${patch.valid[patchCell]}\nBCE contribution=${patch.valid[patchCell] ? bce.toFixed(4) : "0 (masked)"} · dL/dz=${patch.valid[patchCell] ? (p - y).toFixed(4) : "0 (masked)"}\nPatch NLL=${f(m.nll)} · IoU=${f(m.iou)} · precision=${f(m.precision)} · recall=${f(m.recall)} · F1=${f(m.f1)} · valid=${m.count}`;
  }
  on("trainPatch", "click", (e) => {
    const r = $("trainPatch").getBoundingClientRect(),
      x = ((e.clientX - r.left) * 440) / r.width,
      y = ((e.clientY - r.top) * 320) / r.height,
      j = Math.floor((x - 95) / 31),
      i = 7 - Math.floor((y - 25) / 31);
    if (i >= 0 && i < 8 && j >= 0 && j < 8) {
      patchCell = i * 8 + j;
      patchControls();
      drawTraining();
    }
  });
  on("trainPatch", "keydown", (e) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
      return;
    e.preventDefault();
    let i = Math.floor(patchCell / 8),
      j = patchCell % 8;
    i = S.clamp(
      i + (e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0),
      0,
      7,
    );
    j = S.clamp(
      j + (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0),
      0,
      7,
    );
    patchCell = i * 8 + j;
    patchControls();
    drawTraining();
  });
  function train(count) {
    if (!patch.valid.some(Boolean)) {
      status("No valid supervision in patch; gradient step rejected.");
      return;
    }
    if (!lossHistory.length) lossHistory.push(patchMetrics().nll);
    for (let n = 0; n < count; n++) {
      for (let k = 0; k < 64; k++)
        if (patch.valid[k])
          patch.logits[k] -=
            value("learningRate") *
            (S.sigmoid(patch.logits[k]) - patch.truth[k]);
      steps++;
      lossHistory.push(patchMetrics().nll);
    }
    patchControls();
    drawTraining();
  }
  on("trainStep", "click", () => train(1));
  on("trainMany", "click", () => train(20));
  on("trainReset", "click", resetPatch);
  on("learningRate", "input", drawTraining);
  for (const id of ["trainP", "trainY", "trainValid"])
    on(id, "input", () => {
      patch.logits[patchCell] = Math.log(
        value("trainP") / (1 - value("trainP")),
      );
      patch.truth[patchCell] = value("trainY");
      patch.valid[patchCell] = Number(check("trainValid"));
      lossHistory = [];
      steps = 0;
      drawTraining();
    });
  on("capturePatch", "click", () => {
    const { i, j } = selectedXY();
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const ii = i + y - 4,
          jj = j + x - 4,
          k = y * 8 + x,
          inside = ii >= 0 && ii < data.n && jj >= 0 && jj < data.n,
          src = ii * data.n + jj,
          p = inside ? S.clamp(data.prob[src], 0.001, 0.999) : 0.5;
        patch.logits[k] = Math.log(p / (1 - p));
        patch.truth[k] = inside ? data.truth[src] : 0;
        patch.valid[k] = inside ? data.valid[src] : 0;
      }
    steps = 0;
    lossHistory = [];
    patchControls();
    drawTraining();
    status("Captured an 8×8 patch around the inspected cell.");
  });
  // Ten-stage guided sequence: changes real display state; does not invent a new network order.
  const guides = [
    [
      "Raw sensors",
      "Move an actor, then toggle LiDAR. Rays stop at the nearest surface; cells behind that return receive no new evidence. RGB is visualization only.",
      "temporal",
      () => {
        $("layerRays").checked = true;
      },
    ],
    [
      "Coordinate transformations",
      "Select a history slot. The readout transforms the same point from sensor → world → E₀. Rotate the ego heading in the editor and watch coordinates change.",
      "temporal",
      () => {
        $("layerFrames").checked = true;
      },
    ],
    [
      "Ego-motion compensation",
      "Compare the two history panels. Turn compensation off to feed misregistered observations into the toy tracker; even stationary actors may acquire apparent velocity.",
      "temporal",
      () => {
        $("compensate").checked = true;
        s.compensate = true;
      },
    ],
    [
      "BEV construction",
      "Switch among hit, density, height and traversal channels. Inspect a cell: missing evidence is distinct from a valid empty actor label.",
      "temporal",
      () => {
        $("channel").value = "traversal";
      },
    ],
    [
      "Spatial encoding",
      "Follow the sample tensor through the encoder. A toy convolution and downsampling operate on live sensor evidence; the U-Net weights do not exist yet.",
      "network",
      () => {
        layer = s.architecture === "stack" ? 2 : 1;
      },
    ],
    [
      "Temporal fusion",
      "Compare stack, ConvLSTM and attention. In the proposed baseline, temporal mixing already happens at the first stacked convolution; a separate later fusion block would describe a challenger.",
      "network",
      () => {
        layer = 0;
      },
    ],
    [
      "Current occupancy",
      "Set the horizon to zero. The current head estimates actor footprints from partial returns. Static structures remain a separate layer.",
      "training",
      () => {
        s.horizon = 0;
        $("horizon").value = 0;
        $("layerErrors").checked = false;
      },
    ],
    [
      "Future occupancy",
      "At +2 seconds, compare predictions with truth. Change history length, actor velocity or the horizon and inspect how the future moves.",
      "training",
      () => {
        s.horizon = 2;
        $("horizon").value = 2;
        $("layerTruth").checked = true;
      },
    ],
    [
      "Loss and gradient",
      "Select a training cell, make a confident mistake, then take gradient steps. The cell logit moves toward its label; invalid labels contribute no gradient.",
      "training",
      () => {},
    ],
    [
      "Evaluation",
      "Overlay errors and adjust threshold. TP/FP/FN change; Brier and NLL do not. True negatives indicate no selected actor, not safe free space.",
      "training",
      () => {
        $("layerErrors").checked = true;
      },
    ],
  ];
  function applyGuide() {
    const g = guides[guide];
    $("guideCount").textContent = `${guide + 1} / ${guides.length}`;
    $("guideTitle").textContent = g[0];
    $("guideText").textContent = g[1];
    $("guidePrev").disabled = guide === 0;
    $("guideNext").disabled = guide === guides.length - 1;
    g[3]();
    showTab(g[2]);
    update();
  }
  function setMode(next) {
    if (imported && next === "guided") {
      status("Return to simulation before using Guided mode.");
      return;
    }
    mode = next;
    $("guided").hidden = next !== "guided";
    $("exploreMode").setAttribute("aria-pressed", next === "explore");
    $("guidedMode").setAttribute("aria-pressed", next === "guided");
    if (next === "guided") {
      stop();
      applyGuide();
    }
  }
  on("exploreMode", "click", () => setMode("explore"));
  on("guidedMode", "click", () => setMode("guided"));
  on("guidePrev", "click", () => {
    guide = Math.max(0, guide - 1);
    applyGuide();
  });
  on("guideNext", "click", () => {
    guide = Math.min(guides.length - 1, guide + 1);
    applyGuide();
  });
  const phaseNames = [
    "Foundations & contract",
    "Synchronized data & visualization",
    "Evaluation & classical baselines",
    "Single-frame current / forecast controls",
    "Temporal actor forecasting v1",
    "Targeted extensions (optional)",
    "Frozen evaluation & optimization",
    "Replay / live demo",
  ];
  phaseNames.forEach((name, i) => {
    const div = document.createElement("div");
    div.className = "phase";
    div.innerHTML = `<strong>${i}</strong><span>${name}</span><small>${i === 0 ? "Current · study / planning" : i === 5 ? "Optional after 4" : `Not started · after ${i === 6 ? "4 (+ optional 5)" : i - 1}`}</small>`;
    $("phaseList").append(div);
  });
  function download(obj, name) {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(obj)], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  on("exportArtifact", "click", () => {
    if (!imported)
      download(A.pack(s, data), "synthetic-occupancy-inspection.json");
  });
  function lockImport(locked) {
    document.body.classList.toggle("imported", locked);
    $("sceneTools")
      .querySelectorAll("input,select,button")
      .forEach((el) => (el.disabled = locked));
    for (const id of [
      "historySlot",
      "channel",
      "architecture",
      "bias",
      "spread",
      "time",
      "play",
      "rewind",
      "stepBack",
      "stepForward",
      "animateHorizon",
      "undo",
      "guidedMode",
      "exportArtifact",
    ])
      $(id).disabled = locked;
    document.querySelectorAll("[data-tab]").forEach((b) => {
      if (["temporal", "network"].includes(b.dataset.tab)) b.disabled = locked;
    });
    for (const name of [
      "Static",
      "Actors",
      "Velocity",
      "Flow",
      "Rays",
      "Frames",
    ])
      $("layer" + name).disabled = locked;
    if (!locked) {
      objectFields();
      $("undo").disabled = !undo.length;
    }
  }
  on("importArtifact", "change", async () => {
    const file = $("importArtifact").files[0];
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("File exceeds 8 MiB.");
      const artifact = JSON.parse(await file.text()),
        parsed = A.validate(artifact);
      stop();
      setMode("explore");
      if (!imported) imported = { saved: JSON.parse(JSON.stringify(s)) };
      imported.artifact = artifact;
      data = parsed;
      s.time = artifact.anchor_time;
      s.horizon = artifact.horizon_s;
      s.resolution = artifact.grid.resolution;
      selectedCell = Math.floor(data.n ** 2 / 2);
      views.grid = { zoom: 1, x: 0, y: 0 };
      lockImport(true);
      $("sourceBanner").textContent =
        `${artifact.kind.toUpperCase()} ARTIFACT · ${artifact.provenance.source} · provenance supplied, not independently verified`;
      $("artifactInfo").textContent = JSON.stringify(
        {
          kind: artifact.kind,
          provenance: artifact.provenance,
          grid: artifact.grid,
          anchor_time: artifact.anchor_time,
          horizon_s: artifact.horizon_s,
        },
        null,
        2,
      );
      $("importStatus").textContent =
        "Validated and loaded. Grid and metrics now use imported arrays.";
      showTab("artifacts");
    } catch (e) {
      $("importStatus").textContent = `Not loaded: ${e.message}`;
    } finally {
      $("importArtifact").value = "";
    }
  });
  on("clearArtifact", "click", () => {
    if (!imported) return;
    s = imported.saved;
    imported = null;
    lockImport(false);
    $("sourceBanner").textContent =
      "SYNTHETIC LAB · editable geometry + sensor-conditioned toy forecasts · no trained network";
    $("artifactInfo").textContent = "No artifact loaded.";
    $("importStatus").textContent = "Returned to editable simulation.";
    syncControls();
    update();
  });
  syncControls();
  $("undo").disabled = true;
  resetPatch();
  draw();
  // Expose read-only snapshots and numerical helpers for integration tests, not hidden UI controls.
  window.OGApp = {
    snapshot: () => ({
      state: JSON.parse(JSON.stringify(s)),
      selectedCell,
      selected,
      tab,
      mode,
      guide,
      imported: !!imported,
      metrics: S.metrics(data.prob, data.truth, data.valid, s.threshold),
    }),
    patchSnapshot: () => ({
      steps,
      metrics: patchMetrics(),
      logits: Array.from(patch.logits),
      valid: Array.from(patch.valid),
    }),
  };
})();
