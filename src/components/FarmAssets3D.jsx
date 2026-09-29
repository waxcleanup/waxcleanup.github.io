import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { Color, Object3D } from 'three';
import { farmGrowth } from '../utils/farmGrowth';
import { clamp01, lerpColorHex } from './svg/svgUtils';

const base = `${((process.env.PUBLIC_URL || '') + '/')}models/farm/`;
// These GLBs are uncompressed; avoid starting unused Draco/Meshopt WASM decoders under the site CSP.
export const FARM_ASSETS = { environment: `${base}forestry-farm-v1.glb`, bed: `${base}raised-bed-v1.glb`, plants: `${base}tomato-growth-v1.glb` };

function useBakedParts(scene) {
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true); const result = [];
    scene.traverse(node => {
      if (node.isMesh) result.push({ name: node.name, geometry: node.geometry.clone().applyMatrix4(node.matrixWorld), material: node.material });
    });
    return result;
  }, [scene]);
  useEffect(() => () => parts.forEach(p => p.geometry.dispose()), [parts]);
  return parts;
}

function Batch({ part, items, fruit = false }) {
  const ref = useRef();
  useLayoutEffect(() => {
    if (!ref.current) return;
    const transform = new Object3D(); const color = new Color();
    items.forEach((item, i) => {
      transform.position.set(...item.position); transform.rotation.set(0, item.rotation || 0, 0); transform.scale.setScalar(item.scale); transform.updateMatrix();
      ref.current.setMatrixAt(i, transform.matrix);
      if (fruit) {
        const ripeness = clamp01((item.progress - .8) / .2);
        const mid = lerpColorHex('#4CAF50', '#FFB300', clamp01(ripeness * .6));
        color.set(lerpColorHex(mid, '#FF3D00', clamp01((ripeness - .35) / .65)));
        ref.current.setColorAt(i, color);
      }
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items, fruit]);
  return items.length ? <instancedMesh ref={ref} args={[part.geometry, part.material, items.length]} castShadow receiveShadow dispose={null} /> : null;
}

export function RaisedBeds3D({ slots }) {
  const { scene } = useGLTF(FARM_ASSETS.bed, false, false); const parts = useBakedParts(scene);
  const items = useMemo(() => slots.map(s => ({ position: [s.x, .03, s.z], scale: s.width - .10 })), [slots]);
  return <group>{parts.map(p => <Batch key={p.name} part={p} items={items} />)}</group>;
}

export function TomatoPlants3D({ slots }) {
  const { scene } = useGLTF(FARM_ASSETS.plants, false, false); const parts = useBakedParts(scene);
  const stages = useMemo(() => {
    const groups = { seed: [], seedling: [], foliage: [], flower: [], fruit: [] };
    for (const slot of slots) {
      if (!['GROWING', 'READY'].includes(String(slot.slot.state).toUpperCase())) continue;
      const { progress, stage } = farmGrowth(slot.slot.tick, slot.slot.tick_goal || 21, String(slot.slot.state).toUpperCase());
      const start = { seed: 0, seedling: .15, foliage: .35, flower: .6, fruit: .8 }[stage.key];
      const span = { seed: .15, seedling: .2, foliage: .25, flower: .2, fruit: .2 }[stage.key];
      const scale = Math.min(1.32, slot.width * .74) * (.82 + .18 * (progress - start) / span);
      groups[stage.key].push({ position: [slot.x, .03 + (slot.width - .10) * .44, slot.z], scale, progress, rotation: (Number(slot.slot.index) % 5) * 1.17 });
    }
    return groups;
  }, [slots]);
  return <group>{parts.map(p => {
    const stage = Object.keys(stages).find(key => p.name.startsWith(`plant_${key}_`));
    return stage ? <Batch key={p.name} part={p} items={stages[stage]} fruit={p.material.name === 'TomatoFruit'} /> : null;
  })}</group>;
}

export function ForestryFarm3D({ farm }) {
  const { scene } = useGLTF(FARM_ASSETS.environment, false, false);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; node.material = node.material.clone(); } });
    return copy;
  }, [scene]);
  const known = farm?.farm_energy != null && Number(farm?.farm_energy_max) > 0;
  const ratio = known ? Math.max(0, Math.min(1, Number(farm.farm_energy) / Number(farm.farm_energy_max))) : 0;
  useLayoutEffect(() => {
    model.traverse(node => {
      const mat = node.material;
      if (!mat) return;
      const row = /^CinderRow(\d)/.exec(mat.name);
      if (row) { const fill = Math.max(0, Math.min(1, ratio * 6 - Number(row[1]))); mat.emissiveIntensity = fill * 3; mat.color.set(fill > 0 ? '#ffaf38' : '#362d21'); }
      if (mat.name === 'CinderConduit') mat.emissiveIntensity = ratio > 0 ? 2 : 0;
    });
  }, [model, ratio]);
  useEffect(() => () => model.traverse(n => { if (n.isMesh) n.material.dispose(); }), [model]);
  return <group><primitive object={model} dispose={null} /><Html position={[-4, 5.7, -8.3]} center zIndexRange={[12, 0]}><span className="farm3d-landmark-label">CINDER FARM CELL<br /><small>{known ? `${farm.farm_energy} / ${farm.farm_energy_max} energy · ${Math.round(ratio * 100)}%` : 'Energy unavailable'}</small>{known && <progress aria-label="Farm energy" value={Number(farm.farm_energy)} max={Number(farm.farm_energy_max)} />}</span></Html></group>;
}
