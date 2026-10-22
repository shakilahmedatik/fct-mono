/**
 * FirstCup E2E Test Utilities & HTML Inspector
 * Provides server-rendering, DOM querying, styles parsing, and assertion helpers.
 */

import * as fs from "node:fs";
import * as path from "node:path";
// The workspace ships React without a hoisted root install, so the runtime is
// imported from the package that owns it. The types come from the ambient
// declarations in ./react-modules.d.ts (@types/react + @types/react-dom).
import * as React from "../../../packages/ui/node_modules/react";
import { renderToStaticMarkup } from "../../../packages/ui/node_modules/react-dom/server";

export { React };
export const el = React.createElement;

export const PROJECT_ROOT = path.resolve(__dirname, "../../..");
export const UI_PACKAGE_PATH = path.join(PROJECT_ROOT, "packages/ui");
export const UI_STYLES_PATH = path.join(UI_PACKAGE_PATH, "src/styles.css");
export const APPS_PATH = path.join(PROJECT_ROOT, "apps");

/**
 * Strips CSS comments from string
 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Reads and parses CSS variables from `packages/ui/src/styles.css`
 */
export function parseCssVariables(cssFilePath: string = UI_STYLES_PATH): {
  rootVariables: Record<string, string>;
  darkVariables: Record<string, string>;
  themeTokens: Record<string, string>;
  fullCss: string;
} {
  const fullCss = fs.readFileSync(cssFilePath, "utf8");

  const rootVariables: Record<string, string> = {};
  const darkVariables: Record<string, string> = {};
  const themeTokens: Record<string, string> = {};

  // Extract :root block
  const rootMatch = fullCss.match(/:root\s*\{([^}]+)\}/s);
  if (rootMatch?.[1]) {
    const cleanBlock = stripComments(rootMatch[1]);
    const lines = cleanBlock.split(";");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("--")) {
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          const varName = trimmed.slice(0, colonIdx).trim();
          const varVal = trimmed.slice(colonIdx + 1).trim();
          rootVariables[varName] = varVal;
        }
      }
    }
  }

  // Extract .dark block
  const darkMatch = fullCss.match(/\.dark\s*\{([^}]+)\}/s);
  if (darkMatch?.[1]) {
    const cleanBlock = stripComments(darkMatch[1]);
    const lines = cleanBlock.split(";");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("--")) {
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          const varName = trimmed.slice(0, colonIdx).trim();
          const varVal = trimmed.slice(colonIdx + 1).trim();
          darkVariables[varName] = varVal;
        }
      }
    }
  }

  // Extract @theme block
  const themeMatch = fullCss.match(/@theme\s*\{([^}]+)\}/s);
  if (themeMatch?.[1]) {
    const cleanBlock = stripComments(themeMatch[1]);
    const lines = cleanBlock.split(";");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("--")) {
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          const tokenName = trimmed.slice(0, colonIdx).trim();
          const tokenVal = trimmed.slice(colonIdx + 1).trim();
          themeTokens[tokenName] = tokenVal;
        }
      }
    }
  }

  return { rootVariables, darkVariables, themeTokens, fullCss };
}

/**
 * Renders a React element to an HTML string
 */
export function renderComponent(element: any): string {
  return renderToStaticMarkup(element);
}

/**
 * Simple HTML inspection utilities without heavy external parser dependencies
 */
export class HtmlInspector {
  constructor(public html: string) {}

  contains(pattern: string | RegExp): boolean {
    if (typeof pattern === "string") {
      return this.html.includes(pattern);
    }
    return pattern.test(this.html);
  }

  hasAttribute(attrName: string, expectedValue?: string | RegExp): boolean {
    if (expectedValue === undefined) {
      const regex = new RegExp(`\\s${attrName}(?:=|[\\s>])`, "i");
      return regex.test(this.html);
    }
    if (typeof expectedValue === "string") {
      const escaped = expectedValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\s${attrName}=["']${escaped}["']`, "i");
      return regex.test(this.html);
    }
    const match = this.html.match(new RegExp(`\\s${attrName}=["']([^"']+)["']`, "i"));
    return match ? expectedValue.test(match[1]) : false;
  }

  getAttribute(attrName: string): string | null {
    const match = this.html.match(new RegExp(`\\s${attrName}=["']([^"']+)["']`, "i"));
    return match ? match[1] : null;
  }

  hasClass(className: string): boolean {
    const classAttr = this.getAttribute("class");
    if (!classAttr) return false;
    const classes = classAttr.split(/\s+/);
    return classes.includes(className);
  }

  hasRole(roleName: string): boolean {
    return this.hasAttribute("role", roleName);
  }

  hasAria(ariaKey: string, expectedValue?: string): boolean {
    return this.hasAttribute(`aria-${ariaKey}`, expectedValue);
  }
}

export function inspectHtml(htmlOrElement: string | any): HtmlInspector {
  if (typeof htmlOrElement === "string") {
    return new HtmlInspector(htmlOrElement);
  }
  return new HtmlInspector(renderComponent(htmlOrElement));
}
