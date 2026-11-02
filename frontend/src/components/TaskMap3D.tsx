import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MapPoint } from "../visualization/layout";
import { moduleColor } from "../visualization/layout";

export function TaskMap3D({ points, paused, onUnsupported }: {
  points: MapPoint[];
  paused: boolean;
  onUnsupported: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    if (!host.current) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onUnsupported();
      return;
    }
    const element = host.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1, 15);
    const group = new THREE.Group();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const point of points) {
      const material = new THREE.MeshBasicMaterial({ color: moduleColor(point.task.module) });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(point.size, 16, 12), material);
      mesh.position.set(point.x, point.y, point.z);
      group.add(mesh);
    }
    scene.add(group);
    element.replaceChildren(renderer.domElement);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const resize = () => {
      const width = Math.max(1, element.clientWidth);
      const height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let frame = 0;
    const render = () => {
      if (!pausedRef.current && !reducedMotion) group.rotation.y += 0.0015;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      group.children.forEach(child => {
        const mesh = child as THREE.Mesh;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      renderer.dispose();
      element.replaceChildren();
    };
  }, [onUnsupported, points]);
  return <div className="map-canvas" ref={host} aria-label="Three dimensional task map" role="img" aria-describedby="map-description" />;
}
