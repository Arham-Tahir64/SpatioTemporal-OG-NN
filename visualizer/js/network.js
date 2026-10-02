(function (root) {
  "use strict";
  function layers(s) {
    const n = 64 / s.resolution,
      t = s.history;
    // Parameter estimates assume bias-free Conv2d + affine GN8, two convs/block;
    // parameter-free downsampling, concatenated skips, biased 1x1 heads.
    const conv = (i, o, k = 3) => i * o * k * k,
      block = (i, o) => conv(i, o) + conv(o, o) + 4 * o;
    if (s.architecture !== "stack") {
      const recurrent = s.architecture === "lstm";
      return [
        {
          name: "Input",
          input: `[B,${t},4,${n},${n}]`,
          output: `[B,${t},4,${n},${n}]`,
          c: 4,
          h: n,
          parameters: "0",
          why: "Only causal historical evidence enters the model.",
          equation: "six v1 slots; explore mode may vary T",
        },
        {
          name: "Shared encoder",
          input: `[B×${t},4,${n},${n}]`,
          output: `[B,${t},128,${n / 4},${n / 4}]`,
          c: 128,
          h: n / 4,
          parameters: "Not specified for this challenger",
          why: "Encode spatial features per frame with shared weights.",
          equation: "fₖ = Encoder(xₖ)",
        },
        {
          name: recurrent ? "ConvLSTM" : "Temporal attention",
          input: `[B,${t},128,${n / 4},${n / 4}]`,
          output: `[B,128,${n / 4},${n / 4}]`,
          c: 128,
          h: n / 4,
          parameters: "Depends on unselected gates / head configuration",
          why: recurrent
            ? "Gates update hidden and cell memory, oldest to newest."
            : "Combine historical bottleneck features using content, time and position.",
          equation: recurrent
            ? "cₖ=fₖ⊙cₖ₋₁+iₖ⊙gₖ; hₖ=oₖ⊙tanh(cₖ)"
            : "Attention(Q,K,V)=softmax(QKᵀ/√d + mask)V",
        },
        {
          name: "Decoder",
          input: `[B,128,${n / 4},${n / 4}] + skips`,
          output: `[B,32,${n},${n}]`,
          c: 32,
          h: n,
          parameters: "Not frozen",
          why: "Recover full spatial resolution with current-frame skips.",
          equation: "upsample → concatenate → refine",
        },
        {
          name: "Heads",
          input: `[B,32,${n},${n}]`,
          output: `future [B,4,${n},${n}]; current [B,1,${n},${n}]`,
          c: 4,
          h: n,
          parameters: "165 if using 32-channel biased 1×1 heads",
          why: "Keep the same forecasting task for a controlled comparison.",
          equation: "pₕ = sigmoid(zₕ), independent horizons",
        },
      ];
    }
    const defs = [
      [
        "Stack",
        t * 4,
        n,
        0,
        "Time-major flattening; the first convolution mixes temporal slots.",
        "[B,T,C,H,W] → [B,T×C,H,W]",
      ],
      [
        "Encoder 0",
        32,
        n,
        block(t * 4, 32),
        "Full-resolution localization; save this skip for decoder 0.",
        "2 × (3×3 Conv → GN8 → SiLU)",
      ],
      [
        "Encoder 1",
        64,
        n / 2,
        block(32, 64),
        "Downsample by two to expand spatial context.",
        "downsample 2× → convolution block",
      ],
      [
        "Encoder 2",
        128,
        n / 4,
        block(64, 128),
        "Quarter-resolution features; save an encoder skip.",
        "downsample 2× → convolution block",
      ],
      [
        "Bottleneck",
        256,
        n / 8,
        block(128, 256),
        "Most spatial context, smallest feature plane.",
        "downsample 2× → convolution block",
      ],
      [
        "Decoder 2",
        128,
        n / 4,
        block(256 + 128, 128),
        "Fuse coarse context with encoder 2 localization.",
        "bilinear ↑ + concatenate skip → block",
      ],
      [
        "Decoder 1",
        64,
        n / 2,
        block(128 + 64, 64),
        "Recover medium-scale localization.",
        "bilinear ↑ + concatenate skip → block",
      ],
      [
        "Decoder 0",
        32,
        n,
        block(64 + 32, 32),
        "Restore original spatial resolution.",
        "bilinear ↑ + concatenate skip → block",
      ],
      [
        "Heads",
        4,
        n,
        32 * 4 + 4 + 32 + 1,
        "Predict four future logits and a separate auxiliary current logit.",
        "1×1 Conv; sigmoid at inference, no horizon softmax",
      ],
    ];
    return defs.map((d, i) => ({
      name: d[0],
      input:
        i === 0
          ? `[B,${t},4,${n},${n}]`
          : i >= 5 && i <= 7
            ? `[B,${defs[i - 1][1] + defs[8 - i][1]},${d[2]},${d[2]}] after upsample + skip`
            : `[B,${defs[i - 1][1]},${i >= 2 && i <= 4 ? d[2] : defs[i - 1][2]},${i >= 2 && i <= 4 ? d[2] : defs[i - 1][2]}]${i >= 2 && i <= 4 ? " after downsample" : ""}`,
      output: `[B,${d[1]},${d[2]},${d[2]}]${i === 8 ? ` + current [B,1,${n},${n}]` : ""}`,
      c: d[1],
      h: d[2],
      parameters: d[3],
      why: d[4],
      equation: d[5],
    }));
  }
  function convolve(input, n, kernel) {
    const kernels = {
        identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
        blur: Array(9).fill(1 / 9),
        edge: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
      },
      weights = kernels[kernel],
      out = new Float32Array(n * n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        for (let j = -1; j <= 1; j++)
          for (let i = -1; i <= 1; i++) {
            const xx = x + i,
              yy = y + j;
            if (xx >= 0 && xx < n && yy >= 0 && yy < n)
              out[y * n + x] +=
                input[yy * n + xx] * weights[(j + 1) * 3 + i + 1];
          }
    return out;
  }
  function downsample(input, n, target) {
    const out = new Float32Array(target * target),
      scale = n / target;
    for (let i = 0; i < target; i++)
      for (let j = 0; j < target; j++) {
        let sum = 0,
          count = 0;
        for (let y = Math.floor(i * scale); y < Math.ceil((i + 1) * scale); y++)
          for (
            let x = Math.floor(j * scale);
            x < Math.ceil((j + 1) * scale);
            x++
          ) {
            sum += input[Math.min(n - 1, y) * n + Math.min(n - 1, x)];
            count++;
          }
        out[i * target + j] = sum / count;
      }
    return out;
  }
  root.OGNetwork = { layers, convolve, downsample };
  if (typeof module !== "undefined") module.exports = root.OGNetwork;
})(globalThis);
