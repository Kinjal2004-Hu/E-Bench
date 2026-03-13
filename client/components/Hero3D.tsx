import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function BalanceModel() {
  const model = useGLTF("/balance.glb");
  return <primitive object={model.scene} scale={2} />;
}

export default function Hero3D() {
  return (
    <Canvas>
      <ambientLight />
      <BalanceModel />
      <OrbitControls />
    </Canvas>
  );
}