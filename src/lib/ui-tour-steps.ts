export type UiTourStep = {
  id: string;
  target: string;
  title: string;
  body: string;
  /** Route to navigate to before highlighting this step. */
  route?: string;
  /** Keep the mobile drawer open for sidebar targets. */
  sidebar?: boolean;
  placement?: "right" | "bottom" | "top" | "left";
};

export const UI_TOUR_STEPS: UiTourStep[] = [
  {
    id: "welcome",
    target: '[data-tour="dashboard-greeting"]',
    title: "Welcome to Atlas",
    body: "This is your home base — stats, recent recordings, and quick actions live here.",
    route: "/dashboard",
    placement: "bottom",
  },
  {
    id: "nav-dashboard",
    target: '[data-tour="nav-dashboard"]',
    title: "Dashboard",
    body: "Jump back here anytime to see your library and recording streak.",
    route: "/dashboard",
    sidebar: true,
    placement: "right",
  },
  {
    id: "nav-upload",
    target: '[data-tour="nav-upload"]',
    title: "Record a lecture",
    body: "Start here when class begins. Atlas listens and writes the notes for you.",
    route: "/upload",
    sidebar: true,
    placement: "right",
  },
  {
    id: "upload-modes",
    target: '[data-tour="capture-modes"]',
    title: "Record or upload",
    body: "Record live in your browser, or upload an existing audio file from your device.",
    route: "/upload",
    placement: "bottom",
  },
  {
    id: "upload-recorder",
    target: '[data-tour="capture-recorder"]',
    title: "Hit record",
    body: "Press the mic when you're ready. You can pause, resume, and leave the page — your session stays alive.",
    route: "/upload",
    placement: "top",
  },
  {
    id: "nav-settings",
    target: '[data-tour="nav-settings"]',
    title: "Settings",
    body: "Update your profile, privacy preferences, and account details.",
    route: "/settings",
    sidebar: true,
    placement: "right",
  },
  {
    id: "settings-profile",
    target: '[data-tour="settings-profile"]',
    title: "Your profile",
    body: "Atlas uses your program and year to personalize notes. Changes save automatically.",
    route: "/settings",
    placement: "bottom",
  },
  {
    id: "theme",
    target: '[data-tour="theme-selector"]',
    title: "Theme",
    body: "Tap to cycle between system, light, and dark. Pick what feels right for late-night study sessions.",
    route: "/dashboard",
    sidebar: true,
    placement: "right",
  },
];
