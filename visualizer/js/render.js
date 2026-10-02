(function (root) {
  "use strict";
  const S = root.OGSim;
  const colors = {
    bg: "#182326",
    grid: "#2d3e41",
    ink: "#e5eeec",
    muted: "#a8bdba",
    green: "#a6efb4",
    blue: "#88bce6",
    amber: "#efbd79",
    red: "#ec9292",
  };
  function context(canvas) {
    const g = canvas.getContext("2d");
    g.fillStyle = colors.bg;
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.font = "12px system-ui";
    return g;
  }
  function transform(canvas, view = { zoom: 1, x: 0, y: 0 }) {
    const scale =
        (Math.min(canvas.width - 40, canvas.height - 40) / 64) * view.zoom,
      cx = canvas.width / 2 + view.x,
      cy = canvas.height / 2 + view.y;
    return {
      scale,
      xy: (x, y) => [cx + x * scale, cy - y * scale],
      inverse: (x, y) => ({ x: (x - cx) / scale, y: (cy - y) / scale }),
    };
  }
  function line(g, x1, y1, x2, y2, color, width = 1) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  function arrow(g, a, b, color) {
    line(g, ...a, ...b, color, 1.5);
    const d = Math.atan2(b[1] - a[1], b[0] - a[0]);
    line(
      g,
      ...b,
      b[0] - 7 * Math.cos(d - 0.4),
      b[1] - 7 * Math.sin(d - 0.4),
      color,
    );
    line(
      g,
      ...b,
      b[0] - 7 * Math.cos(d + 0.4),
      b[1] - 7 * Math.sin(d + 0.4),
      color,
    );
  }
  function text(g, s, x, y, color = colors.muted) {
    g.fillStyle = color;
    g.fillText(s, x, y);
  }
  function axes(g, m, pose = { x: 0, y: 0, yaw: 0 }, name = "E₀") {
    const a = m.xy(pose.x, pose.y);
    arrow(
      g,
      a,
      m.xy(pose.x + 5 * Math.cos(pose.yaw), pose.y + 5 * Math.sin(pose.yaw)),
      colors.amber,
    );
    arrow(
      g,
      a,
      m.xy(pose.x - 5 * Math.sin(pose.yaw), pose.y + 5 * Math.cos(pose.yaw)),
      colors.blue,
    );
    text(g, name + " x→ / y↑", a[0] + 8, a[1] + 17);
  }
  function gridLines(g, m) {
    for (let x = -32; x <= 32; x += 8) {
      line(g, ...m.xy(x, -32), ...m.xy(x, 32), colors.grid);
      line(g, ...m.xy(-32, x), ...m.xy(32, x), colors.grid);
    }
    text(g, "+x right · +y up", 12, 20);
  }
  function box(g, m, o, color, fill = false) {
    const p = m.xy(o.x, o.y);
    g.save();
    g.translate(...p);
    g.rotate(-o.yaw);
    g.strokeStyle = color;
    g.lineWidth = 1.6;
    g.fillStyle = color;
    if (fill) {
      g.globalAlpha = 0.18;
      g.fillRect(
        (-o.w * m.scale) / 2,
        (-o.h * m.scale) / 2,
        o.w * m.scale,
        o.h * m.scale,
      );
      g.globalAlpha = 1;
    }
    g.strokeRect(
      (-o.w * m.scale) / 2,
      (-o.h * m.scale) / 2,
      o.w * m.scale,
      o.h * m.scale,
    );
    g.restore();
  }
  function heat(g, m, values, n, colorFn, valid) {
    const r = 64 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const k = i * n + j,
          p = m.xy(-32 + j * r, -32 + (i + 1) * r),
          color = colorFn(values[k], k);
        if (!color) continue;
        g.fillStyle = color;
        g.fillRect(...p, r * m.scale + 0.2, r * m.scale + 0.2);
        if (valid && !valid[k]) {
          line(
            g,
            p[0],
            p[1] + r * m.scale,
            p[0] + r * m.scale,
            p[1],
            colors.muted,
          );
        }
      }
  }
  function scene(canvas, s, d, view, selected, layers) {
    const g = context(canvas),
      m = transform(canvas, view);
    gridLines(g, m);
    const e = S.pose(s.ego, s.time);
    if (s.camera) {
      const a = m.xy(e.x, e.y),
        p1 = m.xy(
          e.x + 24 * Math.cos(e.yaw - 0.52),
          e.y + 24 * Math.sin(e.yaw - 0.52),
        ),
        p2 = m.xy(
          e.x + 24 * Math.cos(e.yaw + 0.52),
          e.y + 24 * Math.sin(e.yaw + 0.52),
        );
      g.fillStyle = "#efbd7912";
      g.beginPath();
      g.moveTo(...a);
      g.lineTo(...p1);
      g.lineTo(...p2);
      g.closePath();
      g.fill();
      line(g, ...a, ...p1, "#efbd7955");
      line(g, ...a, ...p2, "#efbd7955");
    }
    for (const o of s.objects) {
      const p = S.pose(o, s.time);
      box(
        g,
        m,
        p,
        o.id === selected
          ? colors.ink
          : o.type === "obstacle"
            ? colors.blue
            : colors.green,
        true,
      );
      const q = m.xy(p.x, p.y);
      text(g, `${o.type[0].toUpperCase()}${o.id}`, q[0] + 7, q[1] - 8);
      if (layers.velocity && o.type !== "obstacle")
        arrow(g, q, m.xy(p.x + o.vx, p.y + o.vy), colors.green);
    }
    box(
      g,
      m,
      { ...e, w: 4.5, h: 2 },
      selected === "ego" ? colors.ink : colors.amber,
      true,
    );
    const ep = m.xy(e.x, e.y);
    text(g, "EGO", ep[0] - 12, ep[1] + 24, colors.amber);
    for (const p of d.frames.at(-1).hits) {
      const a = m.xy(p.x, p.y);
      if (layers.rays)
        line(g, ...m.xy(p.origin.x, p.origin.y), ...a, "#a6efb42a");
      g.fillStyle = colors.green;
      g.fillRect(a[0] - 1.5, a[1] - 1.5, 3, 3);
    }
    if (layers.frames) {
      axes(g, m, { x: 0, y: 0, yaw: 0 }, "W");
      axes(g, m, e, "Ego");
    }
  }
  function occupancy(canvas, s, d, view, selected, layers, imported) {
    const g = context(canvas),
      m = transform(canvas, view),
      r = 64 / d.n;
    let label = "Prediction";
    if (layers.errors) {
      label = "Errors";
      heat(
        g,
        m,
        d.prob,
        d.n,
        (p, k) =>
          !d.valid[k]
            ? "#333b40"
            : d.truth[k]
              ? p >= s.threshold
                ? colors.green
                : colors.amber
              : p >= s.threshold
                ? colors.red
                : "#1d2b2f",
        d.valid,
      );
    } else if (layers.uncertainty) {
      label = "Binary entropy";
      heat(
        g,
        m,
        d.prob,
        d.n,
        (p) => `rgba(239,189,121,${S.entropy(p)})`,
        d.valid,
      );
    } else if (layers.prediction) {
      heat(
        g,
        m,
        d.prob,
        d.n,
        (p) => `rgb(${24 + p * 142},${36 + p * 203},${38 + p * 142})`,
        d.valid,
      );
    }
    if (!imported && layers.static)
      heat(g, m, d.staticGrid, d.n, (v) => (v ? "#88bce660" : null));
    if (layers.truth)
      heat(g, m, d.truth, d.n, (v, k) =>
        v && d.valid[k] ? "#efbd7980" : null,
      );
    gridLines(g, m);
    if (!imported) {
      if (layers.actors)
        for (const o of s.objects.filter((o) => o.type !== "obstacle"))
          box(
            g,
            m,
            S.inReference(S.pose(o, s.time), d.reference),
            colors.green,
          );
      if (layers.velocity)
        for (const o of d.tracks)
          arrow(g, m.xy(o.x, o.y), m.xy(o.x + o.vx, o.y + o.vy), colors.blue);
      if (layers.flow) {
        for (let i = 0; i < d.n; i += 3)
          for (let j = 0; j < d.n; j += 3) {
            const k = i * d.n + j;
            if (d.flowValid[k]) {
              const x = -32 + (j + 0.5) * r,
                y = -32 + (i + 0.5) * r;
              arrow(
                g,
                m.xy(x, y),
                m.xy(x + d.flowX[k], y + d.flowY[k]),
                colors.amber,
              );
            }
          }
      }
      if (layers.frames) axes(g, m);
    }
    const i = Math.floor(selected / d.n),
      j = selected % d.n,
      p = m.xy(-32 + j * r, -32 + (i + 1) * r);
    g.strokeStyle = "white";
    g.lineWidth = 2;
    g.strokeRect(...p, r * m.scale, r * m.scale);
    text(g, `${label} · ${d.n}² · ${r}m`, 12, canvas.height - 12);
  }
  function temporal(canvas, s, d, aligned, slot) {
    const g = context(canvas),
      m = transform(canvas);
    gridLines(g, m);
    d.frames.forEach((f, k) => {
      g.globalAlpha = k === slot ? 1 : 0.18;
      for (const p of f.hits) {
        const q = S.local(p, aligned ? d.reference : S.pose(s.ego, f.t)),
          a = m.xy(q.x, q.y);
        g.fillStyle = k === slot ? colors.green : colors.blue;
        g.fillRect(a[0] - 1.5, a[1] - 1.5, 3, 3);
      }
    });
    g.globalAlpha = 1;
    axes(g, m);
  }
  function evidence(canvas, d, channel) {
    const g = context(canvas),
      m = transform(canvas);
    heat(g, m, d[channel], d.n, (p) =>
      p ? `rgba(166,239,180,${0.15 + 0.85 * p})` : null,
    );
    gridLines(g, m);
  }
  function features(canvas, values, n) {
    const g = context(canvas),
      m = transform(canvas);
    heat(g, m, values, n, (v) =>
      v < 0
        ? `rgba(136,188,230,${Math.min(1, Math.abs(v))})`
        : `rgba(166,239,180,${Math.min(1, v)})`,
    );
    gridLines(g, m);
  }
  root.OGRender = {
    context,
    transform,
    line,
    arrow,
    text,
    colors,
    scene,
    occupancy,
    temporal,
    evidence,
    features,
  };
})(globalThis);
