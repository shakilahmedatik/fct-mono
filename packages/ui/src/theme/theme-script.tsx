import type * as React from "react";
import type { Theme } from "./use-theme";

export interface ThemeScriptProps {
  storageKey?: string;
  defaultTheme?: Theme;
  nonce?: string;
}

export function ThemeScript({
  storageKey = "fc-theme",
  defaultTheme = "system",
  nonce,
}: ThemeScriptProps): React.JSX.Element {
  const scriptContent = `(function(){try{var k=${JSON.stringify(storageKey).replace(/</g, "\\u003c")},d=${JSON.stringify(
    defaultTheme,
  ).replace(
    /</g,
    "\\u003c",
  )},s=null;try{s=localStorage.getItem(k);}catch(_){}var t=(s==='light'||s==='dark'||s==='system')?s:d,m=window.matchMedia('(prefers-color-scheme: dark)').matches,dark=t==='dark'||(t==='system'&&m),r=document.documentElement;if(dark){r.classList.add('dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.style.colorScheme='light';}}catch(_){}})();`;

  return (
    <script
      id="fc-theme-script"
      dangerouslySetInnerHTML={{ __html: scriptContent }}
      nonce={nonce}
    />
  );
}
