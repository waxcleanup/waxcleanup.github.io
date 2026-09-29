import React, { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

const TREE_URL = `${((process.env.PUBLIC_URL || '') + '/')}models/blend-tree/blend-tree-map.glb`;
function TreeAsset() {
  // No decoders: this self-contained asset also works under the testnet CSP.
  const { scene } = useGLTF(TREE_URL, false, false);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse(node => {
      if (!node.isMesh) return;
      node.receiveShadow = true;
      node.castShadow = /trunk|branch|root/i.test(node.name);
      // Scenery must not intercept recruit/deposit selection rays.
      node.raycast = () => {};
    });
    return copy;
  }, [scene]);
  return <primitive object={model} dispose={null} />;
}
class TreeBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function BlendTree3D({ position, scale = 1, seed = 1 }) {
  const turn = (Math.sin(Number(seed) * 127.1 + 623.4) * 43758.5453 % 1) * Math.PI * 2;
  // Forest trees stand roughly 2.6–3.4 recruit heights. Keep canopy growth
  // smaller than height growth so the playable center of each cell stays readable.
  return <group position={position} scale={[scale * .42, scale * .68, scale * .42]} rotation={[0, turn, 0]}>
    <TreeBoundary><Suspense fallback={null}><TreeAsset /></Suspense></TreeBoundary>
  </group>;
}
