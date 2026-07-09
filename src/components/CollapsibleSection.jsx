import React, { useState } from 'react';
import './CollapsibleSection.css';

/**
 * Reusable collapsible section with a clickable header (caret + title) and an
 * optional actions slot. Header actions stop propagation so their clicks don't
 * toggle the section. Collapse state is local to each instance.
 */
function CollapsibleSection({ title, defaultCollapsed = false, headerActions = null, className = '', children }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const toggle = () => setCollapsed(c => !c);

  return (
    <div className={`collapsible-section ${className}`.trim()}>
      <div
        className="collapsible-header"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <h3 className="collapsible-title">
          <span className="collapsible-caret" aria-hidden="true">{collapsed ? '▶' : '▼'}</span>
          {title}
        </h3>
        {headerActions && (
          <div className="collapsible-actions" onClick={(e) => e.stopPropagation()}>
            {headerActions}
          </div>
        )}
      </div>
      {!collapsed && <div className="collapsible-body">{children}</div>}
    </div>
  );
}

export default CollapsibleSection;
