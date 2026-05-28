import React, { useEffect, useRef, useState } from "react";
import config from "../../config";
import "../../styles/molstar-custom.css";

const ProteinViewer = ({
  accession,
  width = "100%",
  height = "100%",
  showControls = true,
  initialStyle = "cartoon",
  enableMeasurement = true,
  enableSelection = true,
  annotations = [],
  annotationGroups = [],
  annotationStylePreset = null,
  showAnnotationLabels = false,
}) => {
  const containerRef = useRef(null);
  const pluginRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accession || typeof window === 'undefined') return;

    let plugin = null;
    let isMounted = true;

    const loadMolstarAndStructure = async () => {
      try {
        setLoading(true);
        setError(null);

        // Import Molstar CSS first
        await import('molstar/lib/mol-plugin-ui/skin/light.scss');

        // Import Molstar modules with React 18 renderer
        const { createPluginUI } = await import('molstar/lib/mol-plugin-ui');
        const { renderReact18 } = await import('molstar/lib/mol-plugin-ui/react18');
        const { DefaultPluginUISpec } = await import('molstar/lib/mol-plugin-ui/spec');

        if (!isMounted || !containerRef.current) {
          console.log('Component unmounted, aborting');
          return;
        }


        // Ensure container has explicit pixel dimensions
        const rect = containerRef.current.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
          throw new Error('Container has no dimensions');
        }

        containerRef.current.style.width = `${rect.width}px`;
        containerRef.current.style.height = `${rect.height}px`;

        // Create plugin with React 18 renderer
        // Configure spec based on whether we want controls
        const spec = DefaultPluginUISpec();
        if (!showControls) {
          // For small viewers, disable all UI panels
          spec.layout = {
            initial: {
              isExpanded: false,
              showControls: false,
              controlsDisplay: 'none'
            }
          };
          spec.components = {
            ...spec.components,
            controls: { left: 'none', right: 'none', top: 'none', bottom: 'none' }
          };
        }

        plugin = await createPluginUI({
          target: containerRef.current,
          spec: spec,
          render: renderReact18,
        });

        pluginRef.current = plugin;

        // Get PDB info from backend
        const pdbUrl = `${config.apiUrl}/pdb/accession/${accession}`;

        const response = await fetch(pdbUrl);

        if (!response.ok) {
          throw new Error('No structure available');
        }

        const pdbInfo = await response.json();

        if (!isMounted) {
          console.log('Component unmounted, aborting');
          return;
        }

        // Fetch PDB file
        const pdbResponse = await fetch(pdbInfo.pdb_url);
        if (!pdbResponse.ok) {
          throw new Error(`Failed to load PDB file: ${pdbResponse.status}`);
        }

        const pdbData = await pdbResponse.text();

        if (!isMounted) return;

        // Load structure into Molstar
        const data = await plugin.builders.data.rawData({
          data: pdbData,
          label: `${accession} Structure`
        });

        const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
        const model = await plugin.builders.structure.createModel(trajectory);
        const structure = await plugin.builders.structure.createStructure(model);

        const cartoonColor =
          annotationStylePreset?.cartoonColor || '#f5f5f5';

        const { Color } = await import('molstar/lib/mol-util/color');
        const cartoonColorValue = Color.fromHexStyle(cartoonColor);

        // Apply representation based on initialStyle
        let reprParams = {};
        switch (initialStyle) {
          case 'cartoon':
            reprParams = {
              type: 'cartoon',
              typeParams: {},
              color: 'uniform',
              colorParams: { value: cartoonColorValue },
            };
            break;
          case 'surface':
            reprParams = {
              type: 'molecular-surface',
              typeParams: {},
              color: 'hydrophobicity',
              colorParams: {}
            };
            break;
          case 'ball-and-stick':
            reprParams = {
              type: 'ball-and-stick',
              typeParams: {},
              color: 'element-symbol',
              colorParams: {}
            };
            break;
          default:
            reprParams = {
              type: 'cartoon',
              typeParams: {},
              color: 'uniform',
              colorParams: { value: cartoonColorValue },
            };
        }

        await plugin.builders.structure.representation.addRepresentation(structure, reprParams);

        if (annotations?.length) {
          const { applyAnnotationRepresentations } = await import('./molstarAnnotations.js');
          await applyAnnotationRepresentations(
            plugin,
            structure,
            annotations,
            annotationStylePreset,
            annotationGroups,
          );
        }

        // Auto-focus on structure
        const { Structure } = await import('molstar/lib/mol-model/structure');
        const loci = Structure.toStructureElementLoci(structure.cell.obj.data);
        await plugin.managers.camera.focusLoci(loci);

        // Enable measurement tools if requested
        if (enableMeasurement && plugin.managers.structure.measurement) {
          console.log('Enabling measurement tools');
          // Measurement tools are available through the UI when controls are shown
        }

        // Enable selection tools if requested
        if (enableSelection && plugin.managers.structure.selection) {
          console.log('Enabling selection tools');
          // Selection is enabled by default in Molstar
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading structure:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadMolstarAndStructure();

    return () => {
      isMounted = false;
      if (pluginRef.current) {
        pluginRef.current.dispose();
        pluginRef.current = null;
      }
    };
  }, [
    accession,
    showControls,
    initialStyle,
    enableMeasurement,
    enableSelection,
    annotationStylePreset?.cartoonColor,
    annotations,
    annotationGroups,
  ]);

  // Hide header when hovering over structure viewer (only when controls are shown - i.e., on detail pages)
  const handleMouseEnter = () => {
    if (!showControls) return; // Don't hide header for small preview viewers

    const header = document.querySelector('.ui-section-header');
    if (header && window.pageYOffset > 100) {
      header.classList.add('header-hidden');
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      onMouseEnter={handleMouseEnter}
      className={!showControls ? 'molstar-compact' : ''}
      style={{
        width,
        height,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        isolation: 'isolate' // Create stacking context to contain Molstar UI
      }}
    >
      {/* Molstar plugin container */}
      <div
        ref={containerRef}
        className='w-full h-full absolute top-0 left-0 overflow-hidden'
      />

      {/* Loading overlay */}
      {loading && (
        <div
          className='w-full h-full absolute top-0 left-0 flex items-center justify-center bg-surface text-primary text-sm z-10'
        >
          Loading structure...
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div
          className='w-full h-full absolute top-0 left-0 flex items-center justify-center bg-surface text-primary text-xs z-10 text-center p-2'
        >
          Structure unavailable
        </div>
      )}

      {showAnnotationLabels && annotations.length > 0 && !loading && !error && (
        <div
          className='absolute top-2 right-2 z-20 max-w-[260px] rounded-md border border-border bg-background/80 backdrop-blur px-2 py-2'
        >
          <p className='m-0 text-[11px] font-semibold text-foreground mb-1'>
            Annotated residues
          </p>
          <div className='flex flex-wrap gap-1'>
            {annotations.slice(0, 20).map((a, idx) => {
              const group = a.group
                ? annotationGroups.find(g => g.id === a.group)
                : null
              const bg =
                group?.color ||
                annotationStylePreset?.annotationColor ||
                "#ff2ea6"
              return (
                <span
                  key={`${a.seqPos}-${a.group || "none"}-${idx}`}
                  title={a.note || a.label || ""}
                  className='inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono text-white'
                  style={{ backgroundColor: bg }}
                >
                  {a.seqPos}
                  {a.aa ? ` ${a.aa}` : ""}
                </span>
              )
            })}
            {annotations.length > 20 ? (
              <span className='text-[10px] text-muted-foreground'>+{annotations.length - 20} more</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProteinViewer;
