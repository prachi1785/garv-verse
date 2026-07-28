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
      console.log('[DEBUG] SpaceCanvas: Initializing WebGL Renderer and Scene');
      
      // --- Scene Setup ---
      scene = new THREE.Scene();
      
      // Add atmospheric space fog
      scene.fog = new THREE.FogExp2(0x05070b, 0.02);

      camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        100
      );
      camera.position.set(0, 0, 8);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      
      containerRef.current.appendChild(renderer.domElement);
      console.log('[DEBUG] SpaceCanvas: WebGL context created');

      // --- Lighting ---
      const ambientLight = new THREE.AmbientLight(0x0a1020, 1.5);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0x00f5ff, 1.2);
      dirLight.position.set(5, 5, 5);
      scene.add(dirLight);

      const goldLight = new THREE.DirectionalLight(0xffd84a, 0.6);
      goldLight.position.set(-5, -5, 2);
      scene.add(goldLight);

      // --- Multiverse Starfield Background ---
      const starsCount = 1800;
      const starsGeometry = new THREE.BufferGeometry();
      const starsPositions = new Float32Array(starsCount * 3);
      const starsColors = new Float32Array(starsCount * 3);

      const colorsPalette = [
        new THREE.Color(0x00f5ff), // Cyan
        new THREE.Color(0xffd84a), // Gold
        new THREE.Color(0x7f5cff), // Purple
        new THREE.Color(0xf7ffff)  // White glow
      ];

      for (let i = 0; i < starsCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 20 + Math.random() * 40;

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
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
      });

      const starField = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(starField);

      // --- Nebula Clouds ---
      const nebulaMeshes = [];
      const nebulaColors = [0x7f5cff, 0x00f5ff, 0xe62429, 0x7f5cff, 0x05070b];

      nebulaColors.forEach((colorHex, idx) => {
        const geom = new THREE.SphereGeometry(2 + idx * 1.5, 8, 8);
        const mat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.03 + (idx * 0.01),
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          wireframe: false
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          -10 - idx * 5
        );
        scene.add(mesh);
        nebulaMeshes.push(mesh);
      });

      // --- Floating Arc Reactor ---
      const arcReactorGroup = new THREE.Group();
      arcReactorGroup.position.set(-4, 2, -2);
      scene.add(arcReactorGroup);

      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x3a4f5f,
        metalness: 0.95,
        roughness: 0.15,
        bumpScale: 0.05
      });

      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.08, 12, 48), ringMat);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.06, 12, 48), ringMat);
      const ring3 = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.05, 12, 48), ringMat);
      
      ring2.rotation.x = Math.PI / 4;
      ring3.rotation.y = Math.PI / 6;

      arcReactorGroup.add(ring1);
      arcReactorGroup.add(ring2);
      arcReactorGroup.add(ring3);

      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 24), coreMat);
      core.rotation.x = Math.PI / 2;
      arcReactorGroup.add(core);

      const coreLight = new THREE.PointLight(0x00f5ff, 4, 10);
      arcReactorGroup.add(coreLight);

      const coilGroup = new THREE.Group();
      const coilGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
      const coilMat = new THREE.MeshStandardMaterial({ color: 0xffa500, metalness: 0.8, roughness: 0.3 });
      
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const coil = new THREE.Mesh(coilGeom, coilMat);
        coil.position.set(Math.cos(angle) * 0.78, Math.sin(angle) * 0.78, 0);
        coil.rotation.z = angle + Math.PI / 2;
        coilGroup.add(coil);
      }
      arcReactorGroup.add(coilGroup);

      // --- Floating Infinity Stones ---
      const stonesData = [
        { name: 'Space', color: 0x00f5ff, pos: new THREE.Vector3(4, 2.5, -1), scale: 0.3, speed: 1.0 },
        { name: 'Mind', color: 0xffd84a, pos: new THREE.Vector3(5, 0.5, 0), scale: 0.35, speed: 0.8 },
        { name: 'Reality', color: 0xe62429, pos: new THREE.Vector3(3.8, -1.8, -1), scale: 0.28, speed: 1.2 },
        { name: 'Power', color: 0x7f5cff, pos: new THREE.Vector3(-4.5, -2, -2), scale: 0.32, speed: 0.9 },
        { name: 'Time', color: 0x00ff66, pos: new THREE.Vector3(-3.5, -0.5, 0), scale: 0.3, speed: 1.1 },
        { name: 'Soul', color: 0xff9900, pos: new THREE.Vector3(-2.8, 1.8, -1.5), scale: 0.29, speed: 0.7 }
      ];

      const stoneMeshes = [];

      stonesData.forEach((stone, idx) => {
        const gemGeom = new THREE.IcosahedronGeometry(1, 0);
        const gemMat = new THREE.MeshPhysicalMaterial({
          color: stone.color,
          emissive: stone.color,
          emissiveIntensity: 0.35,
          roughness: 0.05,
          metalness: 0.1,
          transmission: 0.9,
          thickness: 0.8,
          ior: 1.6,
          transparent: true,
          opacity: 0.9
        });

        const mesh = new THREE.Mesh(gemGeom, gemMat);
        mesh.position.copy(stone.pos);
        mesh.scale.setScalar(stone.scale);
        
        mesh.userData = {
          basePos: stone.pos.clone(),
          floatOffset: Math.random() * 100,
          speed: stone.speed,
          active: idx < collectedStonesCount,
          colorHex: stone.color
        };

        const gemLight = new THREE.PointLight(stone.color, 1.8, 3);
        mesh.add(gemLight);

        scene.add(mesh);
        stoneMeshes.push(mesh);
      });

      // --- Interactive Holographic Visor ---
      const helmetGroup = new THREE.Group();
      helmetGroup.position.set(0, 0, -1);
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
          opacity: 0.25 - i * 0.05,
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

      const eyeGlowLight = new THREE.PointLight(0xf7ffff, 1.5, 4);
      eyeGlowLight.position.set(0, 0.45, 1.5);
      helmetGroup.add(eyeGlowLight);

      const facePlateGeom = new THREE.ConeGeometry(0.7, 1.2, 4);
      const facePlateMat = new THREE.MeshStandardMaterial({
        color: 0x1a2838,
        wireframe: true,
        transparent: true,
        opacity: 0.3
      });
      const facePlate = new THREE.Mesh(facePlateGeom, facePlateMat);
      facePlate.position.set(0, -0.2, 1.35);
      facePlate.rotation.x = -Math.PI / 5;
      helmetGroup.add(facePlate);

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

        mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08;
        mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08;

        starField.rotation.y = time * 0.008;
        starField.rotation.x = time * 0.003;

        nebulaMeshes.forEach((mesh, index) => {
          mesh.rotation.y = time * (0.01 + index * 0.004);
          mesh.rotation.z = time * (0.005 + index * 0.002);
        });

        ring1.rotation.z = time * 0.25;
        ring1.rotation.y = Math.sin(time * 0.1) * 0.2;
        
        ring2.rotation.z = -time * 0.4;
        ring2.rotation.x = Math.PI / 4 + Math.cos(time * 0.15) * 0.15;
        
        ring3.rotation.z = time * 0.6;
        
        const pulseIntensity = 3.5 + Math.sin(time * 6) * 0.8;
        coreLight.intensity = pulseIntensity;
        coreMat.opacity = 0.5 + Math.sin(time * 6) * 0.3;

        stoneMeshes.forEach((stone, index) => {
          const uData = stone.userData;
          const speedMult = uData.speed;
          
          const floatY = Math.sin(time * 1.5 * speedMult + uData.floatOffset) * 0.15;
          const targetPos = uData.basePos.clone();
          targetPos.y += floatY;

          const mouse3D = new THREE.Vector3(
            mouse.current.x * 5,
            mouse.current.y * 3,
            stone.position.z
          );

          const dist = stone.position.distanceTo(mouse3D);
          if (dist < 2.5) {
            const dir = new THREE.Vector3().subVectors(stone.position, mouse3D).normalize();
            const force = (2.5 - dist) * 0.45;
            targetPos.addScaledVector(dir, force);
          }

          stone.position.lerp(targetPos, 0.08);

          stone.rotation.y += 0.01 * speedMult;
          stone.rotation.x += 0.005 * speedMult;

          if (index < collectedStonesCount) {
            stone.material.emissiveIntensity = 0.85 + Math.sin(time * 5 + index) * 0.3;
            stone.material.opacity = 0.95;
          } else {
            stone.material.emissiveIntensity = 0.15;
            stone.material.opacity = 0.4;
          }
        });

        const targetHelmetRotY = mouse.current.x * 0.45;
        const targetHelmetRotX = -mouse.current.y * 0.3;
        
        helmetGroup.rotation.y += (targetHelmetRotY - helmetGroup.rotation.y) * 0.05;
        helmetGroup.rotation.x += (targetHelmetRotX - helmetGroup.rotation.x) * 0.05;

        visorRings.forEach((ring, i) => {
          ring.rotation.z += 0.005 * (i + 1);
        });

        if (Math.random() > 0.98) {
          eyeMat.opacity = 0.2;
          eyeGlowLight.intensity = 0.3;
        } else {
          eyeMat.opacity = 0.8 + Math.sin(time * 12) * 0.15;
          
          const mouseCenterDist = Math.sqrt(mouse.current.x * mouse.current.x + mouse.current.y * mouse.current.y);
          if (mouseCenterDist < 0.4) {
            eyeMat.color.setHex(0xffd84a);
            eyeGlowLight.color.setHex(0xffd84a);
            eyeGlowLight.intensity = 3.5;
            facePlate.position.y = -0.05;
          } else {
            eyeMat.color.setHex(0xf7ffff);
            eyeGlowLight.color.setHex(0xf7ffff);
            eyeGlowLight.intensity = 1.8 + Math.sin(time * 6) * 0.4;
            facePlate.position.y = -0.2;
          }
        }

        const targetCamX = mouse.current.x * 0.8;
        const targetCamY = mouse.current.y * 0.6;
        const scrollFactor = (scrollY.current / window.innerHeight) * 3;
        const targetCamZ = 8 - scrollFactor;

        camera.position.x += (targetCamX - camera.position.x) * 0.05;
        camera.position.y += (targetCamY - camera.position.y) * 0.05;
        camera.position.z += (targetCamZ - camera.position.z) * 0.05;

        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };

      animate();

      // Clean up WebGL Context
      return () => {
        console.log('[DEBUG] SpaceCanvas: Disposing WebGL context and freeing GPU memory');
        cancelAnimationFrame(frameId);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);

        // Recursive traversal release
        scene.traverse((obj) => {
          if (obj.geometry) {
            obj.geometry.dispose();
          }
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
        console.log('[DEBUG] SpaceCanvas: WebGL resources disposed cleanly');
      };

    } catch (err) {
      console.error('[DEBUG] SpaceCanvas: WebGL Context failure occurred:', err);
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
