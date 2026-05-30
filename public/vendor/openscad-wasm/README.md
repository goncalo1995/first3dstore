# OpenSCAD WASM runtime

Place the browser OpenSCAD runtime files here:

- `openscad.js`
- `openscad.wasm` when using a split WASM build
- optional runtime helpers such as fonts or MCAD files required by the selected build

The currently vendored `openscad-wasm@0.0.4` package embeds the WASM payload
inside `openscad.js`, so there is no separate `.wasm` file in this folder yet.
The preview worker still provides a `locateFile` override for future split
builds.

Application code must load runtime files via public URLs such as
`/vendor/openscad-wasm/openscad.js` or `/vendor/openscad-wasm/openscad.wasm`.
Do not import `.wasm` from TypeScript, React, API routes, or Web Workers.
