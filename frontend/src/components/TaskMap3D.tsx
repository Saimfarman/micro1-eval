import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { MapPoint } from "../visualization/layout";
import { moduleColor, qualityForPointCount } from "../visualization/layout";

export function TaskMap3D({
  points,
  paused,
  onUnsupported,
  onSelectPoint,
}: {
  points: MapPoint[];
  paused: boolean;
  onUnsupported: () => void;
  onSelectPoint?: (point: MapPoint | null) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  const resetRef = useRef<() => void>(() => undefined);
  const [hoveredPoint, setHoveredPoint] = useState<MapPoint | null>(null);

  pausedRef.current = paused;

  useEffect(() => {
    if (!host.current) return;
    const element = host.current;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      onUnsupported();
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, element.clientWidth / element.clientHeight, 0.1, 100);
    camera.position.set(0, 1.5, 14);

    const group = new THREE.Group();
    scene.add(group);

    // Grid Floor Helper for spatial depth
    const gridHelper = new THREE.GridHelper(16, 16, 0x22364a, 0x14202d);
    gridHelper.position.y = -3.5;
    scene.add(gridHelper);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x70e1c4, 1.0);
    dirLight1.position.set(6, 10, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8eb8ff, 0.6);
    dirLight2.position.set(-6, -6, -4);
    scene.add(dirLight2);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const quality = qualityForPointCount(points.length, reducedMotion);

    // Create Mesh for each Task point
    const meshes: THREE.Mesh[] = [];
    points.forEach((point) => {
      const col = new THREE.Color(moduleColor(point.task.module));
      const geom = new THREE.SphereGeometry(point.size * 1.3, quality.segments, quality.segments);
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.25,
        metalness: 0.2,
        emissive: col,
        emissiveIntensity: 0.25,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(point.x, point.y, point.z);
      mesh.userData = { point };

      // Add a thin stem down to the grid plane (showing projection)
      const stemGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(point.x, point.y, point.z),
        new THREE.Vector3(point.x, -3.5, point.z),
      ]);
      const stemMat = new THREE.LineBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.18,
      });
      const stem = new THREE.Line(stemGeom, stemMat);
      group.add(stem);

      group.add(mesh);
      meshes.push(mesh);
    });

    element.replaceChildren(renderer.domElement);
    renderer.setPixelRatio(quality.pixelRatio);

    const reset = () => {
      group.rotation.set(0, 0, 0);
      camera.position.set(0, 1.5, 14);
      camera.lookAt(0, 0, 0);
    };
    resetRef.current = reset;

    const onContextLost = (event: Event) => {
      event.preventDefault();
      onUnsupported();
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);

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

    // Interaction: Raycasting & Drag Rotation
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerMove = (evt: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = evt.clientX - prevMouseX;
        const dy = evt.clientY - prevMouseY;
        group.rotation.y += dx * 0.007;
        group.rotation.x += dy * 0.007;
        prevMouseX = evt.clientX;
        prevMouseY = evt.clientY;
      }
    };

    const onPointerDown = (evt: PointerEvent) => {
      isDragging = true;
      prevMouseX = evt.clientX;
      prevMouseY = evt.clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const hitPoint = hits[0].object.userData.point as MapPoint;
        if (onSelectPoint) onSelectPoint(hitPoint);
      }
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("click", onClick);
    window.addEventListener("pointerup", onPointerUp);

    let frame = 0;
    const render = () => {
      if (!pausedRef.current && quality.animate && !isDragging) {
        group.rotation.y += 0.0016;
      }

      // Check hovered mesh
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const topMesh = hits[0].object as THREE.Mesh;
        setHoveredPoint(topMesh.userData.point as MapPoint);
        meshes.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (m === topMesh) {
            mat.emissiveIntensity = 0.9;
            m.scale.set(1.4, 1.4, 1.4);
          } else {
            mat.emissiveIntensity = 0.25;
            m.scale.set(1, 1, 1);
          }
        });
      } else {
        setHoveredPoint(null);
        meshes.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.25;
          m.scale.set(1, 1, 1);
        });
      }

      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("click", onClick);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      group.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      gridHelper.geometry.dispose();
      (gridHelper.material as THREE.Material).dispose();
      renderer.dispose();
      element.replaceChildren();
    };
  }, [onUnsupported, points, onSelectPoint]);

  return (
    <div className="task-map-3d-wrap">
      <div
        className="map-canvas"
        ref={host}
        aria-label="Three dimensional task map"
        role="img"
        aria-describedby="map-description"
        onDoubleClick={() => resetRef.current()}
      />

      {/* Floating Hover Card */}
      {hoveredPoint && (
        <div className="map-hover-card">
          <div className="hover-head">
            <span className="badge" style={{ background: moduleColor(hoveredPoint.task.module), color: "#000" }}>
              {hoveredPoint.task.module}
            </span>
            <strong>Task {hoveredPoint.task.id}</strong>
          </div>
          <div className="hover-meta">
            <div>
              <span className="muted">Verdict:</span> <strong>{hoveredPoint.task.expected_verdict}</strong>
            </div>
            <div>
              <span className="muted">Type:</span> {hoveredPoint.task.control ? "Matched Control" : "Core Task"}
            </div>
            <div>
              <span className="muted">Operations:</span> {hoveredPoint.task.difficulty?.operations ?? "—"}
            </div>
            <div>
              <span className="muted">Keys:</span> {hoveredPoint.task.difficulty?.keys ?? "—"}
            </div>
          </div>
          <span className="hover-hint">Click sphere to view full details</span>
        </div>
      )}
    </div>
  );
}
