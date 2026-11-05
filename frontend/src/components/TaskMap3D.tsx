import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { MapPoint } from "../visualization/layout";
import { moduleColor, qualityForPointCount } from "../visualization/layout";
import { getInitialTheme } from "../theme";

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

    // Grid Floor Helper for spatial depth adapted for themes
    const isInitialLight = getInitialTheme() === "light";
    const gridHelper = new THREE.GridHelper(
      16,
      16,
      isInitialLight ? 0x94a3b8 : 0x22364a,
      isInitialLight ? 0xcbd5e1 : 0x14202d
    );
    gridHelper.position.y = -3.5;
    scene.add(gridHelper);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, isInitialLight ? 1.05 : 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x70e1c4, 1.0);
    dirLight1.position.set(6, 10, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8eb8ff, 0.6);
    dirLight2.position.set(-6, -6, -4);
    scene.add(dirLight2);

    const onThemeChange = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ theme: string }>;
      const isLightNow = customEvt.detail?.theme === "light";
      ambientLight.intensity = isLightNow ? 1.05 : 0.85;
    };
    window.addEventListener("themechange", onThemeChange);

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
        emissiveIntensity: 0.3,
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
        opacity: isInitialLight ? 0.28 : 0.18,
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
    let dragDist = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let velX = 0;
    let velY = 0;

    const onPointerMove = (evt: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = evt.clientX - prevMouseX;
        const dy = evt.clientY - prevMouseY;
        dragDist += Math.hypot(dx, dy);
        group.rotation.y += dx * 0.007;
        group.rotation.x += dy * 0.007;
        velX = dx * 0.002;
        velY = dy * 0.002;
        prevMouseX = evt.clientX;
        prevMouseY = evt.clientY;
      }
    };

    const onPointerDown = (evt: PointerEvent) => {
      isDragging = true;
      dragDist = 0;
      prevMouseX = evt.clientX;
      prevMouseY = evt.clientY;
      velX = 0;
      velY = 0;
      renderer.domElement.setPointerCapture(evt.pointerId);
    };

    const onPointerUp = (evt: PointerEvent) => {
      if (isDragging) {
        isDragging = false;
        try {
          renderer.domElement.releasePointerCapture(evt.pointerId);
        } catch {
          // ignore
        }

        // If movement was minimal, trigger point selection
        if (dragDist < 6) {
          raycaster.setFromCamera(mouse, camera);
          const hits = raycaster.intersectObjects(meshes);
          if (hits.length > 0) {
            const hitPoint = hits[0].object.userData.point as MapPoint;
            if (onSelectPoint) onSelectPoint(hitPoint);
          }
        }
      }
    };

    const dom = renderer.domElement;
    dom.style.touchAction = "none";
    dom.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointerup", onPointerUp);

    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);

      if (!pausedRef.current && quality.animate) {
        if (!isDragging) {
          if (Math.abs(velX) > 0.0001 || Math.abs(velY) > 0.0001) {
            group.rotation.y += velX;
            group.rotation.x += velY;
            velX *= 0.93;
            velY *= 0.93;
          }
          group.rotation.y += 0.0016;
        }
      }

      // Check hovered mesh
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(meshes);
      if (hits.length > 0 && !isDragging) {
        const topMesh = hits[0].object as THREE.Mesh;
        setHoveredPoint(topMesh.userData.point as MapPoint);
        meshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mesh === topMesh) {
            mat.emissiveIntensity = 0.9;
            mesh.scale.set(1.3, 1.3, 1.3);
          } else {
            mat.emissiveIntensity = 0.2;
            mesh.scale.set(1, 1, 1);
          }
        });
      } else {
        setHoveredPoint(null);
        meshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.3;
          mesh.scale.set(1, 1, 1);
        });
      }

      renderer.render(scene, camera);
    };

    if (quality.animate) {
      frame = requestAnimationFrame(render);
    } else {
      renderer.render(scene, camera);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("themechange", onThemeChange);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("webglcontextlost", onContextLost);
      renderer.dispose();
      element.replaceChildren();
    };
  }, [points, onUnsupported, onSelectPoint]);

  return (
    <div className="task-map-wrapper">
      <div ref={host} className="task-map-host" />

      {/* Floating Hover Card */}
      {hoveredPoint && (
        <div className="map-hover-card" role="tooltip">
          <div className="hover-card-head">
            <span className="module-pill" style={{ borderColor: moduleColor(hoveredPoint.task.module) }}>
              {hoveredPoint.task.module}
            </span>
            <strong>{hoveredPoint.task.id}</strong>
            <span className={`verdict-pill ${hoveredPoint.task.expected_verdict}`}>
              {hoveredPoint.task.expected_verdict}
            </span>
          </div>
          <div className="hover-card-body">
            <div className="history-preview-snippet">
              <code>{hoveredPoint.task.history || hoveredPoint.task.prompt?.slice(0, 70) || `Task ${hoveredPoint.task.id}`}</code>
            </div>
            <div className="hover-meta-row">
              <span>Ops: {hoveredPoint.task.difficulty?.operations ?? hoveredPoint.task.difficulty?.operation_count ?? "—"}</span>
              <span>Keys: {hoveredPoint.task.difficulty?.keys ?? hoveredPoint.task.difficulty?.key_count ?? "—"}</span>
              <span>Tier: {hoveredPoint.task.control ? "Control" : "Core"}</span>
            </div>
          </div>
          <div className="hover-card-hint">Click point to inspect full task details</div>
        </div>
      )}
    </div>
  );
}
