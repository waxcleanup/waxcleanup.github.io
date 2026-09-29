import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { BackSide, Color, Object3D } from 'three';

const noise = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const ignoreRay = () => {};

function TreeBatch({ part, trees }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const transform = new Object3D();
    trees.forEach(([x, z, scale, rotation], i) => {
      transform.position.set(x, -.55, z);
      transform.scale.set(scale * .42, scale * .68, scale * .42);
      transform.rotation.set(0, rotation, 0); transform.updateMatrix();
      ref.current.setMatrixAt(i, transform.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [trees]);
  return <instancedMesh ref={ref} args={[part.geometry, part.material, trees.length]} raycast={ignoreRay} dispose={null} />;
}

function DetailedForest({ trees }) {
  const { scene } = useGLTF(`${((process.env.PUBLIC_URL || '') + '/')}models/blend-tree/blend-tree-map.glb`, false, false);
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const result = [];
    scene.traverse(node => {
      if (node.isMesh) result.push({ name: node.name, geometry: node.geometry.clone().applyMatrix4(node.matrixWorld), material: node.material });
    });
    return result;
  }, [scene]);
  useEffect(() => () => parts.forEach(part => part.geometry.dispose()), [parts]);
  return <group>{parts.map(part => <TreeBatch key={part.name} part={part} trees={trees} />)}</group>;
}

export default function FarmBackdrop3D({ cloudy }) {
  const trees = useMemo(() => Array.from({ length: 56 }, (_, i) => {
    const ring = Math.floor(i / 28);
    const angle = (i % 28 + noise(i) * .6) / 28 * Math.PI * 2;
    const radius = 29 + ring * 18 + noise(i + 800) * 8;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius - 3, 1.6 + noise(i + 100) * .85, noise(i + 200) * Math.PI * 2];
  }), []);
  const uniforms = useMemo(() => ({
    horizon: { value: new Color(cloudy ? '#9eb9b3' : '#c5d9c4') },
    zenith: { value: new Color(cloudy ? '#334e59' : '#477e98') },
  }), [cloudy]);
  return <group>
    <mesh raycast={ignoreRay}>
      <sphereGeometry args={[190, 32, 20]} />
      <shaderMaterial side={BackSide} depthWrite={false} uniforms={uniforms}
        vertexShader={'varying vec3 direction; void main(){ direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'}
        fragmentShader={'uniform vec3 horizon; uniform vec3 zenith; varying vec3 direction; void main(){ float h=normalize(direction).y; float mist=smoothstep(-0.08,0.7,h); gl_FragColor=vec4(mix(horizon,zenith,mist),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.57, 0]} receiveShadow raycast={ignoreRay}>
      <circleGeometry args={[170, 96]} /><meshStandardMaterial color="#4b6245" roughness={1} />
    </mesh>
    {Array.from({ length: 16 }, (_, i) => {
      const a = i / 16 * Math.PI * 2;
      return <mesh key={i} position={[Math.cos(a) * 94, -5, Math.sin(a) * 94]} scale={[27 + noise(i) * 18, 15 + noise(i + 32) * 20, 24]} raycast={ignoreRay}>
        <sphereGeometry args={[1, 18, 12]} /><meshStandardMaterial color={i % 2 ? '#496b62' : '#395c59'} roughness={1} />
      </mesh>;
    })}
    <Suspense fallback={null}><DetailedForest trees={trees} /></Suspense>
  </group>;
}
