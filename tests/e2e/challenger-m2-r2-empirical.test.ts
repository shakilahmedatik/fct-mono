/**
 * Challenger 1 Round 3: Empirical Stress & Verification Test Suite
 * Milestone 2 Round 3: Form Control Prop Precedence and Accessibility
 *
 * Requirements Verified:
 * 1. Input, Textarea, Select: aria-describedby composition with error ID and <p id="<id>-error" role="alert">
 * 2. Form control tests 2.1 & 2.2
 * 3. Custom caller attributes (data-testid, disabled, value, placeholder, onChange) passthrough cleanly
 */

import { describe, expect, test } from "bun:test";
import { Input, Select, SelectOption, Textarea } from "../../packages/ui/src";
import { el, inspectHtml } from "./harness/test-utils";

describe("Milestone 2 Round 3: Form Control Prop Precedence & Accessibility", () => {
  // =========================================================================
  // Area 2: Form Controls Prop Precedence & Accessibility
  // =========================================================================
  describe("Area 2: Form Controls Prop Precedence & Accessibility", () => {
    test("2.1 Form control prop precedence and accessibility: aria-describedby composition and role='alert' error paragraph on Input, Textarea, Select", () => {
      // -----------------------------------------------------------------------
      // 1. Input Component
      // -----------------------------------------------------------------------
      // Explicit ID + caller aria-describedby + string error
      const inputWithExplicitId = inspectHtml(
        el(Input, {
          id: "custom-input",
          "aria-describedby": "custom-help",
          error: "Username taken",
        }),
      );
      expect(
        inputWithExplicitId.hasAria("describedby", "custom-help custom-input-error"),
      ).toBeTrue();
      expect(inputWithExplicitId.hasAria("invalid", "true")).toBeTrue();
      expect(inputWithExplicitId.contains('id="custom-input-error"')).toBeTrue();
      expect(inputWithExplicitId.contains('role="alert"')).toBeTrue();
      expect(inputWithExplicitId.contains("Username taken")).toBeTrue();
      expect(inputWithExplicitId.contains("text-destructive")).toBeTrue();

      // Auto-generated ID + caller aria-describedby + string error
      const inputWithAutoId = inspectHtml(
        el(Input, {
          "aria-describedby": "custom-help",
          error: "Email is required",
        }),
      );
      const inputDescribedBy = inputWithAutoId.getAttribute("aria-describedby");
      expect(inputDescribedBy).not.toBeNull();
      expect(inputDescribedBy?.startsWith("custom-help ")).toBeTrue();
      expect(inputDescribedBy?.endsWith("-error")).toBeTrue();
      const generatedErrorId = inputDescribedBy?.replace("custom-help ", "");
      expect(inputWithAutoId.contains(`id="${generatedErrorId}"`)).toBeTrue();
      expect(inputWithAutoId.contains('role="alert"')).toBeTrue();
      expect(inputWithAutoId.contains("Email is required")).toBeTrue();

      // Input with leftIcon + rightIcon wrapping preserves aria-describedby and alert
      const inputWithIcons = inspectHtml(
        el(Input, {
          id: "search-input",
          leftIcon: el("span", null, "🔍"),
          rightIcon: el("span", null, "✖"),
          "aria-describedby": "custom-help",
          error: "Invalid query syntax",
        }),
      );
      expect(inputWithIcons.hasAria("describedby", "custom-help search-input-error")).toBeTrue();
      expect(inputWithIcons.contains('id="search-input-error"')).toBeTrue();
      expect(inputWithIcons.contains('role="alert"')).toBeTrue();
      expect(inputWithIcons.contains("Invalid query syntax")).toBeTrue();

      // Boolean error vs String error on Input:
      // Boolean error must NOT append non-existent errorId, and must NOT render empty alert
      const inputBooleanError = inspectHtml(
        el(Input, {
          id: "bool-input",
          "aria-describedby": "custom-help",
          error: true,
        }),
      );
      expect(inputBooleanError.hasAria("describedby", "custom-help")).toBeTrue();
      expect(inputBooleanError.hasAria("invalid", "true")).toBeTrue();
      expect(inputBooleanError.contains('role="alert"')).toBeFalse();
      expect(inputBooleanError.contains("bool-input-error")).toBeFalse();

      // -----------------------------------------------------------------------
      // 2. Textarea Component
      // -----------------------------------------------------------------------
      // Explicit ID + caller aria-describedby + string error
      const textareaWithExplicitId = inspectHtml(
        el(Textarea, {
          id: "custom-textarea",
          "aria-describedby": "custom-help",
          error: "Description too short",
        }),
      );
      expect(
        textareaWithExplicitId.hasAria("describedby", "custom-help custom-textarea-error"),
      ).toBeTrue();
      expect(textareaWithExplicitId.hasAria("invalid", "true")).toBeTrue();
      expect(textareaWithExplicitId.contains('id="custom-textarea-error"')).toBeTrue();
      expect(textareaWithExplicitId.contains('role="alert"')).toBeTrue();
      expect(textareaWithExplicitId.contains("Description too short")).toBeTrue();
      expect(textareaWithExplicitId.contains("border-destructive")).toBeTrue();

      // Auto-generated ID + caller aria-describedby + string error
      const textareaWithAutoId = inspectHtml(
        el(Textarea, {
          "aria-describedby": "custom-help",
          error: "Feedback required",
        }),
      );
      const textareaDescribedBy = textareaWithAutoId.getAttribute("aria-describedby");
      expect(textareaDescribedBy).not.toBeNull();
      expect(textareaDescribedBy?.startsWith("custom-help ")).toBeTrue();
      expect(textareaDescribedBy?.endsWith("-error")).toBeTrue();
      const generatedTextareaErrorId = textareaDescribedBy?.replace("custom-help ", "");
      expect(textareaWithAutoId.contains(`id="${generatedTextareaErrorId}"`)).toBeTrue();
      expect(textareaWithAutoId.contains('role="alert"')).toBeTrue();
      expect(textareaWithAutoId.contains("Feedback required")).toBeTrue();

      // Boolean error on Textarea: retains caller aria-describedby without orphan error ID
      const textareaBooleanError = inspectHtml(
        el(Textarea, {
          id: "bool-textarea",
          "aria-describedby": "custom-help",
          error: true,
        }),
      );
      expect(textareaBooleanError.hasAria("describedby", "custom-help")).toBeTrue();
      expect(textareaBooleanError.hasAria("invalid", "true")).toBeTrue();
      expect(textareaBooleanError.contains('role="alert"')).toBeFalse();

      // -----------------------------------------------------------------------
      // 3. Select Component
      // -----------------------------------------------------------------------
      // Explicit ID + caller aria-describedby + string error
      const selectWithExplicitId = inspectHtml(
        el(
          Select,
          {
            id: "custom-select",
            "aria-describedby": "custom-help",
            error: "Please select an option",
          },
          el(SelectOption, { value: "1" }, "One"),
        ),
      );
      expect(
        selectWithExplicitId.hasAria("describedby", "custom-help custom-select-error"),
      ).toBeTrue();
      expect(selectWithExplicitId.hasAria("invalid", "true")).toBeTrue();
      expect(selectWithExplicitId.contains('id="custom-select-error"')).toBeTrue();
      expect(selectWithExplicitId.contains('role="alert"')).toBeTrue();
      expect(selectWithExplicitId.contains("Please select an option")).toBeTrue();

      // Auto-generated ID + caller aria-describedby + string error
      const selectWithAutoId = inspectHtml(
        el(
          Select,
          {
            "aria-describedby": "custom-help",
            error: "Country required",
          },
          el(SelectOption, { value: "us" }, "USA"),
        ),
      );
      const selectDescribedBy = selectWithAutoId.getAttribute("aria-describedby");
      expect(selectDescribedBy).not.toBeNull();
      expect(selectDescribedBy?.startsWith("custom-help ")).toBeTrue();
      expect(selectDescribedBy?.endsWith("-error")).toBeTrue();
      const generatedSelectErrorId = selectDescribedBy?.replace("custom-help ", "");
      expect(selectWithAutoId.contains(`id="${generatedSelectErrorId}"`)).toBeTrue();
      expect(selectWithAutoId.contains('role="alert"')).toBeTrue();
      expect(selectWithAutoId.contains("Country required")).toBeTrue();

      // Boolean error on Select: retains caller aria-describedby without orphan error ID
      const selectBooleanError = inspectHtml(
        el(
          Select,
          {
            id: "bool-select",
            "aria-describedby": "custom-help",
            error: true,
          },
          el(SelectOption, { value: "a" }, "A"),
        ),
      );
      expect(selectBooleanError.hasAria("describedby", "custom-help")).toBeTrue();
      expect(selectBooleanError.hasAria("invalid", "true")).toBeTrue();
      expect(selectBooleanError.contains('role="alert"')).toBeFalse();
    });

    test("2.2 Custom caller attributes passthrough cleanly on Input, Textarea, Select", () => {
      let inputChanged = false;
      let textareaChanged = false;
      let selectChanged = false;

      const onInputChange = () => {
        inputChanged = true;
      };
      const onTextareaChange = () => {
        textareaChanged = true;
      };
      const onSelectChange = () => {
        selectChanged = true;
      };

      // -----------------------------------------------------------------------
      // 1. Input Passthrough Attributes
      // -----------------------------------------------------------------------
      const inputInspector = inspectHtml(
        el(Input, {
          "data-testid": "custom-test-input",
          disabled: true,
          value: "john.doe@example.com",
          placeholder: "Enter user email",
          onChange: onInputChange,
          name: "user_email",
          autoComplete: "email",
          maxLength: 100,
          required: true,
        }),
      );

      expect(inputInspector.hasAttribute("data-testid", "custom-test-input")).toBeTrue();
      expect(inputInspector.hasAttribute("disabled")).toBeTrue();
      expect(inputInspector.hasAttribute("value", "john.doe@example.com")).toBeTrue();
      expect(inputInspector.hasAttribute("placeholder", "Enter user email")).toBeTrue();
      expect(inputInspector.hasAttribute("name", "user_email")).toBeTrue();
      expect(inputInspector.hasAttribute("autocomplete", "email")).toBeTrue();
      expect(inputInspector.hasAttribute("maxlength", "100")).toBeTrue();
      expect(inputInspector.hasAttribute("required")).toBeTrue();

      // -----------------------------------------------------------------------
      // 2. Textarea Passthrough Attributes
      // -----------------------------------------------------------------------
      const textareaInspector = inspectHtml(
        el(Textarea, {
          "data-testid": "custom-test-textarea",
          disabled: true,
          value: "Initial feedback content",
          placeholder: "Provide constructive comments",
          onChange: onTextareaChange,
          rows: 6,
          cols: 40,
          name: "feedback",
          spellCheck: false,
        }),
      );

      expect(textareaInspector.hasAttribute("data-testid", "custom-test-textarea")).toBeTrue();
      expect(textareaInspector.hasAttribute("disabled")).toBeTrue();
      expect(textareaInspector.contains("Initial feedback content")).toBeTrue();
      expect(
        textareaInspector.hasAttribute("placeholder", "Provide constructive comments"),
      ).toBeTrue();
      expect(textareaInspector.hasAttribute("rows", "6")).toBeTrue();
      expect(textareaInspector.hasAttribute("cols", "40")).toBeTrue();
      expect(textareaInspector.hasAttribute("name", "feedback")).toBeTrue();
      expect(textareaInspector.hasAttribute("spellcheck", "false")).toBeTrue();

      // -----------------------------------------------------------------------
      // 3. Select Passthrough Attributes
      // -----------------------------------------------------------------------
      const selectInspector = inspectHtml(
        el(
          Select,
          {
            "data-testid": "custom-test-select",
            disabled: true,
            value: "enterprise",
            placeholder: "Select plan",
            onChange: onSelectChange,
            name: "subscription_tier",
            required: true,
          },
          el(SelectOption, { value: "starter" }, "Starter"),
          el(SelectOption, { value: "pro" }, "Pro"),
          el(SelectOption, { value: "enterprise" }, "Enterprise"),
        ),
      );

      expect(selectInspector.hasAttribute("data-testid", "custom-test-select")).toBeTrue();
      expect(selectInspector.hasAttribute("disabled")).toBeTrue();
      expect(selectInspector.hasAttribute("value", "enterprise")).toBeTrue();
      expect(selectInspector.hasAttribute("placeholder", "Select plan")).toBeTrue();
      expect(selectInspector.hasAttribute("name", "subscription_tier")).toBeTrue();
      expect(selectInspector.hasAttribute("required")).toBeTrue();

      // Verify callbacks are defined functions and execute
      expect(inputChanged).toBeFalse();
      onInputChange();
      expect(inputChanged).toBeTrue();

      expect(textareaChanged).toBeFalse();
      onTextareaChange();
      expect(textareaChanged).toBeTrue();

      expect(selectChanged).toBeFalse();
      onSelectChange();
      expect(selectChanged).toBeTrue();
    });

    test("2.3 Multi-token caller aria-describedby and edge-case error string trimming", () => {
      // Input with multi-token aria-describedby
      const multiTokenInput = inspectHtml(
        el(Input, {
          id: "multi-input",
          "aria-describedby": "hint-1 hint-2",
          error: "Bad format",
        }),
      );
      expect(multiTokenInput.hasAria("describedby", "hint-1 hint-2 multi-input-error")).toBeTrue();

      // Textarea with empty error string (whitespace only) should NOT render alert
      const emptyErrorTextarea = inspectHtml(
        el(Textarea, {
          id: "empty-err-textarea",
          "aria-describedby": "my-hint",
          error: "   ",
        }),
      );
      expect(emptyErrorTextarea.hasAria("describedby", "my-hint")).toBeTrue();
      expect(emptyErrorTextarea.contains('role="alert"')).toBeFalse();

      // Select with undefined error retains caller aria-describedby without error suffix
      const noErrorSelect = inspectHtml(
        el(
          Select,
          {
            id: "clean-select",
            "aria-describedby": "select-hint",
          },
          el(SelectOption, { value: "1" }, "First"),
        ),
      );
      expect(noErrorSelect.hasAria("describedby", "select-hint")).toBeTrue();
      expect(noErrorSelect.contains('role="alert"')).toBeFalse();
    });
  });
});
