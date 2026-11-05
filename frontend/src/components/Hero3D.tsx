import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { moduleColor } from "../visualization/layout";
import { getInitialTheme } from "../theme";

interface HeroNode {
  id: string;
  module: "M1" | "M2" | "M3" | "M4" | "M5";
  label: string;
  pos: [number, number, number];
  reads: string;
  writes: string;
  anomaly?: string;
}

const DEMO_NODES: HeroNode[] = [
  {
    id: "T1",
    module: "M1",
    label: "T1 (Snapshot Read)",
    pos: [-3.2, 1.4, 0.8],
    reads: "x=0 @ snapshot",
    writes: "y=1",
  },
  {
    id: "T2",
    module: "M1",
    label: "T2 (Concurrent Write)",
    pos: [3.1, -1.2, 0.4],
    reads: "y=0 @ snapshot",
    writes: "x=1",
  },
  {
    id: "T3",
    module: "M2",
    label: "T3 (Commit Ordered)",
    pos: [-1.4, -2.2, 2.1],
    reads: "x=1 (ww edge)",
    writes: "z=2",
  },
  {
    id: "T4",
    module: "M2",
    label: "T4 (G2-item Cycle)",
    pos: [1.8, 2.3, -1.5],
    reads: "z=0 (rw edge)",
    writes: "x=2",
    anomaly: "G2-item rw-cycle",
  },
  {
    id: "T5",
    module: "M3",
    label: "T5 (2PC Prepared)",
    pos: [-2.5, -0.8, -2.2],
    reads: "k=0",
    writes: "k=1",
    anomaly: "In-doubt completion",
  },
  {
    id: "T6",
    module: "M4",
    label: "T6 (Linearizable Reg)",
    pos: [2.6, 0.6, -2.6],
    reads: "reg=1",
    writes: "reg=2",
  },
  {
    id: "T7",
    module: "M5",
    label: "T7 (Strict Serial)",
    pos: [0.1, 2.8, 1.2],
    reads: "y=1 (wr edge)",
    writes: "w=3",
  },
  {
    id: "T8",
    module: "M2",
    label: "T8 (Dirty Read Prevented)",
    pos: [0.2, -2.9, -0.6],
    reads: "init x=0",
    writes: "v=1",
  },
];

const EDGES: [number, number, "ww" | "wr" | "rw"][] = [
  [0, 1, "rw"],
  [1, 0, "rw"],
  [0, 2, "wr"],
  [2, 3, "ww"],
  [3, 0, "rw"],
  [4, 0, "wr"],
  [6, 3, "ww"],
  [7, 2, "wr"],
  [5, 6, "wr"],
];

const EDGE_COLORS = {
  ww: "#f59e0b", // amber
  wr: "#0d9488", // teal
  rw: "#ef4444", // red (anomaly cycle)
};

