import React, { useState, useEffect } from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { EdgeData } from './types';

const CustomEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data
}: EdgeProps<EdgeData>) => {
  const [edgePathParams, setEdgePathParams] = useState<any>(null);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const params = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition
    });
    setEdgePathParams(params);
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);
  
  if (!edgePathParams) return null;

  const edgePath = edgePathParams[0];
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;

  return (
    <g
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <path
        id={id}
        style={{ ...style, strokeWidth: 1.5, stroke: '#555' }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd="url(#arrowhead)"
      />

      {showControls && (
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r={8}
            fill="#fff"
            stroke="#555"
            strokeWidth={1}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (data?.onEdgeDelete) {
                data.onEdgeDelete(id);
              }
            }}
          />
          <path
            d="M-4,-4 L4,4 M4,-4 L-4,4"
            transform={`translate(${centerX}, ${centerY})`}
            stroke="#555"
            strokeWidth={1.5}
            style={{ pointerEvents: 'none' }}
          />
        </g>
      )}
    </g>
  );
};

export default CustomEdgeComponent;
