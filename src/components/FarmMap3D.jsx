import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { MOUSE, TOUCH } from 'three';
import useWorld3DWeather from './World3DWeather';
import { ForestryFarm3D, RaisedBeds3D, TomatoPlants3D } from './FarmAssets3D';
import { farmGrowth } from '../utils/farmGrowth';
import BlendTree3D from './BlendTree3D';
import FarmBackdrop3D from './FarmBackdrop3D';
import './FarmMap3D.css';

export default function FarmMap3D({ plots, onInspect, actions, farm }) {
  const weather = useWorld3DWeather();
  const [page, setPage] = useState(0), [selection, setSelection] = useState(null);
  const [labels, setLabels] = useState(true);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(plots.length / 12) - 1));
  const visible = useMemo(() => plots.slice(currentPage * 12, currentPage * 12 + 12), [plots, currentPage]);
  const slots = useMemo(() => visible.flatMap((plot, i) => {
    const n = Math.ceil(Math.sqrt((plot.slots || []).length));
    const width = 3.65 / Math.max(1, n);
    return (plot.slots || []).map((slot, j) => ({ plot, slot, width, x: (i % 4 - 1.5) * 4.2 + (j % n - (n - 1) / 2) * width, z: (Math.floor(i / 4) - 1) * 4.2 + (Math.floor(j / n) - (n - 1) / 2) * width }));
  }), [visible]);
  const plot = visible.find(p => String(p.plot_asset_id) === selection?.id);
  const slot = plot?.slots?.find(s => String(s.index) === selection?.slot);
  const choose = (p, s) => setSelection({ id: String(p.plot_asset_id), slot: String(s.index) });
  const selectedGrowth = slot && farmGrowth(slot.tick, slot.tick_goal || 21, String(slot.state).toUpperCase());
  return <section className="farm3d" aria-label="3D farm">
    <div className="farm3d-canvas"><Canvas shadows frameloop="demand" dpr={[1, 1.5]} camera={{ position: [21, 21, 27], fov: 43, near: .1, far: 240 }} fallback={<p>3D unavailable. Choose 2D plots above.</p>}>
      <color attach="background" args={[weather.cloudy ? '#a9bdc1' : '#b7d2ce']} />
      <fog attach="fog" args={[weather.cloudy ? '#9eb9b3' : '#c5d9c4', 38, 145]} />
      <FarmBackdrop3D cloudy={weather.cloudy} />
      <hemisphereLight args={['#ffeac6', '#3e5640', 1.8]} />
      <directionalLight position={[7, 20, 10]} intensity={weather.cloudy ? 1.3 : 2.6} color="#ffddb0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-23} shadow-camera-right={23} shadow-camera-top={23} shadow-camera-bottom={-23} shadow-camera-far={70} shadow-bias={-.001} />
      <Suspense fallback={<Html center><span className="farm3d-landmark-label">Loading the Blender farm…</span></Html>}>
        <ForestryFarm3D farm={farm} /><RaisedBeds3D slots={slots} /><TomatoPlants3D slots={slots} />
        {[[ -11.8, -11 ], [-12, -3], [-12, 5], [12, -11], [12, -3], [12, 5], [-7, -15], [0, -16], [7, -15]].map(([x, z], i) => <BlendTree3D key={`forest-${i}`} position={[x, 0, z]} scale={1.3 + (i % 3) * .12} seed={i + 214} />)}
        {slots.map(s => {
          const state = String(s.slot.state || '').toUpperCase();
          const growth = farmGrowth(s.slot.tick, s.slot.tick_goal || 21, state);
          const waterLabel = state === 'GROWING' ? actions.waterLabel(s.slot) : null;
          const ready = state === 'READY' || waterLabel === 'READY';
          const text = state === 'READY' ? 'Harvest ready' : state === 'GROWING' ? waterLabel === 'READY' ? 'Water ready' : waterLabel ? `Water in ${waterLabel}` : 'Checking timer…' : (actions.emptyLabel?.(s.plot) || 'Empty plot · Ready to plant');
          const selected = selection?.id === String(s.plot.plot_asset_id) && selection?.slot === String(s.slot.index);
          return <group key={`${s.plot.plot_asset_id}:${s.slot.index}`}>
            <mesh position={[s.x, s.width * .24, s.z]} onClick={e => { e.stopPropagation(); choose(s.plot, s.slot); }}><boxGeometry args={[s.width, s.width * .48, s.width]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
            {selected && <mesh position={[s.x, .045, s.z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}><ringGeometry args={[s.width * .67, s.width * .71, 4]} /><meshBasicMaterial color="#ffe89e" /></mesh>}
            {(labels || selected || state === 'EMPTY') && <Html position={[s.x, .38 + Math.min(1.5, s.width), s.z]} center zIndexRange={[10, 0]}><button className={`farm3d-plot-badge${ready ? ' ready' : ''}`} title={state === 'EMPTY' ? text : `${growth.stage.label} · ${Math.round(growth.progress * 100)}% grown`} aria-label={`Plot ${s.plot.plot_asset_id} slot ${s.slot.index}: ${text}`} onClick={() => choose(s.plot, s.slot)}><strong>{text}</strong>{state==='GROWING' && <small>{actions.harvestLabel?.(s.slot)}</small>}</button></Html>}
          </group>;
        })}
      </Suspense>
      <OrbitControls target={[0, .5, -3]} enableRotate mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }} touches={{ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }} minDistance={8} maxDistance={48} minPolarAngle={.3} maxPolarAngle={Math.PI / 2.3} />
    </Canvas><span className="farm3d-weather">{weather.status === 'live' ? `Game weather · ${weather.condition}` : weather.status === 'loading' ? 'Loading weather…' : 'Game weather unavailable'}</span></div>
    <div className="farm3d-controls"><span>Scroll to zoom · drag to pan · right-drag to orbit · click a bed</span><label><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} /> Crop status labels</label><button disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Previous</button><span>{currentPage + 1} / {Math.max(1, Math.ceil(plots.length / 12))}</span><button disabled={(currentPage + 1) * 12 >= plots.length} onClick={() => setPage(currentPage + 1)}>Next</button></div>
    <div className="farm3d-selection">{actions.renderFarm?.()}<label>Choose a plot<select value={plot ? selection.id : ''} onChange={e => { const p=visible.find(p=>String(p.plot_asset_id)===e.target.value); setSelection(p ? {id:String(p.plot_asset_id),slot:String(p.slots?.[0]?.index ?? '')} : null); }}><option value="">Select a plot</option>{visible.map(p=><option key={p.plot_asset_id} value={String(p.plot_asset_id)}>Plot #{String(p.plot_asset_id).slice(-4)} · {p.owner}</option>)}</select></label>
      {plot && actions.renderPlot?.(plot)}
      <label>Choose a crop bed<select value={plot && slot ? `${selection.id}:${selection.slot}` : ''} onChange={e => { const [id, slot] = e.target.value.split(':'); setSelection({ id, slot }); }}><option value="">Select a slot</option>{visible.flatMap(p => (p.slots || []).map(s => <option key={`${p.plot_asset_id}:${s.index}`} value={`${p.plot_asset_id}:${s.index}`}>Plot #{String(p.plot_asset_id).slice(-4)} · Slot {s.index} · {s.state}</option>))}</select></label>
      {plot && slot && <><strong>Plot #{String(plot.plot_asset_id).slice(-4)} · Slot {slot.index} · {slot.state}</strong><span>Owner: {plot.owner}</span>{String(slot.state).toUpperCase() !== 'EMPTY' && <span>{selectedGrowth.stage.label} · {Math.round(selectedGrowth.progress * 100)}%</span>}<button onClick={() => onInspect(plot, slot)}>Crop details</button>{actions.render(plot, slot)}</>}
      {!plots.length && <p>No plots to display for this farm and owner filter.</p>}
    </div>
  </section>;
}
