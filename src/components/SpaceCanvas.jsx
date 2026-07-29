import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const SpaceCanvas = ({ collectedStonesCount = 0 }) => {
  const containerRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollY = useRef(0);
  const [webglError, setWebglError] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let scene, camera, renderer, frameId;

    try {
      console.log('[DEBUG] SpaceCanvas: Initializing Living S.H.I.E.L.D. visualizer');
      
      // --- Scene Setup ---
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x05070b, 0.015);

      camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        150
      );
      camera.position.set(0, 0, 9);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      
      containerRef.current.appendChild(renderer.domElement);

      // --- Volumetric & Layered Accent Lighting ---
      const ambientLight = new THREE.AmbientLight(0x091428, 1.8);
      scene.add(ambientLight);

      // Arc reactor blue light
      const reactorLight = new THREE.PointLight(0x00f5ff, 4.5, 15);
      reactorLight.position.set(-4, 2, -2);
      scene.add(reactorLight);

      // Gold accent spotlight
      const goldLight = new THREE.DirectionalLight(0xffd84a, 1.0);
      goldLight.position.set(6, 6, 4);
      scene.add(goldLight);

      // Sweeping warm light
      const sweepLight = new THREE.PointLight(0x7f5cff, 2.5, 20);
      sweepLight.position.set(0, 0, 5);
      scene.add(sweepLight);

      // --- Starfield Background ---
      const starsCount = 2000;
      const starsGeometry = new THREE.BufferGeometry();
      const starsPositions = new Float32Array(starsCount * 3);
      const starsColors = new Float32Array(starsCount * 3);

      const colorsPalette = [
        new THREE.Color(0x00f5ff),
        new THREE.Color(0xffd84a),
        new THREE.Color(0x7f5cff),
        new THREE.Color(0xffffff)
      ];

      for (let i = 0; i < starsCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 25 + Math.random() * 50;

        starsPositions[i] = r * Math.sin(phi) * Math.cos(theta);
        starsPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        starsPositions[i + 2] = r * Math.cos(phi);

        const color = colorsPalette[Math.floor(Math.random() * colorsPalette.length)];
        starsColors[i] = color.r;
        starsColors[i + 1] = color.g;
        starsColors[i + 2] = color.b;
      }

      starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
      starsGeometry.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));

      const starsMaterial = new THREE.PointsMaterial({
        size: 0.14,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
      });

      const starField = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(starField);

      // --- Floating Holographic SHIELD Emblem (Wireframe Logo Crest) ---
      const shieldEmblemGroup = new THREE.Group();
      shieldEmblemGroup.position.set(0, 3.8, -6);
      scene.add(shieldEmblemGroup);

      const shieldMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        wireframe: true,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending
      });

      // Outer rings representing SHIELD orbit lines
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.04, 8, 64), shieldMat);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.02, 6, 48), shieldMat);
      const innerTorus = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 4, 32), shieldMat);
      
      shieldEmblemGroup.add(ring1);
      shieldEmblemGroup.add(ring2);
      shieldEmblemGroup.add(innerTorus);

      // Torus ring divisions (spokes)
      const spokeMat = new THREE.LineBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.2 });
      const spokeGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -2.5, 0),
        new THREE.Vector3(0, 2.5, 0)
      ]);
      for (let i = 0; i < 4; i++) {
        const spoke = new THREE.Line(spokeGeom, spokeMat);
        spoke.rotation.z = (i / 4) * Math.PI;
        shieldEmblemGroup.add(spoke);
      }

      // --- Floating Holographic Drones ---
      const dronesGroup = new THREE.Group();
      scene.add(dronesGroup);

      const droneData = [
        { pos: new THREE.Vector3(-6, -1, -3), bobOffset: 0, bobSpeed: 1.2 },
        { pos: new THREE.Vector3(6, 1.5, -4), bobOffset: Math.PI, bobSpeed: 0.9 }
      ];
      const droneMeshes = [];

      droneData.forEach((data) => {
        const drone = new THREE.Group();
        drone.position.copy(data.pos);

        // Core chassis cylinder
        const bodyGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 6);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          wireframe: true,
          roughness: 0.8
        });
        const mesh = new THREE.Mesh(bodyGeom, bodyMat);
        drone.add(mesh);

        // Ring fan guards
        const fanGuardGeom = new THREE.TorusGeometry(0.35, 0.02, 4, 16);
        const fanGuardMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.3 });
        const guard = new THREE.Mesh(fanGuardGeom, fanGuardMat);
        guard.rotation.x = Math.PI / 2;
        drone.add(guard);

        // Flashing drone status light core
        const lightCoreGeom = new THREE.SphereGeometry(0.06, 8, 8);
        const lightCoreMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
        const lightCore = new THREE.Mesh(lightCoreGeom, lightCoreMat);
        lightCore.position.y = 0.1;
        drone.add(lightCore);

        const pointLight = new THREE.PointLight(0x00f5ff, 2.0, 4);
        pointLight.position.copy(lightCore.position);
        drone.add(pointLight);

        dronesGroup.add(drone);
        droneMeshes.push({
          group: drone,
          lightCoreMat,
          pointLight,
          baseY: data.pos.y,
          bobOffset: data.bobOffset,
          bobSpeed: data.bobSpeed
        });
      });

      // --- Orbiting Stark Satellites ---
      const satellitesGroup = new THREE.Group();
      scene.add(satellitesGroup);

      const satelliteGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6);
      const satelliteMat = new THREE.MeshStandardMaterial({ color: 0xffd84a, metalness: 0.95, roughness: 0.1 });
      
      const satelliteData = [
        { radius: 11, speed: 0.2, angle: 0, tilt: Math.PI / 6 },
        { radius: 14, speed: -0.15, angle: Math.PI, tilt: -Math.PI / 4 }
      ];
      const satellites = [];

      satelliteData.forEach((sData) => {
        const sat = new THREE.Mesh(satelliteGeom, satelliteMat);
        
        // Solar panel wings
        const panelGeom = new THREE.BoxGeometry(0.35, 0.01, 0.1);
        const panelMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.5 });
        const panels = new THREE.Mesh(panelGeom, panelMat);
        sat.add(panels);

        satellitesGroup.add(sat);
        satellites.push({
          mesh: sat,
          radius: sData.radius,
          speed: sData.speed,
          angle: sData.angle,
          tilt: sData.tilt
        });
      });

      // --- Meteor Streaks System (Shooting Stars) ---
      const meteorCount = 12;
      const meteorGeometry = new THREE.BufferGeometry();
      const meteorPositions = new Float32Array(meteorCount * 3);
      
      // Initialize out of screen bounds
      for (let i = 0; i < meteorCount * 3; i += 3) {
        meteorPositions[i] = -999;
        meteorPositions[i + 1] = -999;
        meteorPositions[i + 2] = -999;
      }
      meteorGeometry.setAttribute('position', new THREE.BufferAttribute(meteorPositions, 3));
      
      const meteorMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.28,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      });
      const meteors = new THREE.Points(meteorGeometry, meteorMat);
      scene.add(meteors);

      const meteorPool = [];
      for (let i = 0; i < meteorCount; i++) {
        meteorPool.push({
          active: false,
          x: 0, y: 0, z: 0,
          vx: 0, vy: 0,
          length: 0,
          life: 0
        });
      }

      // --- Holographic Face Helmet Visor (Central centerpiece) ---
      const helmetGroup = new THREE.Group();
      helmetGroup.position.set(0, -0.4, -0.5);
      scene.add(helmetGroup);

      const faceBaseGeom = new THREE.SphereGeometry(1.6, 24, 16);
      const faceWireMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        wireframe: true,
        transparent: true,
        opacity: 0.08
      });
      const faceBase = new THREE.Mesh(faceBaseGeom, faceWireMat);
      helmetGroup.add(faceBase);

      const visorRings = [];
      const ringColors = [0x00f5ff, 0xffd84a, 0x7f5cff];
      for (let i = 0; i < 4; i++) {
        const radius = 1.7 + i * 0.15;
        const ringGeom = new THREE.TorusGeometry(radius, 0.02, 8, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: ringColors[i % ringColors.length],
          transparent: true,
          opacity: 0.22 - i * 0.04,
          blending: THREE.AdditiveBlending
        });
        const rMesh = new THREE.Mesh(ringGeom, ringMat);
        rMesh.rotation.x = Math.PI / 2;
        rMesh.rotation.y = (Math.random() - 0.5) * 0.5;
        helmetGroup.add(rMesh);
        visorRings.push(rMesh);
      }

      const eyeGeom = new THREE.BoxGeometry(0.5, 0.08, 0.08);
      const eyeMat = new THREE.MeshBasicMaterial({
        color: 0xf7ffff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      
      const eyeLeft = new THREE.Mesh(eyeGeom, eyeMat);
      eyeLeft.position.set(-0.45, 0.45, 1.4);
      eyeLeft.rotation.y = 0.15;
      
      const eyeRight = new THREE.Mesh(eyeGeom, eyeMat);
      eyeRight.position.set(0.45, 0.45, 1.4);
      eyeRight.rotation.y = -0.15;

      helmetGroup.add(eyeLeft);
      helmetGroup.add(eyeRight);

      // --- Arc Reactor Mesh Model ---
      const arcReactorGroup = new THREE.Group();
      arcReactorGroup.position.set(-4.5, 2, -2);
      scene.add(arcReactorGroup);

      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x3a4f5f,
        metalness: 0.95,
        roughness: 0.15
      });
      const reactorRing = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 12, 48), ringMat);
      arcReactorGroup.add(reactorRing);

      const reactorCoreMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      });
      const reactorCore = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 24), reactorCoreMat);
      reactorCore.rotation.x = Math.PI / 2;
      arcReactorGroup.add(reactorCore);

      // --- Floating Infinity Stones ---
      const stonesData = [
        { color: 0x00f5ff, pos: new THREE.Vector3(4.5, 2.5, -2), scale: 0.3, speed: 1.0 },
        { color: 0xffd84a, pos: new THREE.Vector3(5.5, 0.5, -1), scale: 0.35, speed: 0.8 },
        { color: 0xe62429, pos: new THREE.Vector3(4.2, -1.8, -2), scale: 0.28, speed: 1.2 },
        { color: 0x7f5cff, pos: new THREE.Vector3(-4.8, -2, -3), scale: 0.32, speed: 0.9 },
        { color: 0x00ff66, pos: new THREE.Vector3(-3.8, -0.5, -1), scale: 0.3, speed: 1.1 },
        { color: 0xff9900, pos: new THREE.Vector3(-3.2, 1.8, -2), scale: 0.29, speed: 0.7 }
      ];
      const stoneMeshes = [];

      stonesData.forEach((stone, idx) => {
        const gemGeom = new THREE.IcosahedronGeometry(1, 0);
        const gemMat = new THREE.MeshPhysicalMaterial({
          color: stone.color,
          emissive: stone.color,
          emissiveIntensity: 0.3,
          roughness: 0.05,
          metalness: 0.1,
          transmission: 0.9,
          thickness: 0.8,
          transparent: true,
          opacity: idx < collectedStonesCount ? 0.95 : 0.4
        });

        const mesh = new THREE.Mesh(gemGeom, gemMat);
        mesh.position.copy(stone.pos);
        mesh.scale.setScalar(stone.scale);
        
        mesh.userData = {
          basePos: stone.pos.clone(),
          floatOffset: Math.random() * 100,
          speed: stone.speed
        };

        const gemLight = new THREE.PointLight(stone.color, 1.5, 3);
        mesh.add(gemLight);
        scene.add(mesh);
        stoneMeshes.push(mesh);
      });

      // --- Interactions / Event Listeners ---
      const handleMouseMove = (e) => {
        mouse.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
      };

      const handleScroll = () => {
        scrollY.current = window.scrollY;
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('scroll', handleScroll);

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      // --- Animation Loop ---
      const clock = new THREE.Clock();

      const animate = () => {
        frameId = requestAnimationFrame(animate);

        const time = clock.getElapsedTime();

        // Mouse Parallax coordinates interpolation
        mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.075;
        mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.075;

        // Starfield slow rotation
        starField.rotation.y = time * 0.005;
        starField.rotation.x = time * 0.002;

        // Floating Drones bobbing & blinking
        droneMeshes.forEach((drone) => {
          const bob = Math.sin(time * drone.bobSpeed + drone.bobOffset) * 0.25;
          drone.group.position.y = drone.baseY + bob;
          drone.group.rotation.y = time * 0.4;
          
          // flashing status light logic
          const flash = Math.sin(time * 8.0 + drone.bobOffset) > 0;
          drone.lightCoreMat.color.setHex(flash ? 0x00f5ff : 0x023d42);
          drone.pointLight.intensity = flash ? 3.0 : 0.2;
        });

        // Satellites orbital movement
        satellites.forEach((sat) => {
          sat.angle += sat.speed * 0.015;
          sat.mesh.position.x = Math.cos(sat.angle) * sat.radius;
          sat.mesh.position.z = Math.sin(sat.angle) * sat.radius;
          sat.mesh.position.y = Math.sin(sat.angle * 0.5) * 3.0;
          
          sat.mesh.rotation.y += 0.015;
          sat.mesh.rotation.x += 0.005;
        });

        // S.H.I.E.L.D Emblem rotation
        shieldEmblemGroup.rotation.z = -time * 0.15;
        shieldEmblemGroup.rotation.y = Math.sin(time * 0.2) * 0.3;

        // Meteor streaks spawning and drawing
        if (Math.random() < 0.04) {
          // spawn new meteor streak
          const inactive = meteorPool.find(m => !m.active);
          if (inactive) {
            inactive.active = true;
            inactive.x = (Math.random() - 0.5) * 35;
            inactive.y = 8 + Math.random() * 8;
            inactive.z = -5 - Math.random() * 15;
            inactive.vx = -12 - Math.random() * 8;
            inactive.vy = -6 - Math.random() * 4;
            inactive.life = 1.0;
          }
        }

        const positions = meteorGeometry.attributes.position.array;
        meteorPool.forEach((m, idx) => {
          const i = idx * 3;
          if (m.active) {
            m.x += m.vx * 0.016;
            m.y += m.vy * 0.016;
            m.life -= 0.035;

            positions[i] = m.x;
            positions[i + 1] = m.y;
            positions[i + 2] = m.z;

            if (m.life <= 0) {
              m.active = false;
            }
          } else {
            positions[i] = -999;
            positions[i + 1] = -999;
            positions[i + 2] = -999;
          }
        });
        meteorGeometry.attributes.position.needsUpdate = true;

        // Volumetric Light Sweep modulation
        sweepLight.position.x = Math.sin(time * 0.8) * 8;
        sweepLight.position.y = Math.cos(time * 0.6) * 4;
        
        // Arc reactor rotation
        reactorRing.rotation.y = time * 0.35;
        reactorCoreMat.opacity = 0.55 + Math.sin(time * 8.0) * 0.25;

        // floating infinity stones
        stoneMeshes.forEach((stone, index) => {
          const uData = stone.userData;
          const floatY = Math.sin(time * 1.5 * uData.speed + uData.floatOffset) * 0.16;
          const targetPos = uData.basePos.clone();
          targetPos.y += floatY;

          stone.position.lerp(targetPos, 0.08);
          stone.rotation.y += 0.012 * uData.speed;
        });

        // Central helmet rotation
        const targetHelmetRotY = mouse.current.x * 0.45;
        const targetHelmetRotX = -mouse.current.y * 0.3;
        helmetGroup.rotation.y += (targetHelmetRotY - helmetGroup.rotation.y) * 0.05;
        helmetGroup.rotation.x += (targetHelmetRotX - helmetGroup.rotation.x) * 0.05;

        visorRings.forEach((ring, i) => {
          ring.rotation.z += 0.005 * (i + 1);
        });

        // Visor eyes blinking
        if (Math.random() > 0.985) {
          eyeMat.opacity = 0.25;
        } else {
          eyeMat.opacity = 0.8 + Math.sin(time * 10) * 0.12;
        }

        // --- 🎥 Dynamic Camera Drift & Breathing (Sprint 5) ---
        const driftX = Math.sin(time * 0.4) * 0.18;
        const driftY = Math.cos(time * 0.3) * 0.14;
        const driftZ = Math.sin(time * 0.25) * 0.12; // breathing zoom drift

        const targetCamX = mouse.current.x * 0.9;
        const targetCamY = mouse.current.y * 0.6;
        const scrollFactor = (scrollY.current / window.innerHeight) * 3;
        const targetCamZ = 9.5 - scrollFactor;

        camera.position.x += (targetCamX + driftX - camera.position.x) * 0.05;
        camera.position.y += (targetCamY + driftY - camera.position.y) * 0.05;
        camera.position.z += (targetCamZ + driftZ - camera.position.z) * 0.05;

        // Tiny camera orbital rotation tilt
        camera.rotation.z += (Math.sin(time * 0.15) * 0.015 - camera.rotation.z) * 0.05;

        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };

      animate();

      // Clean up WebGL Context
      return () => {
        console.log('[DEBUG] SpaceCanvas: Disposing WebGL context');
        cancelAnimationFrame(frameId);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);

        // Recursive traversal release
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat) => mat.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });

        if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }

        renderer.dispose();
        scene.clear();
      };

    } catch (err) {
      console.error('[DEBUG] SpaceCanvas: WebGL context failure:', err);
      setWebglError(err.message || 'WebGL initialization failed');
    }
  }, [collectedStonesCount]);

  if (webglError) {
    return (
      <div 
        className="background-canvas-container"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#05070b',
          color: '#e62429',
          fontFamily: 'var(--font-hud)',
          textAlign: 'center',
          padding: '20px'
        }}
      >
        <div style={{ fontSize: '2.5rem', textShadow: '0 0 10px #e62429', fontWeight: 900, marginBottom: '20px' }}>
          🛑 VISUALIZER CORE INTERRUPT
        </div>
        <div style={{ fontSize: '1rem', color: '#00f5ff', maxWidth: '600px', lineHeight: '1.6' }}>
          THE 3D MULTIVERSE RENDERER ENCOUNTERED A ERROR OR ENGINE OUTOFMEMORY ANOMALY.
          <br /><br />
          <span style={{ color: '#fff', opacity: 0.6 }}>ERROR SPECIFICATION: {webglError}</span>
          <br /><br />
          RUNNING SECURE PROCEDURAL FALLBACK SYSTEMS. EARTH-616 COMMAND CENTER PORTALS REMAIN ONLINE.
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="background-canvas-container" 
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

export default SpaceCanvas;
