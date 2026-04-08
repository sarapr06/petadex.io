import React from "react";
import ProteinViewer from "./ProteinViewer";

export default function StructurePanel({ accession }) {
  return (
    <div>
      <div className='rounded-2xl border-border overflow-hidden bg-surface-overlay'>
        <div  className='p-4 bg-surface-raised border-b-border-strong'>
          <h3 className='text-lg m-0 text-muted-foreground font-semibold'>
            3D Structure Viewer
          </h3>
        </div>

        <div className='w-full h-[500px] bg-secondary'>
          <ProteinViewer
            accession={accession}
            width="100%"
            height="500px"
            showControls={true}
            enableMeasurement={true}
            enableSelection={true}
          />
        </div>
      </div>

      <div className='mt-6 p-4 bg-blue-300 rounded-lg border-l-info border-l-4'>
        <p className='m-0 text-sm text-primary dark:text-secondary'>
          <strong>Tip:</strong> Click and drag to rotate the structure. Scroll to zoom in/out.
        </p>
      </div>
    </div>
  );
}
