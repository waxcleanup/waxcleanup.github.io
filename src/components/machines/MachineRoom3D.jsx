import React, { Suspense, useMemo, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import { getMachineRowId, getMachineAssetId, formatCountdown } from './machineUtils';
import './MachineRoom3D.css';
import { CatmullRomCurve3, Vector3 } from 'three';
import { postWaxRpc } from '../../services/waxRpcRead';
import { depositedFruit } from './depositedFruit';
const base = `${(process.env.PUBLIC_URL || '').replace(/\/+$/, '')}/models/machines/`;
export function WorkshopControls({ children, className, ...props }) {
  const stop = event => event.stopPropagation();
  return <div {...props} className={className} onPointerDown={stop} onPointerUp={stop} onPointerMove={stop} onClick={stop} onDoubleClick={stop} onWheel={stop}>{children}</div>;
}
const yes = value => value === true || value === 1 || value === '1' || value === 'true';
export function reactorStatus(machine, recipe, now) {
  const raw = machine?.last_start;
  const start = typeof raw === 'number' ? (raw > 1e12 ? raw : raw * 1000) : Date.parse(String(raw || '').endsWith('Z') ? raw : `${raw}Z`);
  const end = start + Number(machine?.recipe?.cooldown_sec ?? recipe?.cooldown_sec ?? 0) * 1000;
  const running = yes(machine?.isRunning);
  const ready = running && yes(machine?.canClaim) && start > 0 && now >= end;
  return { running, ready, remaining: running && start > 0 ? Math.max(0, Math.ceil((end-now)/1000)) : null };
}
function FruitContents({ fruit }) {
  const bananaCurve = useMemo(()=>new CatmullRomCurve3([new Vector3(-.17,.08,0),new Vector3(-.08,-.09,0),new Vector3(.10,-.11,0),new Vector3(.22,.05,0)]),[]);
  return <group>
    {fruit.tomato && Array.from({length:6},(_,i)=><group key={`t${i}`} position={[Math.cos(i*2.4)*.30,1.29+(i%3)*.19,Math.sin(i*2.4)*.30]} rotation={[0,i,0]}>
      <mesh scale={[1,.86,1]}><sphereGeometry args={[.15,18,12]}/><meshStandardMaterial color="#ca3215" roughness={.36}/></mesh>
      {Array.from({length:5},(_,j)=><mesh key={j} position={[Math.cos(j*1.257)*.045,.13,Math.sin(j*1.257)*.045]} rotation={[.7,j*1.257,0]} scale={[.025,.085,.02]}><coneGeometry args={[1,1,4]}/><meshStandardMaterial color="#406b1c"/></mesh>)}
    </group>)}
    {fruit.banana && Array.from({length:3},(_,i)=><group key={`b${i}`} position={[Math.cos(i*2.1)*.23,1.7+i*.13,Math.sin(i*2.1)*.23]} rotation={[.3,i*1.2,.4]}>
      {[0,1,2].map(j=><mesh key={j} position={[0,j*.045,j*.075]}><tubeGeometry args={[bananaCurve,16,.045,7,false]}/><meshStandardMaterial color="#deb832" roughness={.6}/></mesh>)}
    </group>)}
  </group>;
}
function FinishedCompost() {
  return <group>
    <mesh position={[0,1.65,0]}><cylinderGeometry args={[.565,.565,1.10,40]}/><meshStandardMaterial color="#392414" roughness={1}/></mesh>
    {Array.from({length:72},(_,i)=>{
      const a=i*2.39996; const r=i<24 ? .51*Math.sqrt((i+.5)/24) : .55;
      return <mesh key={i} position={[Math.cos(a)*r,i<24 ? 2.19+Math.sin(i*7.3)*.023 : 1.16+((i-24)%12)*.089,Math.sin(a)*r]} scale={[.075,.035+(i%3)*.01,.065]}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color={['#50321b','#291c12','#694625','#3e301c'][i%4]} roughness={1}/></mesh>;
    })}
  </group>;
}
function Reactor({ machine, recipe, now, selected, position, onSelect, balances, inputs, children }) {
  const { scene } = useGLTF(`${base}ecofusion-reactor-v1.glb`, false, false);
  const particles = useRef();
  const contents = useRef();
  const fruit = depositedFruit(getMachineRowId(machine), balances, inputs);
  const { model, energy } = useMemo(() => {
    const model = scene.clone(true); const energy = [];
    model.traverse(n => { if(n.isMesh) { n.material=n.material.clone(); n.castShadow=n.material.name !== 'ChamberGlass'; n.receiveShadow=true;
      if (/OrangeEnergy|GreenEnergy/.test(n.material.name)) energy.push(n.material);
    }});
    return {model,energy};
  }, [scene]);
  useEffect(()=>()=>model.traverse(n=>{if(n.isMesh)n.material.dispose();}),[model]);
  const status=reactorStatus(machine,recipe,now);
  useFrame(({clock})=>{
    const t=clock.elapsedTime;
    energy.forEach((m,i)=>{m.emissiveIntensity=status.ready ? 2.2 : status.running ? 1.8+Math.sin(t*3+i)*.65 : .18;});
    if(contents.current) contents.current.rotation.y = status.running && !status.ready ? t * .24 : 0;
    if(particles.current){particles.current.rotation.y=t*.38;particles.current.visible=status.running && !status.ready;}
  });
  return <group position={position} scale={1.25} onClick={e=>{e.stopPropagation();onSelect();}}>
    <primitive object={model} dispose={null}/>
    {selected && <group position={[0,.48,.98]}><mesh position={[0,0,-.045]}><boxGeometry args={[1.72,1.08,.12]}/><meshStandardMaterial color="#25322b" metalness={.8} roughness={.35}/></mesh><Html center distanceFactor={4.5} occlude position={[0,0,.025]} zIndexRange={[30,20]} wrapperClass="workshop-console-anchor">{children}</Html></group>}
    <group ref={contents}>{status.ready ? <FinishedCompost/> : <FruitContents fruit={fruit}/>}</group>
    <group ref={particles}>{Array.from({length:14},(_,i)=><mesh key={i} position={[Math.cos(i*2.4)*.36,1.23+(i%7)*.14,Math.sin(i*2.4)*.36]}><sphereGeometry args={[.018,6,4]}/><meshBasicMaterial color={i%2?'#a0ff38':'#ff7717'}/></mesh>)}</group>
    {selected && <mesh rotation={[-Math.PI/2,0,0]} position={[0,.025,0]}><ringGeometry args={[1.22,1.26,64]}/><meshBasicMaterial color="#a5ff77"/></mesh>}
    <Html center distanceFactor={5} occlude position={[0,3.6,0]} zIndexRange={[20,0]}><button className="reactor-badge" aria-pressed={selected} title={`Machine ${getMachineRowId(machine)}`} onClick={e=>{e.stopPropagation();onSelect();}}>Reactor #{String(getMachineRowId(machine)).slice(-5)}<br/><strong>{status.ready?'Compost ready to collect':status.running?'Processing':'Idle'}</strong>{status.running && status.remaining !== null && <small>{formatCountdown(status.remaining)}</small>}</button></Html>
  </group>;
}
function Workshop(){const {scene}=useGLTF(`${base}reactor-workshop-v1.glb`,false,false);return <primitive object={scene} dispose={null}/>;}
export default function MachineRoom3D({ machines, selectedId, onSelect, recipe, now, balances, inputs, busyKey, onDeposit, onStart, energy = 0, energyMax = 0, cinderBalance = 0, onRecharge, onClaim, availableReactors = [], onStake, onUnstake, actionError, actionMessage }) {
 const [stakeId,setStakeId]=useState('');
 const [stockCheck,setStockCheck]=useState(null);
 const stakeAsset=availableReactors.find(r=>String(getMachineAssetId(r))===stakeId) || availableReactors[0];
 const stakeAssetId=stakeAsset ? String(getMachineAssetId(stakeAsset)) : '';
 const [page,setPage]=useState(0); const pages=Math.max(1,machines.length);const current=Math.min(page,pages-1);
 const visible=machines.slice(current,current+1);
 useEffect(()=>{if(visible[0] && String(getMachineRowId(visible[0]))!==String(selectedId)) onSelect(String(getMachineRowId(visible[0])));},[current,visible[0],selectedId,onSelect]);
 const selected=machines.find(m=>String(getMachineRowId(m))===String(selectedId));
 const selectedStatus=reactorStatus(selected,recipe,now);
 const hasDeposits=(balances || []).some(row=>String(getMachineRowId(row))===String(selectedId));
 useEffect(()=>{
  let active=true;setStockCheck(null);
  if(!selected || selectedStatus.running || selected.pending || hasDeposits) return ()=>{active=false;};
  const code=process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';
  postWaxRpc('/v1/chain/get_table_rows',{json:true,code,scope:code,table:'machstock',index_position:2,key_type:'i64',lower_bound:String(selectedId),upper_bound:String(selectedId),limit:1})
   .then(data=>{if(active)setStockCheck({id:String(selectedId),empty:!(data.rows || []).length});}).catch(()=>{if(active)setStockCheck({id:String(selectedId),empty:false});});
  return ()=>{active=false;};
 },[selectedId,selected,selectedStatus.running,hasDeposits,busyKey]);
 const canUnstake=selected && !selectedStatus.running && !selected.pending && !hasDeposits && stockCheck?.id===String(selectedId) && stockCheck.empty;
 const selectedFruit=depositedFruit(selectedId,balances,inputs);
 const requiredEnergy=Number(recipe?.energy_per_batch || 0);
 const energyShortfall=Math.max(0,requiredEnergy-Number(energy));
 const startReason=selectedStatus.ready ? 'Collect the finished compost before starting again.' : selectedStatus.running ? 'This reactor is already processing.' : !recipe ? 'Select a recipe to start.' : energyShortfall > 0 ? `Not enough energy: ${energy} / ${requiredEnergy}. Recharge ${energyShortfall} more energy.` : !yes(selected?.canStart) ? 'Required recipe inputs are missing. Deposit inputs to start.' : '';
 const depositDescription=[selectedFruit.tomato && 'TOMATOE',selectedFruit.banana && 'BANANAZ'].filter(Boolean).join(' + ');

 const consolePanel=selected ? (<WorkshopControls className="reactor-console" aria-label="Selected reactor actions">
    <div><strong>Reactor #{String(selectedId).slice(-5)}</strong><small>{selectedStatus.ready ? 'Finished compost ready to collect' : depositDescription ? `Deposited: ${depositDescription}` : 'No deposited fruit — chamber empty'}</small></div>
    <div className="workshop-energy-status"><strong>Energy {Number(energy).toLocaleString()} / {Number(energyMax).toLocaleString()}</strong><progress aria-label="Machine room energy" value={Math.max(0,Number(energy))} max={Math.max(1,Number(energyMax))}/><small>Cost: {Number(recipe?.energy_per_batch || 0).toLocaleString()} energy · {Number(cinderBalance).toLocaleString()} CINDER available</small></div>
    <button disabled={Boolean(busyKey)} onClick={onRecharge}>Recharge</button>
    <button disabled={!recipe || Boolean(busyKey) || selectedStatus.running} onClick={()=>onDeposit(selected)}>{busyKey===`deposit-${selectedId}`?'Depositing…':'Deposit fruit'}</button>
    <button disabled={!recipe || Boolean(busyKey) || selectedStatus.running || !yes(selected.canStart) || Number(energy) < Number(recipe?.energy_per_batch || 0)} title={startReason || 'Start production'} aria-describedby="reactor-start-reason" onClick={()=>onStart(selected)}>{busyKey===`start-${selectedId}`?'Starting…':'Start'}</button>
    {selectedStatus.ready && <button disabled={Boolean(busyKey)} onClick={()=>onClaim(selected)}>{busyKey===`claim-${selectedId}`?'Collecting…':'Collect compost'}</button>}
    {canUnstake && <button disabled={Boolean(busyKey)} onClick={()=>onUnstake(selected)}>{busyKey===`unstake-${selectedId}`?'Unstaking…':'Unstake reactor'}</button>}
    
    {startReason && !selectedStatus.running && <small id="reactor-start-reason" role="status" className="workshop-start-reason">{startReason}{energyShortfall > 0 && !selectedStatus.running && Number(cinderBalance) <= 0 ? ' You have 0 CINDER available for recharge.' : ''}</small>}
  </WorkshopControls>) : null;

 return <section className="machine-workshop" aria-label="3D machine workshop">
  <div className="workshop-interior"><div className="machine-workshop-canvas"><Canvas shadows dpr={[1,1.5]} camera={{position:[1.5,3.2,8],fov:40}} fallback={<p>3D unavailable. Select 2D controls.</p>}>
   <color attach="background" args={['#0b1716']}/><fog attach="fog" args={['#0b1716',23,55]}/><ambientLight intensity={.65}/><hemisphereLight args={['#d6e7dc','#283329',1.4]}/>
   <directionalLight position={[4,10,6]} intensity={2.5} castShadow shadow-mapSize={[1024,1024]}/><pointLight position={[-3,4,-3]} color="#ffa851" intensity={30}/>
   <Suspense fallback={<Html center>Loading workshop…</Html>}><Workshop/>{visible.map((m,i)=><Reactor key={getMachineRowId(m)} machine={m} balances={balances} inputs={inputs} recipe={recipe} now={now} selected={String(getMachineRowId(m))===String(selectedId)} position={[(i%3-(Math.min(3,visible.length)-1)/2)*4.5,0,Math.floor(i/3)*4.5-1.5]} onSelect={()=>onSelect(String(getMachineRowId(m)))}>{consolePanel}</Reactor>)}</Suspense>
   <OrbitControls target={[0,1.8,-1.5]} minDistance={5} maxDistance={24} maxPolarAngle={Math.PI*.47}/>
  {availableReactors.length > 0 && <Html center distanceFactor={4.5} occlude position={[2,.8,-.5]} zIndexRange={[15,10]}><WorkshopControls className="workshop-staking" aria-label="Stake a reactor">
   {availableReactors.length ? <><label>Available reactor<select value={stakeAssetId} disabled={Boolean(busyKey)} onChange={e=>setStakeId(e.target.value)}>{availableReactors.map(r=><option key={getMachineAssetId(r)} value={String(getMachineAssetId(r))}>EcoFusion #{getMachineAssetId(r)}</option>)}</select></label><button disabled={Boolean(busyKey) || !stakeAssetId} onClick={()=>onStake(stakeAssetId)}>{busyKey===`stake-${stakeAssetId}`?'Staking…':'Stake reactor'}</button></> : <small>No unstaked reactors in your wallet.</small>}
  </WorkshopControls></Html>}
  </Canvas>
  </div></div>
  {actionError && <p className="workshop-action-feedback error" role="alert">{actionError}</p>}
  {!actionError && actionMessage && <p className="workshop-action-feedback" role="status">{actionMessage}</p>}
  <div className="machine-workshop-footer"><span>{machines.length ? 'Use the console on the reactor base. Fruit represents deposited token types. Switch to 2D controls for recipes and inventory management. Drag to orbit · scroll to zoom.' : 'Your workshop is empty. Use Stake reactor below when you have an unstaked reactor in your wallet.'}</span>{pages>1 && <><button disabled={!current} onClick={()=>setPage(current-1)}>Previous</button><span>{current+1}/{pages}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)}>Next</button></>}</div>
 </section>;
}
