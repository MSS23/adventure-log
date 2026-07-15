import * as THREE from 'three'

interface AirplanePalette {
  body?: number
  accent?: number
  windows?: number
}

function triangle(
  points: [number, number, number][],
  material: THREE.Material,
): THREE.Mesh {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points.flat(), 3),
  )
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, material)
}

/** Lightweight, recognizable aircraft model oriented nose-first along +Z. */
export function createAirplaneModel({
  body = 0xfff7ef,
  accent = 0xff6b35,
  windows = 0x263746,
}: AirplanePalette = {}): THREE.Group {
  const group = new THREE.Group()
  group.name = 'adventure-log-airplane'

  const bodyMaterial = new THREE.MeshLambertMaterial({
    color: body,
    emissive: 0x261c17,
    emissiveIntensity: 0.55,
  })
  const accentMaterial = new THREE.MeshLambertMaterial({
    color: accent,
    emissive: 0x361208,
    emissiveIntensity: 0.7,
    side: THREE.DoubleSide,
  })
  const wingMaterial = new THREE.MeshLambertMaterial({
    color: body,
    emissive: 0x1f1814,
    emissiveIntensity: 0.45,
    side: THREE.DoubleSide,
  })
  const windowMaterial = new THREE.MeshBasicMaterial({ color: windows })

  const fuselage = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.34, 3.8, 4, 10),
    bodyMaterial,
  )
  fuselage.rotation.x = Math.PI / 2
  group.add(fuselage)

  // Swept wings: broad enough to read at globe scale without looking like a
  // paper dart. Each side is a single low-poly triangular panel.
  group.add(
    triangle([[0, 0.05, 0.85], [2.55, 0, -0.45], [0, 0.05, -1.05]], wingMaterial),
    triangle([[0, 0.05, 0.85], [-2.55, 0, -0.45], [0, 0.05, -1.05]], wingMaterial),
  )

  // Tail plane and vertical stabiliser.
  group.add(
    triangle([[0, 0.08, -1.45], [1.15, 0.08, -2.05], [0, 0.08, -2.15]], wingMaterial),
    triangle([[0, 0.08, -1.45], [-1.15, 0.08, -2.05], [0, 0.08, -2.15]], wingMaterial),
    triangle([[0, 0.2, -1.45], [0, 1.05, -2.02], [0, 0.2, -2.18]], accentMaterial),
  )

  // Coral engine pods and a dark cockpit make the silhouette legible in both
  // the daylight globe and Wrapped's near-black cinematic globe.
  for (const x of [-1.05, 1.05]) {
    const engine = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.55, 3, 8),
      accentMaterial,
    )
    engine.rotation.x = Math.PI / 2
    engine.position.set(x, -0.18, -0.05)
    group.add(engine)
  }

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 6), windowMaterial)
  cockpit.scale.set(0.75, 0.45, 1.25)
  cockpit.position.set(0, 0.23, 1.45)
  group.add(cockpit)

  return group
}

export function disposeAirplaneModel(object: THREE.Object3D) {
  const materials = new Set<THREE.Material>()
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.geometry.dispose()
    const material = child.material
    if (Array.isArray(material)) material.forEach((item) => materials.add(item))
    else materials.add(material)
  })
  materials.forEach((material) => material.dispose())
}
