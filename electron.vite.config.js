"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_vite_1 = require("electron-vite");
var plugin_react_1 = require("@vitejs/plugin-react");
exports.default = (0, electron_vite_1.defineConfig)({
    main: {
        plugins: [(0, electron_vite_1.externalizeDepsPlugin)()]
    },
    preload: {
        plugins: [(0, electron_vite_1.externalizeDepsPlugin)()]
    },
    renderer: {
        plugins: [(0, plugin_react_1.default)()]
    }
});
