# Accessibility

Applies to every screen and to the bundled test page. These sit under WCAG 2.2 AA. `product-ux.md` has the rest.

- Body text is 16px (1rem) or larger. Size in `rem`, so zoom and the text-size setting work.
- Every interactive element has a visible focus outline (3px, not hidden by a sticky bar).
- Everything works with Tab, Shift+Tab, Enter and Space alone. No keyboard trap.
- Text contrast is 4.5:1 or better. Icons, borders and focus rings are 3:1 or better.
- Status is never colour alone. Use an icon and text together (for example red cross + "Could not reach Send Payment").
- Reduced motion is respected. Calm mode stops all decorative animation, including layers already running.
- Decorative art is `aria-hidden`, ignores the pointer, and is never focusable.
- The ghost sits beside the control it describes and never covers it. Its position comes only from `blocked_element.bounding_box`.
- One `<h1>` per page. Focus moves to it after navigation. Every page has its own title.
- A screen you touch must pass the axe tests (`cd dashboard && npm test`) and a keyboard-only walk before the pull request.
