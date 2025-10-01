# Mobile Optimization Refactor Instructions

This document defines an autonomous agent’s workflow to refactor the React/Tailwind business-intelligence dashboard for optimal display and usability on iPhone-sized viewports (≈375×812px).

## Agent Workflow

1. **Audit Responsive Utilities**  
   - Scan all components for Tailwind breakpoints and responsive classes (`sm:`, `md:`, `lg:`).  
   - Document where desktop overrides begin and note any missing mobile-first rules.

2. **Mobile Navigation**  
   - Replace the permanent Sidebar with a hamburger menu on screens `<640px`.  
   - Implement an off-canvas drawer (e.g., Headless UI `<Transition>` + `<Dialog>`) for primary navigation.

3. **Table & List Optimization**  
   - Wrap each table component (e.g., `MonthlyRevenueTable`, `BillingOverview`) in a `div.overflow-x-auto`.  
   - Optionally convert dense tables into vertically stacked card layouts for readability.

4. **Chart Responsiveness**  
   - Embed charts in a fluid container (`w-full h-auto`).  
   - Adjust legends, tooltips, and axis labels for touch-friendly sizing.

5. **Typography & Touch Targets**  
   - Apply responsive font-size classes so text remains legible (e.g., `text-base sm:text-lg`).  
   - Ensure all interactive elements meet a minimum 44×44px tap area per WCAG guidelines.

6. **Grid & Spacing Adjustments**  
   - Collapse multi-column grids into a single column on `<640px`.  
   - Audit spacing tokens and reduce large paddings/margins under the `sm:` breakpoint.

7. **Theming Validation**  
   - Verify light/dark themes toggle correctly on mobile.  
   - Confirm color, shadow, and spacing tokens render crisply on retina displays.

8. **Testing & QA**  
   - Perform manual QA in iPhone emulators (Safari Web Inspector).  
   - Write Jest + React-Testing-Library snapshot tests for key components at a 320px width.

9. **Deployment & Monitoring**  
   - Deploy updated build and monitor real-device metrics (e.g., Google Analytics device reports).  
   - Collect any user-reported layout issues and iterate as needed.

---

Follow these steps sequentially. After each step, update the progress checklist in this document.
