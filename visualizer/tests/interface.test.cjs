// Lightweight DOM/canvas harness: checks control wiring and state, NOT browser layout.
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const root = path.join(__dirname, "..");
function boot() {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8"),
    nodes = new Map(),
    all = [];
  let drawing = 0;
  function make(tag, id = "", attrs = "", offset = 0) {
    const n = {
      tag,
      id,
      attrs,
      offset,
      children: [],
      style: {},
      dataset: {},
      listeners: {},
      value: "",
      checked: false,
      disabled: false,
      hidden: false,
      width: 660,
      height: 500,
      files: [],
      className: "",
      textContent: "",
      innerHTML: "",
      classList: { toggle() {} },
      setAttribute(k, v) {
        this[k] = String(v);
      },
      append(c) {
        this.children.push(c);
      },
      replaceChildren() {
        this.children = [];
      },
      addEventListener(k, fn) {
        (this.listeners[k] ??= []).push(fn);
      },
      async dispatch(k, props = {}) {
        for (const fn of this.listeners[k] || [])
          await fn({ preventDefault() {}, ...props });
      },
      click() {
        this.onclick?.();
        return this.dispatch("click");
      },
      focus() {},
      setPointerCapture() {},
      getBoundingClientRect() {
        return { left: 0, top: 0, width: this.width, height: this.height };
      },
      getContext() {
        return new Proxy(
          { canvas: this },
          {
            get: (o, k) =>
              k in o
                ? o[k]
                : (...args) => {
                    assert(
                      !args.some(
                        (v) => typeof v === "number" && !Number.isFinite(v),
                      ),
                      "nonfinite drawing " + k,
                    );
                    drawing++;
                  },
            set: (o, k, v) => ((o[k] = v), true),
          },
        );
      },
      querySelectorAll() {
        const end = html.indexOf("</aside>", this.offset);
        return all.filter(
          (n) =>
            n.offset > this.offset &&
            n.offset < end &&
            ["input", "select", "button"].includes(n.tag),
        );
      },
    };
    Object.defineProperty(n, "selectedOptions", {
      get() {
        return this.children.filter((c) => c.value === String(this.value));
      },
    });
    return n;
  }
  for (const m of html.matchAll(/<(\w+)\b([^>]*)>/g)) {
    const tag = m[1],
      attrs = m[2],
      id = attrs.match(/\bid="([^"]+)"/)?.[1] || "";
    const n = make(tag, id, attrs, m.index);
    for (const a of ["value", "width", "height", "max", "min", "class"]) {
      const v = attrs.match(new RegExp("\\b" + a + '="([^"]+)"'))?.[1];
      if (v !== undefined)
        n[a === "class" ? "className" : a] = ["width", "height"].includes(a)
          ? Number(v)
          : v;
    }
    n.checked = /\bchecked\b/.test(attrs);
    n.hidden = /\bhidden\b/.test(attrs);
    const t = attrs.match(/data-tab="([^"]+)"/)?.[1];
    if (t) n.dataset.tab = t;
    if (tag === "select") {
      const body = html.slice(m.index).split("</select>")[0];
      for (const o of body.matchAll(
        /<option value="([^"]+)"([^>]*)>([^<]*)/g,
      )) {
        const option = make("option");
        option.value = o[1];
        option.textContent = o[3];
        n.children.push(option);
        if (o[2].includes("selected")) n.value = o[1];
      }
      if (n.value === "") n.value = n.children[0]?.value || "";
    }
    if (id) {
      assert(!nodes.has(id), "duplicate " + id);
      nodes.set(id, n);
    }
    all.push(n);
  }
  const query = (selector) =>
    selector === "[data-tab]"
      ? all.filter((n) => n.dataset.tab)
      : selector === ".tab"
        ? all.filter((n) => n.className.split(" ").includes("tab"))
        : [];
  let timerId = 0;
  const timers = new Map(),
    document = {
      getElementById: (id) => {
        assert(nodes.has(id), "missing " + id);
        return nodes.get(id);
      },
      createElement: (tag) => make(tag),
      querySelectorAll: query,
      addEventListener() {},
      body: make("body"),
    };
  const sandbox = {
    console,
    document,
    Float32Array,
    Uint8Array,
    Math,
    JSON,
    Number,
    Array,
    Blob,
    URL: { createObjectURL: () => "blob:fixture", revokeObjectURL() {} },
    requestAnimationFrame: (fn) => fn(),
    setInterval: (fn) => {
      timers.set(++timerId, fn);
      return timerId;
    },
    clearInterval: (id) => timers.delete(id),
    setTimeout: (fn) => fn(),
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ["simulation", "artifacts", "network", "render", "app"])
    vm.runInContext(
      fs.readFileSync(path.join(root, "js", file + ".js"), "utf8"),
      sandbox,
      { filename: file, timeout: 10000 },
    );
  return {
    sandbox,
    el: (id) => nodes.get(id),
    tabs: query("[data-tab]"),
    timers,
    drawing: () => drawing,
    async input(id, value, event = "input") {
      nodes.get(id).value = String(value);
      await nodes.get(id).dispatch(event);
    },
    async toggle(id, value) {
      nodes.get(id).checked = value;
      await nodes.get(id).dispatch("change");
    },
  };
}
test("scene edits propagate, undo works, timeline and display controls execute", async () => {
  const b = boot(),
    a = b.sandbox.OGApp;
  assert.equal(a.snapshot().state.objects.length, 5);
  await b.el("addPedestrian").click();
  assert.equal(a.snapshot().state.objects.length, 6);
  await b.input("velocityY", 2, "change");
  assert.equal(a.snapshot().state.objects.at(-1).vy, 2);
  await b.el("removeObject").click();
  assert.equal(a.snapshot().state.objects.length, 5);
  await b.el("undo").click();
  assert.equal(a.snapshot().state.objects.length, 6);
  await b.el("play").click();
  assert.equal(b.timers.size, 1);
  [...b.timers.values()][0]();
  assert(a.snapshot().state.time > 0);
  await b.el("play").click();
  assert.equal(b.timers.size, 0);
  await b.input("time", 1.5);
  assert.equal(a.snapshot().state.time, 1.5);
  await b.el("rewind").click();
  assert.equal(a.snapshot().state.time, -2);
  await b.input("history", 10);
  await b.input("resolution", 1, "change");
  assert.equal(a.snapshot().metrics.count, 4096);
  for (const id of [
    "compensate",
    "lidar",
    "camera",
    "layerFlow",
    "layerVelocity",
    "layerUncertainty",
    "layerErrors",
    "layerTruth",
    "layerRays",
  ]) {
    await b.toggle(id, true);
    await b.toggle(id, false);
  }
  await b.el("grid").dispatch("keydown", { key: "ArrowRight" });
  await b
    .el("scene")
    .dispatch("wheel", { clientX: 330, clientY: 250, deltaY: -100 });
  assert(b.drawing() > 10000);
});
test("guided mode, architecture stages and training lower BCE", async () => {
  const b = boot(),
    a = b.sandbox.OGApp;
  await b.el("guidedMode").click();
  assert.equal(a.snapshot().mode, "guided");
  for (let i = 0; i < 9; i++) await b.el("guideNext").click();
  assert.equal(a.snapshot().guide, 9);
  await b.el("guidePrev").click();
  assert.equal(a.snapshot().guide, 8);
  for (const tab of b.tabs) await tab.click();
  await b.tabs.find((t) => t.dataset.tab === "network").click();
  for (const architecture of ["stack", "lstm", "attention"]) {
    await b.input("architecture", architecture, "change");
    for (let i = 0; i < 4; i++) await b.el("tensorNext").click();
    await b.input("kernel", "edge", "change");
    await b.input("featureChannel", 2, "change");
  }
  await b.tabs.find((t) => t.dataset.tab === "training").click();
  await b.el("trainReset").click();
  const before = a.patchSnapshot().metrics.nll;
  await b.el("trainMany").click();
  assert(a.patchSnapshot().metrics.nll < before);
  assert.equal(a.patchSnapshot().steps, 20);
  await b.input("trainP", 0.9);
  await b.input("trainY", 0);
  b.el("trainValid").checked = false;
  await b.el("trainValid").dispatch("input");
  const old = a.patchSnapshot().logits[27];
  await b.el("trainStep").click();
  assert.equal(a.patchSnapshot().logits[27], old);
  await b.el("capturePatch").click();
  await b.el("exploreMode").click();
  assert.equal(a.snapshot().mode, "explore");
});
test("artifact import validates before switching, masks scores, locks simulation and restores it", async () => {
  const b = boot(),
    a = b.sandbox.OGApp,
    S = b.sandbox.OGSim,
    A = b.sandbox.OGArtifacts,
    s = S.defaults(),
    artifact = A.pack(s, S.compute(s));
  artifact.valid.fill(0);
  artifact.valid[0] = 1;
  const file = (json) => ({
    size: 100,
    text: async () => JSON.stringify(json),
  });
  b.el("importArtifact").files = [file(artifact)];
  await b.el("importArtifact").dispatch("change");
  assert.equal(a.snapshot().imported, true);
  assert.equal(a.snapshot().metrics.count, 1);
  assert.equal(b.el("addVehicle").disabled, true);
  assert.equal(b.el("play").disabled, true);
  b.el("importArtifact").files = [file({ schema: "invalid" })];
  await b.el("importArtifact").dispatch("change");
  assert.equal(a.snapshot().imported, true);
  assert(b.el("importStatus").textContent.includes("Not loaded"));
  await b.input("threshold", 0.8);
  assert.equal(a.snapshot().state.threshold, 0.8);
  await b.el("clearArtifact").click();
  assert.equal(a.snapshot().imported, false);
  assert.equal(b.el("addVehicle").disabled, false);
  assert.equal(a.snapshot().state.threshold, 0.5);
});
