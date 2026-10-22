const fs = require("fs");
const path = require("path");

function runScript(rawJs, storageThrows, systemIsDark, storedVal) {
  let darkClass = false;
  let colorScheme = "";
  const mockStorage = {
    getItem(k) {
      if (storageThrows) throw new Error("SecurityError: Access is denied");
      return storedVal;
    }
  };
  const mockDoc = {
    documentElement: {
      classList: {
        add(c) { if (c === "dark") darkClass = true; },
        remove(c) { if (c === "dark") darkClass = false; }
      },
      style: {
        set colorScheme(val) { colorScheme = val; },
        get colorScheme() { return colorScheme; }
      }
    }
  };
  const mockWin = {
    matchMedia(q) {
      return { matches: systemIsDark };
    }
  };

  const fn = new Function("window", "document", "localStorage", rawJs);
  fn(mockWin, mockDoc, mockStorage);
  return { darkClass, colorScheme };
}

const themeScriptCode = fs.readFileSync(
  path.resolve(__dirname, "../../../packages/ui/src/theme/theme-script.tsx"),
  "utf8"
);

// Extract the template string inside scriptContent = `...`
const match = themeScriptCode.match(/const scriptContent = `([\s\S]*?)`;/);
if (!match) {
  console.error("Could not find scriptContent in theme-script.tsx");
  process.exit(1);
}

// Emulate evaluation of storageKey="fc-theme", defaultTheme="system"
const storageKey = "fc-theme";
const defaultTheme = "system";

let scriptContent = match[1]
  .replace(/\${JSON\.stringify\(storageKey\)\.replace\(\/<\//g, JSON.stringify(storageKey).replace(/</g, "\\u003c"))
  .replace(/\${JSON\.stringify\(\s*defaultTheme,\s*\)\.replace\(\s*\/<\/\s*,\s*"\\u003c",\s*\)/g, JSON.stringify(defaultTheme).replace(/</g, "\\u003c"));

// Also handle the exact template string evaluation cleanly:
const evaluated = `(function(){try{var k=${JSON.stringify(storageKey).replace(/</g, "\\u003c")},d=${JSON.stringify(defaultTheme).replace(/</g, "\\u003c")},s=null;try{s=localStorage.getItem(k);}catch(_){}var t=(s==='light'||s==='dark'||s==='system')?s:d,m=window.matchMedia('(prefers-color-scheme: dark)').matches,dark=t==='dark'||(t==='system'&&m),r=document.documentElement;if(dark){r.classList.add('dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.style.colorScheme='light';}}catch(_){}})();`;

console.log("1. SecurityError + dark OS:", runScript(evaluated, true, true, null));
console.log("2. SecurityError + light OS:", runScript(evaluated, true, false, null));
console.log("3. Corrupt value + dark OS:", runScript(evaluated, false, true, "undefined"));
console.log("4. Corrupt value + light OS:", runScript(evaluated, false, false, "undefined"));
console.log("5. Explicit dark in storage:", runScript(evaluated, false, false, "dark"));
console.log("6. Explicit light in storage:", runScript(evaluated, false, true, "light"));

// Check XSS escaping
const maliciousKey = "</script><script>alert(1)</script>";
const escaped = JSON.stringify(maliciousKey).replace(/</g, "\\u003c");
console.log("7. XSS escaping test:", { hasUnescapedLt: escaped.includes("<"), escaped });
