'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { MathUtils, type Object3D } from 'three';

type Props = Omit<ThreeElements['group'], 'onClick'> & {
  url?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Click to toggle. Also supports a controlled `open` prop (e.g. an HTML button).
 * Geometry and textures are shared; each instance has its own hinge transform.
 * Works with Canvas frameloop="demand". No lights or custom shaders required.
 */
export function FantasyDoor({
  url = '/models/fantasy-door.glb',
  open: controlledOpen,
  onOpenChange,
  ...props
}: Props) {
  const { scene } = useGLTF(url);
  const instance = useMemo(() => scene.clone(true), [scene]);
  const hinge = useMemo(() => {
    const object = instance.getObjectByName('DoorHinge');
    if (!object) throw new Error('The GLB is missing its DoorHinge node.');
    return object as Object3D;
  }, [instance]);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const invalidate = useThree((state) => state.invalidate);
  const targetAngle = open ? Math.PI / 2 : 0;

  useEffect(() => invalidate(), [targetAngle, invalidate]);

  useFrame((_, delta) => {
    if (Math.abs(hinge.rotation.y - targetAngle) > 0.0001) {
      hinge.rotation.y = MathUtils.damp(hinge.rotation.y, targetAngle, 8, delta);
      invalidate();
    } else {
      hinge.rotation.y = targetAngle;
    }
  });

  return (
    <group
      {...props}
      onClick={(event) => {
        event.stopPropagation();
        if (controlledOpen === undefined) setInternalOpen(!open);
        onOpenChange?.(!open);
        invalidate();
      }}
    >
      <primitive object={instance} dispose={null} />
    </group>
  );
}
