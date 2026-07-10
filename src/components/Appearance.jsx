import React from 'react';
import CollapsibleSection from './CollapsibleSection';
import FontControls from './FontControls';
import './Settings.css';

/**
 * Cosmetic settings (fonts) for the app sidebar and the video overlay.
 * Kept separate from the functional Settings section; starts collapsed.
 */
function Appearance({
  uiFontFamily,
  onUiFontChange,
  uiFontScale,
  onUiFontScaleChange,
  overlayFontFamily,
  onOverlayFontChange,
  overlayFontScale,
  onOverlayFontScaleChange,
}) {
  return (
    <CollapsibleSection className="settings-container" title="Appearance" defaultCollapsed>
      <div className="settings-section">
        <FontControls
          label="App (sidebar)"
          fontFamily={uiFontFamily}
          onFontChange={onUiFontChange}
          fontScale={uiFontScale}
          onFontScaleChange={onUiFontScaleChange}
        />
        <FontControls
          label="Video overlay"
          fontFamily={overlayFontFamily}
          onFontChange={onOverlayFontChange}
          fontScale={overlayFontScale}
          onFontScaleChange={onOverlayFontScaleChange}
        />
      </div>
    </CollapsibleSection>
  );
}

export default Appearance;
