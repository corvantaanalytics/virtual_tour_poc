import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Card } from '@/components/ui/card';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import basketballMuseumPanorama from '@/assets/basketball-museum-hd-panorama.jpg';

interface Hotspot {
  id: string;
  position: [number, number, number];
  title: string;
  description: string;
  details: string;
}

const hotspots: Hotspot[] = [
  {
    id: 'jersey-display',
    position: [45, -5, -8], // Front-right area
    title: 'Vintage Jerseys Collection',
    description: 'Historic basketball jerseys from legendary players',
    details: 'This display features authentic game-worn jerseys from basketball legends including Michael Jordan\'s Chicago Bulls #23, Magic Johnson\'s Lakers #32, and Larry Bird\'s Celtics #33. Each jersey represents a pivotal moment in basketball history.'
  },
  {
    id: 'trophy-case',
    position: [-90, 10, -6], // Left wall
    title: 'Championship Trophies',
    description: 'NBA Championship trophies and awards',
    details: 'The Larry O\'Brien Trophy collection showcasing championship victories from different eras. These trophies represent the pinnacle of basketball achievement and the dedication of championship teams.'
  },
  {
    id: 'basketball-collection',
    position: [135, -10, 4], // Back-right area
    title: 'Signed Basketball Collection',
    description: 'Game balls signed by basketball legends',
    details: 'A curated collection of basketballs signed by Hall of Fame players, including rare game balls from historic matches, All-Star games, and playoff series that defined basketball history.'
  },
  {
    id: 'poster-gallery',
    position: [-135, 5, 2], // Back-left area
    title: 'Basketball Poster Gallery',
    description: 'Iconic basketball posters and memorabilia',
    details: 'Vintage promotional posters, championship banners, and rare photographs capturing the golden moments of basketball. These pieces showcase the evolution of the sport\'s visual culture.'
  }
];

export const PanoramicViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const sphereRef = useRef<THREE.Mesh>();
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraRotation, setCameraRotation] = useState({ x: 0, y: 0 });

  // Convert spherical coordinates to screen position
  const getScreenPosition = (longitude: number, latitude: number) => {
    // Convert degrees to normalized coordinates (0-1)
    const x = ((longitude + 180) % 360) / 360;
    const y = (90 - latitude) / 180;
    
    return {
      left: `${x * 100}%`,
      top: `${y * 100}%`
    };
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Load panoramic texture
    const loader = new THREE.TextureLoader();
    loader.load(
      basketballMuseumPanorama,
      (texture) => {
        // Create sphere geometry for panorama
        const geometry = new THREE.SphereGeometry(500, 60, 40);
        geometry.scale(-1, 1, 1); // Invert for inside view

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide
        });

        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        sphereRef.current = sphere;
        setIsLoading(false);
      },
      undefined,
      (error) => {
        console.error('Error loading panorama:', error);
        setIsLoading(false);
      }
    );

    // Position camera
    camera.position.set(0, 0, 0);

    // Mouse controls
    const handleMouseDown = (event: MouseEvent) => {
      isDraggingRef.current = true;
      previousMouseRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = event.clientX - previousMouseRef.current.x;
      const deltaY = event.clientY - previousMouseRef.current.y;

      const newRotationY = camera.rotation.y - deltaX * 0.005;
      const newRotationX = camera.rotation.x - deltaY * 0.005;

      camera.rotation.y = newRotationY;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, newRotationX));
      
      // Update state for hotspot positioning
      setCameraRotation({
        x: camera.rotation.x,
        y: camera.rotation.y
      });

      previousMouseRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (event: WheelEvent) => {
      const fov = camera.fov + event.deltaY * 0.05;
      camera.fov = Math.max(10, Math.min(120, fov));
      camera.updateProjectionMatrix();
    };

    // Event listeners
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel);

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const resetView = () => {
    if (cameraRef.current) {
      cameraRef.current.rotation.set(0, 0, 0);
      cameraRef.current.fov = 75;
      cameraRef.current.updateProjectionMatrix();
    }
  };

  const zoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.fov = Math.max(10, cameraRef.current.fov - 10);
      cameraRef.current.updateProjectionMatrix();
    }
  };

  const zoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.fov = Math.min(120, cameraRef.current.fov + 10);
      cameraRef.current.updateProjectionMatrix();
    }
  };

  return (
    <div className="relative w-full h-screen bg-museum-dark overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-museum-dark">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-museum-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-museum-text">Loading Museum...</p>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="absolute bottom-6 left-6 flex gap-3">
        <Button
          variant="secondary"
          size="icon"
          onClick={zoomIn}
          className="bg-museum-card/80 border-museum-border hover:bg-museum-gold hover:text-museum-dark transition-smooth backdrop-blur-sm"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={zoomOut}
          className="bg-museum-card/80 border-museum-border hover:bg-museum-gold hover:text-museum-dark transition-smooth backdrop-blur-sm"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={resetView}
          className="bg-museum-card/80 border-museum-border hover:bg-museum-gold hover:text-museum-dark transition-smooth backdrop-blur-sm"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Hotspots */}
      {hotspots.map((hotspot) => {
        const screenPos = getScreenPosition(hotspot.position[0], hotspot.position[1]);
        
        return (
          <div
            key={hotspot.id}
            className="fixed w-8 h-8 cursor-pointer transform -translate-x-4 -translate-y-4 z-10 pointer-events-auto"
            style={screenPos}
            onClick={() => setSelectedHotspot(hotspot)}
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-museum-gold shadow-gold animate-pulse hover:scale-125 transition-smooth flex items-center justify-center border-2 border-museum-text">
                <div className="w-4 h-4 rounded-full bg-museum-dark"></div>
              </div>
              {/* Glowing ring animation */}
              <div className="absolute inset-0 w-8 h-8 rounded-full bg-museum-gold/30 animate-ping"></div>
              {/* Label */}
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-museum-card/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-museum-text whitespace-nowrap border border-museum-border">
                {hotspot.title}
              </div>
            </div>
          </div>
        );
      })}

      {/* Information Panel */}
      {selectedHotspot && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm z-20">
          <Card className="max-w-2xl w-full bg-museum-card/95 border-museum-border backdrop-blur-md">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-museum-gold">{selectedHotspot.title}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedHotspot(null)}
                  className="text-museum-text-muted hover:text-museum-text hover:bg-museum-border"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-museum-text mb-4 text-lg">{selectedHotspot.description}</p>
              <p className="text-museum-text-muted leading-relaxed">{selectedHotspot.details}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-6 left-6 right-6">
        <Card className="bg-museum-card/80 border-museum-border backdrop-blur-sm">
          <div className="p-4">
            <h1 className="text-2xl font-bold text-museum-gold mb-2">Basketball Museum</h1>
            <p className="text-museum-text-muted text-sm">
              Click and drag to explore • Scroll to zoom • Click golden hotspots to learn more
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};