export function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [selectedNode, setSelectedNode] = useState<HeroNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<HeroNode | null>(null);
  const [webglError, setWebglError] = useState(false);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglError(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 10.5);

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;
    container.replaceChildren(renderer.domElement);

    // Root rotating group
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Lighting setup adapted for both themes
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x70e1c4, 1.1);
    dirLight1.position.set(5, 8, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.7);
    dirLight2.position.set(-6, -4, -4);
    scene.add(dirLight2);

    // Lattice wireframe sphere
    const latticeGeom = new THREE.IcosahedronGeometry(4.8, 1);
    const isInitialLight = getInitialTheme() === "light";
    const latticeMat = new THREE.MeshBasicMaterial({
      color: isInitialLight ? 0x94a3b8 : 0x22364a,
      wireframe: true,
      transparent: true,
      opacity: isInitialLight ? 0.35 : 0.4,
    });
    const latticeMesh = new THREE.Mesh(latticeGeom, latticeMat);
    worldGroup.add(latticeMesh);

    // Create Transaction Nodes
    const nodeMeshes: THREE.Mesh[] = [];
    DEMO_NODES.forEach((node) => {
      const col = new THREE.Color(moduleColor(node.module));
      const sphereGeom = new THREE.SphereGeometry(0.38, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.2,
        metalness: 0.25,
        emissive: col,
        emissiveIntensity: 0.35,
      });
      const mesh = new THREE.Mesh(sphereGeom, sphereMat);
      mesh.position.set(...node.pos);
      mesh.userData = { node };

      // Outer glow halo ring
      const ringGeom = new THREE.RingGeometry(0.48, 0.54, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      mesh.add(ring);

      worldGroup.add(mesh);
      nodeMeshes.push(mesh);
    });

    // Create Dependency Edges (ww, wr, rw)
    EDGES.forEach(([fromIdx, toIdx, type]) => {
      const fromPos = new THREE.Vector3(...DEMO_NODES[fromIdx].pos);
      const toPos = new THREE.Vector3(...DEMO_NODES[toIdx].pos);
      const mid = new THREE.Vector3()
        .addVectors(fromPos, toPos)
        .multiplyScalar(0.5);
      mid.normalize().multiplyScalar(fromPos.length() * 0.92);

      const curve = new THREE.QuadraticBezierCurve3(fromPos, mid, toPos);
      const points = curve.getPoints(24);
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(EDGE_COLORS[type]),
        transparent: true,
        opacity: type === "rw" ? 0.85 : 0.5,
        linewidth: 1.5,
      });
      const line = new THREE.Line(geom, mat);
      worldGroup.add(line);
    });

    // Theme listener to update 3D elements dynamically
    const onThemeChange = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ theme: string }>;
      const isLightNow = customEvt.detail?.theme === "light";
      latticeMat.color.setHex(isLightNow ? 0x94a3b8 : 0x22364a);
      latticeMat.opacity = isLightNow ? 0.35 : 0.4;
      ambientLight.intensity = isLightNow ? 1.1 : 0.95;
    };
    window.addEventListener("themechange", onThemeChange);

    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    // Interaction physics state
    let isDragging = false;
    let dragDistance = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let velX = 0;
    let velY = 0;
    let isHoveringNode = false;
    let lastInteractionTime = 0;

    // Distinct, continuous automatic rotation speed (visible and smooth)
    const AUTO_ROT_SPEED_Y = 0.0055;
    const AUTO_ROT_SPEED_X = 0.001;

    const onPointerMove = (evt: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = evt.clientX - prevMouseX;
        const dy = evt.clientY - prevMouseY;
        dragDistance += Math.hypot(dx, dy);

        worldGroup.rotation.y += dx * 0.006;
        worldGroup.rotation.x += dy * 0.006;

        velX = dx * 0.003;
        velY = dy * 0.003;

        prevMouseX = evt.clientX;
        prevMouseY = evt.clientY;
        lastInteractionTime = performance.now();
      }
    };

    const onPointerDown = (evt: PointerEvent) => {
      isDragging = true;
      dragDistance = 0;
      prevMouseX = evt.clientX;
      prevMouseY = evt.clientY;
      velX = 0;
      velY = 0;
      lastInteractionTime = performance.now();
      renderer.domElement.setPointerCapture(evt.pointerId);
    };

    const onPointerUp = (evt: PointerEvent) => {
      if (isDragging) {
        isDragging = false;
        try {
          renderer.domElement.releasePointerCapture(evt.pointerId);
        } catch {
          // ignore capture release errors
        }

        // If drag was minimal, treat as a click to select the node
        if (dragDistance < 6) {
          raycaster.setFromCamera(mouse, camera);
          const hits = raycaster.intersectObjects(nodeMeshes);
          if (hits.length > 0) {
            const hitNode = hits[0].object.userData.node as HeroNode;
            setSelectedNode(hitNode);
          }
        }
      }
    };

    const onPointerCancel = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.style.touchAction = "none";
    dom.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("pointercancel", onPointerCancel);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(container);

    let reqId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const now = performance.now();
      const timeSinceInteraction = now - lastInteractionTime;

      // Handle raycasting for hover highlight
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0 && !isDragging) {
        const topHit = intersects[0].object as THREE.Mesh;
        const hitNode = topHit.userData.node as HeroNode;
        setHoveredNode(hitNode);
        isHoveringNode = true;

        nodeMeshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mesh === topHit) {
            mat.emissiveIntensity = 0.95;
            mesh.scale.set(1.28, 1.28, 1.28);
          } else {
            mat.emissiveIntensity = 0.2;
            mesh.scale.set(1, 1, 1);
          }
        });
      } else {
        setHoveredNode(null);
        isHoveringNode = false;
        nodeMeshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.35;
          mesh.scale.set(1, 1, 1);
        });
      }

      // Smooth physics and automatic rotation
      if (!pausedRef.current) {
        if (isDragging) {
          // Manual drag rotation takes full control
        } else {
          // Apply momentum with damping after release
          if (Math.abs(velX) > 0.0001 || Math.abs(velY) > 0.0001) {
            worldGroup.rotation.y += velX;
            worldGroup.rotation.x += velY;
            velX *= 0.92;
            velY *= 0.92;
          }

          // Active continuous automatic rotation (enabled by default)
          if (timeSinceInteraction > 350) {
            // When hovering directly over a node, slow down to 15% speed for effortless inspection
            const speedFactor = isHoveringNode ? 0.15 : 1.0;
            const deltaScale = Math.min(delta * 60, 2.0); // normalize around 60fps
            worldGroup.rotation.y +=
              AUTO_ROT_SPEED_Y * speedFactor * deltaScale;
            worldGroup.rotation.x +=
              AUTO_ROT_SPEED_X *
              speedFactor *
              deltaScale *
              Math.sin(now * 0.001);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(reqId);
      observer.disconnect();
      window.removeEventListener("themechange", onThemeChange);
      dom.removeEventListener("pointermove", onPointerMove);
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("pointercancel", onPointerCancel);
      renderer.dispose();
      latticeGeom.dispose();
      latticeMat.dispose();
      container.replaceChildren();
    };
  }, []);

  if (webglError) {
    return (
      <div className="hero-3d-fallback" role="status">
        <div className="fallback-inner">
          <span className="badge">WebGL Fallback</span>
          <h4>Transaction Dependency Lattice</h4>
          <p>
            Interactive 3D representation is running in accessible text mode.
            Nodes represent transactions, and edges represent dependency
            relations (ww, wr, rw).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-3d-wrapper" aria-hidden="true">
      <div className="hero-canvas-container" ref={containerRef} />

      {/* Floating interactive tooltip */}
      {hoveredNode && (
        <div className="hero-node-tooltip" role="tooltip">
          <div className="tooltip-head">
            <span
              className="tooltip-badge"
              style={{ background: moduleColor(hoveredNode.module) }}
            >
              {hoveredNode.module}
            </span>
            <strong>{hoveredNode.label}</strong>
          </div>
          <div className="tooltip-body">
            <div>
              <span className="muted">Reads:</span> {hoveredNode.reads}
            </div>
            <div>
              <span className="muted">Writes:</span> {hoveredNode.writes}
            </div>
            {hoveredNode.anomaly && (
              <div className="tooltip-anomaly">
                <span>⚠️ Anomaly:</span> {hoveredNode.anomaly}
              </div>
            )}
          </div>
          <div className="tooltip-hint">Click node to inspect details</div>
        </div>
      )}

      {/* Selected Node Details Card */}
      {selectedNode && (
        <div className="hero-selected-card">
          <div className="selected-head">
            <div className="selected-title">
              <span
                className="module-pill"
                style={{ borderColor: moduleColor(selectedNode.module) }}
              >
                {selectedNode.module}
              </span>
              <h3>{selectedNode.label}</h3>
            </div>
            <button
              type="button"
              className="selected-close"
              onClick={() => setSelectedNode(null)}
              aria-label="Close details"
            >
              ✕
            </button>
          </div>
          <div className="selected-content">
            <p className="selected-desc">
              Transaction node verified against formal rules of{" "}
              {selectedNode.module}. Dependencies trace reads-from relations and
              detect cycle anomalies.
            </p>
            <div className="selected-specs">
              <div>
                <strong>Operation Reads:</strong> {selectedNode.reads}
              </div>
              <div>
                <strong>Operation Writes:</strong> {selectedNode.writes}
              </div>
              {selectedNode.anomaly && (
                <div className="anomaly-callout">
                  <strong>Formal Violation:</strong> {selectedNode.anomaly}
                </div>
              )}
            </div>
            <a href="#/tasks" className="button button-sm button-primary">
              View Matching Tasks in Catalogue →
            </a>
          </div>
        </div>
      )}

      {/* 3D Controls Overlay */}
      <div className="hero-3d-controls">
        <button
          type="button"
          className="control-pill"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Resume 3D rotation" : "Pause 3D rotation"}
        >
          {paused ? "▶ Resume Motion" : "⏸ Pause Motion"}
        </button>
        <span className="control-hint">
          Drag to rotate lattice · Click any node
        </span>
      </div>

      {/* Edge color legend */}
      <div className="hero-edges-legend">
        <span className="legend-item">
          <i style={{ background: EDGE_COLORS.wr }} />
          wr (reads-from)
        </span>
        <span className="legend-item">
          <i style={{ background: EDGE_COLORS.ww }} />
          ww (version order)
        </span>
        <span className="legend-item">
          <i style={{ background: EDGE_COLORS.rw }} />
          rw (anti-dependency cycle)
        </span>
      </div>
    </div>
  );
}
