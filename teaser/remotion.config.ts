import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Crisp text + smooth gradients for a 1080p marketing render.
Config.setChromiumOpenGlRenderer("angle");
