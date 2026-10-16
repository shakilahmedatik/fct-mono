const fs = require("fs");
const path = require("path");

const toggleFile = path.resolve(__dirname, "../../../packages/ui/src/theme/theme-toggle.tsx");
const content = fs.readFileSync(toggleFile, "utf8");

const checks = [
  { name: "role=menu", pass: content.includes('role="menu"') },
  { name: "aria-orientation=vertical", pass: content.includes('aria-orientation="vertical"') },
  { name: "role=menuitemradio", pass: content.includes('role="menuitemradio"') },
  { name: "aria-checked", pass: content.includes("aria-checked={isSelected}") },
  { name: "roving tabIndex", pass: content.includes("tabIndex={activeIndex === index ? 0 : -1}") },
  { name: "handle ArrowDown", pass: content.includes('"ArrowDown"') },
  { name: "handle ArrowUp", pass: content.includes('"ArrowUp"') },
  { name: "handle Home", pass: content.includes('"Home"') },
  { name: "handle End", pass: content.includes('"End"') },
  { name: "handle Escape", pass: content.includes('"Escape"') },
  { name: "handle Tab", pass: content.includes('"Tab"') },
  { name: "focus-visible ring on menu items", pass: content.includes("focus-visible:ring-2 focus-visible:ring-ring") },
  { name: "openMenuWithFocus", pass: content.includes("openMenuWithFocus") }
];

console.log("ThemeToggle WAI-ARIA checks:");
let allPass = true;
for (const c of checks) {
  console.log(`  ${c.pass ? "PASS" : "FAIL"}: ${c.name}`);
  if (!c.pass) allPass = false;
}
console.log("Overall ThemeToggle compliance:", allPass ? "CLEAN" : "FAIL");
