import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, TransformControls } from '@react-three/drei'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import JSZip from 'jszip'
import { TextureLoader, Box3, Vector3, MeshStandardMaterial, Mesh, Group, BufferGeometry, SRGBColorSpace } from 'three'

const SCENE_PRESETS = {
  default: {
    name: 'Default Cube',
    boxColor: '#f97316',
    boxSize: [1, 1, 1],
    gridVisible: true,
  },
  templeLayout: {
    name: 'Temple Layout',
    boxColor: '#eab308',
    boxSize: [3, 0.4, 2],
    gridVisible: true,
  },
  tombChamber: {
    name: 'Tomb Chamber',
    boxColor: '#22c55e',
    boxSize: [1.5, 1, 2],
    gridVisible: false,
  },
}

// Configure renderer for proper color space on mobile
function RendererConfig() {
  const { gl } = useThree()
  useEffect(() => {
    gl.outputColorSpace = SRGBColorSpace
  }, [gl])
  return null
}

function TexturedBox({ boxSize, color, textureUrl, texturesEnabled }) {
  const texture = useLoader(TextureLoader, textureUrl)
  return (
    <mesh scale={boxSize}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} map={texturesEnabled ? texture : null} />
    </mesh>
  )
}

function Arch3DScene({ config, textureUrl, texturesEnabled }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} />
      {textureUrl && texturesEnabled ? (
        <TexturedBox
          boxSize={config.boxSize}
          color={config.boxColor}
          textureUrl={textureUrl}
          texturesEnabled={texturesEnabled}
        />
      ) : (
        <mesh scale={config.boxSize}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={config.boxColor} />
        </mesh>
      )}
      {config.gridVisible && <gridHelper args={[40, 40]} />}
    </>
  )
}

function ColladaScene({ model, texturesEnabled, transformMode, transformEnabled }) {
  const { scene } = useLoader(
    ColladaLoader,
    model.daeUrl,
    (loader) => {
      loader.manager.setURLModifier((url) => {
        // Try multiple matching strategies
        const originalUrl = url
        const urlLower = url.toLowerCase()
        const fileName = (url.split('/').pop() ?? url.split('\\').pop() ?? url).toLowerCase()
        const fileNameNoExt = fileName.replace(/\.(jpg|jpeg|png|webp)$/i, '')
        
        // Extract path relative to textures folder if present
        const texturesRelativePath = urlLower.includes('textures/') 
          ? urlLower.split('textures/').pop() ?? fileName
          : null
        
        console.log(`[URL Modifier] Requested texture URL: ${url} -> filename: ${fileName}${texturesRelativePath ? `, textures relative: ${texturesRelativePath}` : ''}`)
        
        // Strategy 1: Exact filename match (lowercase)
        if (model.textureUrlMap[fileName]) {
          console.log(`[Texture Match] Found exact filename match: ${fileName}`)
          return model.textureUrlMap[fileName]
        }
        
        // Strategy 2: Match textures/ relative path
        if (texturesRelativePath && model.textureUrlMap[texturesRelativePath]) {
          console.log(`[Texture Match] Found textures/ relative match: ${texturesRelativePath}`)
          return model.textureUrlMap[texturesRelativePath]
        }
        
        // Strategy 3: Match full path
        if (model.textureUrlMap[urlLower]) {
          console.log(`[Texture Match] Found full path match: ${urlLower}`)
          return model.textureUrlMap[urlLower]
        }
        
        // Strategy 4: Match by filename without extension
        const matchByBaseName = Object.keys(model.textureUrlMap).find(
          (key) => key.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, '') === fileNameNoExt
        )
        if (matchByBaseName) {
          console.log(`[Texture Match] Found basename match: ${fileName} -> ${matchByBaseName}`)
          return model.textureUrlMap[matchByBaseName]
        }
        
        // Strategy 5: Match by key containing the requested filename
        const containsMatch = Object.keys(model.textureUrlMap).find(
          (key) => key.toLowerCase().includes(fileName) || fileName.includes(key.toLowerCase())
        )
        if (containsMatch) {
          console.log(`[Texture Match] Found contains match: ${fileName} -> ${containsMatch}`)
          return model.textureUrlMap[containsMatch]
        }
        
        // Strategy 6: Match by key parts (e.g., "defaultmaterial_1001_albedo" matches "defaultmaterial_1001_albedo.jpg")
        const partsMatch = Object.keys(model.textureUrlMap).find((key) => {
          const keyLower = key.toLowerCase()
          const keyParts = keyLower.replace(/\.(jpg|jpeg|png|webp)$/i, '').split(/[_\-\s]/)
          const urlParts = fileNameNoExt.split(/[_\-\s]/)
          return keyParts.some(part => urlParts.includes(part) && part.length > 3)
        })
        if (partsMatch) {
          console.log(`[Texture Match] Found parts match: ${fileName} -> ${partsMatch}`)
          return model.textureUrlMap[partsMatch]
        }
        
        console.log(`[Texture Match] No match found for: ${fileName}. Available keys:`, Object.keys(model.textureUrlMap).slice(0, 10))
        return originalUrl
      })
    }
  )

  const wrapped = useMemo(() => {
    const textureLoader = new TextureLoader()
    
    console.log('[ColladaScene] Processing scene, textures enabled:', texturesEnabled)
    console.log('[ColladaScene] Available textures:', Object.keys(model.textureUrlMap))
    console.log('[ColladaScene] Scene children count:', scene.children.length)
    
    // Calculate bounding box to ensure model is visible
    const box = new Box3().setFromObject(scene)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    console.log('[ColladaScene] Model bounds - size:', size, 'center:', center)
    
    // If model is at origin or very small, log warning
    if (size.length() < 0.01) {
      console.warn('[ColladaScene] Model appears to be very small or empty')
    }
    
    scene.traverse((child) => {
      child.castShadow = true
      child.receiveShadow = true

      const material = child.material
      if (material) {
        const mats = Array.isArray(material) ? material : [material]
        mats.forEach((m, index) => {
          if (!m.userData) m.userData = {}
          m.userData.index = index
          
          // Ensure material has basic properties so it's visible
          if (!m.color) m.color = { r: 0.8, g: 0.8, b: 0.8 }
          if (m.color && typeof m.color.set === 'function') {
            m.color.set(0xcccccc) // Light gray default
          }
          m.emissive = m.emissive || { r: 0, g: 0, b: 0 }
          if (m.emissive && typeof m.emissive.set === 'function') {
            m.emissive.set(0x000000)
          }
          
          // If textures are enabled and we have a texture map, try to apply textures
          if (texturesEnabled && Object.keys(model.textureUrlMap).length > 0) {
            // Check if material has a map property that references a texture
            if (m.map) {
              const mapSrc = m.map.image?.src || m.map.source?.data || ''
              const fileName = (mapSrc.split('/').pop() ?? mapSrc).split('?')[0].toLowerCase()
              
              console.log(`[Material] Material has map, src: ${mapSrc}, filename: ${fileName}`)
              
              // Try to find matching texture
              let matchedTextureUrl = null
              
              // Strategy 1: Exact filename match
              if (model.textureUrlMap[fileName]) {
                matchedTextureUrl = model.textureUrlMap[fileName]
                console.log(`[Material] Found exact match: ${fileName}`)
              } else {
                const fileNameNoExt = fileName.replace(/\.(jpg|jpeg|png|webp)$/i, '')
                
                // Strategy 2: Match by filename without extension
                const matchByBaseName = Object.keys(model.textureUrlMap).find(
                  (key) => key.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, '') === fileNameNoExt
                )
                if (matchByBaseName) {
                  matchedTextureUrl = model.textureUrlMap[matchByBaseName]
                  console.log(`[Material] Found basename match: ${fileName} -> ${matchByBaseName}`)
                } else {
                  // Strategy 3: Try parts matching (e.g., "defaultmaterial_1001_albedo" matches "defaultmaterial_1001_albedo.jpeg")
                  const partsMatch = Object.keys(model.textureUrlMap).find((key) => {
                    const keyLower = key.toLowerCase()
                    const keyParts = keyLower.replace(/\.(jpg|jpeg|png|webp)$/i, '').split(/[_\-\s]/)
                    const urlParts = fileNameNoExt.split(/[_\-\s]/)
                    // Check if all significant parts match (length > 2)
                    const significantParts = urlParts.filter(p => p.length > 2)
                    return significantParts.length > 0 && significantParts.every(part => keyParts.includes(part))
                  })
                  if (partsMatch) {
                    matchedTextureUrl = model.textureUrlMap[partsMatch]
                    console.log(`[Material] Found parts match: ${fileName} -> ${partsMatch}`)
                  } else {
                    // Strategy 4: Try reverse matching - check if any texture key contains the filename parts
                    const reverseMatch = Object.keys(model.textureUrlMap).find((key) => {
                      const keyLower = key.toLowerCase()
                      const urlParts = fileNameNoExt.split(/[_\-\s]/).filter(p => p.length > 2)
                      return urlParts.some(part => keyLower.includes(part))
                    })
                    if (reverseMatch) {
                      matchedTextureUrl = model.textureUrlMap[reverseMatch]
                      console.log(`[Material] Found reverse match: ${fileName} -> ${reverseMatch}`)
                    } else {
                      // Strategy 5: If filename contains "albedo", try to find any texture with "albedo" in the name
                      if (fileNameNoExt.includes('albedo')) {
                        const albedoMatch = Object.keys(model.textureUrlMap).find((key) => 
                          key.toLowerCase().includes('albedo')
                        )
                        if (albedoMatch) {
                          matchedTextureUrl = model.textureUrlMap[albedoMatch]
                          console.log(`[Material] Found albedo match: ${fileName} -> ${albedoMatch}`)
                        }
                      }
                    }
                  }
                }
              }
              
              if (matchedTextureUrl) {
                try {
                  const newTexture = textureLoader.load(matchedTextureUrl, () => {
                    console.log(`[Material] Texture loaded successfully: ${matchedTextureUrl}`)
                    // Configure texture for mobile devices
                    newTexture.flipY = false
                    newTexture.colorSpace = SRGBColorSpace
                    m.needsUpdate = true
                  }, undefined, (err) => {
                    console.error(`[Material] Failed to load texture: ${matchedTextureUrl}`, err)
                  })
                  newTexture.flipY = false
                  newTexture.colorSpace = SRGBColorSpace
                  m.map = newTexture
                  m.needsUpdate = true
                } catch (error) {
                  console.error(`[Material] Error loading texture: ${matchedTextureUrl}`, error)
                }
              } else {
                console.log(`[Material] No texture match found for: ${fileName}`)
                // Ensure material is still visible without texture
                if (m.color && typeof m.color.set === 'function') {
                  m.color.set(0xcccccc)
                }
              }
            } else if (Object.keys(model.textureUrlMap).length > 0) {
              // Material has no map, try to match by material name or apply textures systematically
              const materialName = m.name?.toLowerCase() || ''
              const textureKeys = Object.keys(model.textureUrlMap)
              
              // Try to find texture that matches material name
              let matchedTextureUrl = null
              
              if (materialName) {
                const nameMatch = textureKeys.find(key => 
                  key.toLowerCase().includes(materialName) || 
                  materialName.includes(key.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, ''))
                )
                if (nameMatch) {
                  matchedTextureUrl = model.textureUrlMap[nameMatch]
                  console.log(`[Material] Matched texture by material name: ${materialName} -> ${nameMatch}`)
                }
              }
              
              // If no name match, try to match by index or use next available texture
              if (!matchedTextureUrl && textureKeys.length > 0) {
                // Try to match by material index if available
                const materialIndex = m.userData?.index ?? 0
                if (textureKeys[materialIndex]) {
                  matchedTextureUrl = model.textureUrlMap[textureKeys[materialIndex]]
                  console.log(`[Material] Matched texture by index: ${materialIndex} -> ${textureKeys[materialIndex]}`)
                } else {
                  // Use first available texture
                  matchedTextureUrl = model.textureUrlMap[textureKeys[0]]
                  console.log(`[Material] Using first available texture: ${textureKeys[0]}`)
                }
              }
              
              if (matchedTextureUrl) {
                try {
                  const newTexture = textureLoader.load(matchedTextureUrl, () => {
                    // Configure texture for mobile devices
                    newTexture.flipY = false
                    newTexture.colorSpace = SRGBColorSpace
                    m.map = newTexture
                    m.needsUpdate = true
                    console.log(`[Material] Texture applied: ${matchedTextureUrl}`)
                  }, undefined, (err) => {
                    console.error(`[Material] Failed to load texture: ${matchedTextureUrl}`, err)
                  })
                  newTexture.flipY = false
                  newTexture.colorSpace = SRGBColorSpace
                } catch (error) {
                  console.error(`[Material] Error loading texture:`, error)
                  // Fallback: ensure material is visible even if texture fails
                  if (m.color && typeof m.color.set === 'function') {
                    m.color.set(0xcccccc)
                  }
                }
              }
            }
            
            // Ensure material is visible even if no textures were applied
            if (!m.map && m.color && typeof m.color.set === 'function') {
              m.color.set(0xcccccc)
            }
            m.needsUpdate = true
          } else if (!texturesEnabled) {
            // Store original map before clearing
            if (!m.userData.__origMap && m.map) {
              m.userData.__origMap = m.map
            }
            m.map = null
            m.needsUpdate = true
          } else if (texturesEnabled && m.userData.__origMap) {
            // Restore original map
            m.map = m.userData.__origMap
            m.needsUpdate = true
          }
        })
      }
    })
    return scene
  }, [scene, texturesEnabled, model.textureUrlMap, model.version])

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 10, 5]} intensity={2.0} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.8} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />
      <primitive object={wrapped} />
      {transformEnabled && transformMode && (
        <TransformControls
          mode={transformMode}
          object={wrapped}
          showX={true}
          showY={true}
          showZ={true}
        />
      )}
      <gridHelper args={[80, 80]} />
    </>
  )
}

function OBJModelScene({ modelUrl, textureUrlMap, texturesEnabled, transformMode, transformEnabled, scale }) {
  const loadedData = useLoader(OBJLoader, modelUrl, (loader) => {
    if (loader.manager && loader.manager.setURLModifier) {
      loader.manager.setURLModifier((url) => {
        const fileName = (url.split('/').pop() ?? url.split('\\').pop() ?? url).toLowerCase()
        if (textureUrlMap[fileName]) {
          return textureUrlMap[fileName]
        }
        return url
      })
    }
    return loader
  })
  const scene = loadedData
  return <ModelSceneContent scene={scene} textureUrlMap={textureUrlMap} texturesEnabled={texturesEnabled} transformMode={transformMode} transformEnabled={transformEnabled} scale={scale} />
}

function STLModelScene({ modelUrl, textureUrlMap, texturesEnabled, transformMode, transformEnabled, scale }) {
  const geometry = useLoader(STLLoader, modelUrl)
  const group = useMemo(() => {
    const g = new Group()
    // Compute normals for proper lighting
    if (geometry) {
      geometry.computeVertexNormals()
      const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: 0xcccccc }))
      g.add(mesh)
    }
    return g
  }, [geometry])
  return <ModelSceneContent scene={group} textureUrlMap={textureUrlMap} texturesEnabled={texturesEnabled} transformMode={transformMode} transformEnabled={transformEnabled} scale={scale} />
}

function DAEModelScene({ modelUrl, textureUrlMap, texturesEnabled, transformMode, transformEnabled, scale }) {
  const { scene } = useLoader(ColladaLoader, modelUrl, (loader) => {
    if (loader.manager && loader.manager.setURLModifier) {
      loader.manager.setURLModifier((url) => {
        const fileName = (url.split('/').pop() ?? url.split('\\').pop() ?? url).toLowerCase()
        if (textureUrlMap[fileName]) {
          return textureUrlMap[fileName]
        }
        return url
      })
    }
    return loader
  })
  return <ModelSceneContent scene={scene} textureUrlMap={textureUrlMap} texturesEnabled={texturesEnabled} transformMode={transformMode} transformEnabled={transformEnabled} scale={scale} />
}

function ModelSceneContent({ scene, textureUrlMap, texturesEnabled, transformMode, transformEnabled, scale }) {
  // Calculate base scale and position offset only once when scene loads (from original, unmodified scene)
  const baseScaleAndPositionOffset = useMemo(() => {
    if (!scene) return { baseScale: 1, positionOffset: new Vector3(0, 0, 0) }
    
    // Calculate from original scene geometry (before any modifications)
    const box = new Box3().setFromObject(scene)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const baseScale = maxDim > 0 ? (10 / maxDim) : 1
    
    // Calculate the offset needed to place model level with grid (bottom at y=0)
    // X and Z are centered, Y is positioned so bottom is at y=0
    const positionOffset = new Vector3(
      -center.x,           // Center horizontally (X)
      -box.min.y,          // Place bottom at y=0 (Y)
      -center.z            // Center depth-wise (Z)
    )
    
    return { baseScale, positionOffset }
  }, [scene])

  // Apply positioning and scaling
  const processedScene = useMemo(() => {
    if (!scene) return null

    // Position the scene using the pre-calculated offset (from original, unmodified scene)
    // This places the model level with the grid (bottom at y=0) and centers it horizontally
    // This ensures the model stays in the same place when scaling
    scene.position.copy(baseScaleAndPositionOffset.positionOffset)
    
    // Apply base scale and user scale (this only affects size, not position)
    scene.scale.setScalar(baseScaleAndPositionOffset.baseScale * scale)

    return scene
  }, [scene, baseScaleAndPositionOffset, scale])

  // Handle texture replacement after scene loads
  useEffect(() => {
    if (!processedScene || !texturesEnabled || Object.keys(textureUrlMap).length === 0) {
      return
    }

    const textureLoader = new TextureLoader()
    
    const replaceTextures = () => {
      processedScene.traverse((child) => {
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          mats.forEach((m) => {
            // Set material color to white when textures are enabled
            if (m.color && typeof m.color.set === 'function') {
              m.color.set(0xffffff)
            }
            
            if (m.map) {
              const mapSrc = m.map.image?.src || m.map.source?.data || ''
              const fileName = (mapSrc.split('/').pop() ?? mapSrc).split('?')[0].toLowerCase()
              
              // Try to find matching texture
              let matchedTextureUrl = null
              
              // Strategy 1: Exact filename match
              if (textureUrlMap[fileName]) {
                matchedTextureUrl = textureUrlMap[fileName]
              } else {
                // Strategy 2: Match by filename without extension
                const fileNameNoExt = fileName.replace(/\.(jpg|jpeg|png|webp)$/i, '')
                const matchByBaseName = Object.keys(textureUrlMap).find(
                  (key) => key.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, '') === fileNameNoExt
                )
                if (matchByBaseName) {
                  matchedTextureUrl = textureUrlMap[matchByBaseName]
                } else {
                  // Strategy 3: Match by parts (e.g., "defaultmaterial_1001_albedo" matches "defaultmaterial_1001_albedo.jpeg")
                  const partsMatch = Object.keys(textureUrlMap).find((key) => {
                    const keyLower = key.toLowerCase()
                    const keyParts = keyLower.replace(/\.(jpg|jpeg|png|webp)$/i, '').split(/[_\-\s]/)
                    const urlParts = fileNameNoExt.split(/[_\-\s]/)
                    // Check if all significant parts match (length > 2)
                    const significantParts = urlParts.filter(p => p.length > 2)
                    return significantParts.length > 0 && significantParts.every(part => keyParts.includes(part))
                  })
                  if (partsMatch) {
                    matchedTextureUrl = textureUrlMap[partsMatch]
                  } else {
                    // Strategy 4: Try reverse matching - check if any texture key contains the filename parts
                    const reverseMatch = Object.keys(textureUrlMap).find((key) => {
                      const keyLower = key.toLowerCase()
                      const urlParts = fileNameNoExt.split(/[_\-\s]/).filter(p => p.length > 2)
                      return urlParts.some(part => keyLower.includes(part))
                    })
                    if (reverseMatch) {
                      matchedTextureUrl = textureUrlMap[reverseMatch]
                    } else {
                      // Strategy 5: If filename contains "albedo", try to find any texture with "albedo" in the name
                      if (fileNameNoExt.includes('albedo')) {
                        const albedoMatch = Object.keys(textureUrlMap).find((key) => 
                          key.toLowerCase().includes('albedo')
                        )
                        if (albedoMatch) {
                          matchedTextureUrl = textureUrlMap[albedoMatch]
                        }
                      }
                    }
                  }
                }
              }
              
              if (matchedTextureUrl) {
                textureLoader.load(matchedTextureUrl, (texture) => {
                  // Configure texture for mobile devices
                  texture.flipY = false
                  texture.colorSpace = SRGBColorSpace
                  m.map = texture
                  m.needsUpdate = true
                }, undefined, (err) => {
                  console.error(`[ModelSceneContent] Failed to load texture: ${matchedTextureUrl}`, err)
                })
              }
            } else if (Object.keys(textureUrlMap).length > 0) {
              // Material has no map, try to match by material name or index
              const materialName = m.name?.toLowerCase() || ''
              const textureKeys = Object.keys(textureUrlMap)
              
              let matchedTextureUrl = null
              
              if (materialName) {
                const nameMatch = textureKeys.find(key => 
                  key.toLowerCase().includes(materialName) || 
                  materialName.includes(key.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, ''))
                )
                if (nameMatch) {
                  matchedTextureUrl = textureUrlMap[nameMatch]
                }
              }
              
              // If no name match, use first available texture
              if (!matchedTextureUrl && textureKeys.length > 0) {
                matchedTextureUrl = textureUrlMap[textureKeys[0]]
              }
              
              if (matchedTextureUrl) {
                textureLoader.load(matchedTextureUrl, (texture) => {
                  // Configure texture for mobile devices
                  texture.flipY = false
                  texture.colorSpace = SRGBColorSpace
                  m.map = texture
                  m.needsUpdate = true
                }, undefined, (err) => {
                  console.error(`[ModelSceneContent] Failed to load texture: ${matchedTextureUrl}`, err)
                })
              }
            }
            
            // Ensure material is visible even if no textures were applied
            if (!m.map && m.color && typeof m.color.set === 'function') {
              m.color.set(0xcccccc)
            }
            m.needsUpdate = true
          })
        }
      })
    }

    // Replace textures at multiple intervals to catch textures that load later
    const timeouts = [
      setTimeout(replaceTextures, 100),
      setTimeout(replaceTextures, 300),
      setTimeout(replaceTextures, 600),
      setTimeout(replaceTextures, 1000)
    ]

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [processedScene, texturesEnabled, textureUrlMap])

  // Handle texture disable
  useEffect(() => {
    if (!processedScene || texturesEnabled) {
      return
    }

    processedScene.traverse((child) => {
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((m) => {
          if (!m.userData.__origMap && m.map) {
            m.userData.__origMap = m.map
          }
          m.map = null
          m.needsUpdate = true
        })
      }
    })
  }, [processedScene, texturesEnabled])

  if (!processedScene) {
    console.error('[ModelScene] Failed to process scene')
    return null
  }

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 10, 5]} intensity={2.0} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.8} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />
      <primitive object={processedScene} />
      {transformEnabled && transformMode && (
        <TransformControls
          mode={transformMode}
          object={processedScene}
          showX={true}
          showY={true}
          showZ={true}
        />
      )}
      <gridHelper args={[80, 80]} />
    </>
  )
}

function ModelScene({ model, texturesEnabled, transformMode, transformEnabled, scale }) {
  if (model.modelType === 'obj') {
    return <OBJModelScene modelUrl={model.modelUrl} textureUrlMap={model.textureUrlMap} texturesEnabled={texturesEnabled} transformMode={transformMode} transformEnabled={transformEnabled} scale={scale} />
  } else if (model.modelType === 'stl') {
    return <STLModelScene modelUrl={model.modelUrl} textureUrlMap={model.textureUrlMap} texturesEnabled={texturesEnabled} transformMode={transformMode} transformEnabled={transformEnabled} scale={scale} />
  } else {
    return <DAEModelScene modelUrl={model.modelUrl} textureUrlMap={model.textureUrlMap} texturesEnabled={texturesEnabled} transformMode={transformMode} transformEnabled={transformEnabled} scale={scale} />
  }
}

export default function Arch3DVisualizer({ showBackToHub = false, backToUrl = '/' }) {
  const [presetKey, setPresetKey] = useState('default')
  const [sceneConfig, setSceneConfig] = useState(SCENE_PRESETS.default)
  const [status, setStatus] = useState(null)
  const [zipModel, setZipModel] = useState(null)
  const [modelConfig, setModelConfig] = useState(null)
  const [source, setSource] = useState('preset')
  const [customTextureUrl, setCustomTextureUrl] = useState(null)
  const [texturesEnabled, setTexturesEnabled] = useState(true)
  const [transformEnabled, setTransformEnabled] = useState(false)
  const [transformMode, setTransformMode] = useState(null)
  const [modelScale, setModelScale] = useState(1.0)
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false)

  // Auto-clear status message after 5 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => {
        setStatus(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [status])

  // Close tools menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      if (toolsMenuOpen && target instanceof HTMLElement && !target.closest('.tools-menu-container')) {
        setToolsMenuOpen(false)
      }
    }
    if (toolsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [toolsMenuOpen])

  const handlePresetChange = (event) => {
    const value = event.target.value
    setPresetKey(value)
    setSceneConfig(SCENE_PRESETS[value])
    setStatus(`Loaded preset: ${SCENE_PRESETS[value].name}`)
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(sceneConfig, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `${sceneConfig.name.replace(/\s+/g, '-').toLowerCase()}-scene.json`
    a.click()

    URL.revokeObjectURL(url)
    setStatus('Exported current scene configuration as JSON')
  }

  const handleImport = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)

        if (
          typeof parsed.name === 'string' &&
          typeof parsed.boxColor === 'string' &&
          Array.isArray(parsed.boxSize) &&
          parsed.boxSize.length === 3 &&
          typeof parsed.gridVisible === 'boolean'
        ) {
          const nextConfig = {
            name: parsed.name,
            boxColor: parsed.boxColor,
            boxSize: [parsed.boxSize[0], parsed.boxSize[1], parsed.boxSize[2]],
            gridVisible: parsed.gridVisible,
          }
          setSceneConfig(nextConfig)
          setPresetKey('default')
          setStatus(`Imported scene: ${nextConfig.name}`)
        } else {
          setStatus('Import failed: invalid scene JSON shape')
        }
      } catch (error) {
        console.error(error)
        setStatus('Import failed: could not parse JSON')
      } finally {
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  const handleModelImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    const isObj = fileName.endsWith('.obj')
    const isDae = fileName.endsWith('.dae')
    const isStl = fileName.endsWith('.stl')

    if (!isObj && !isDae && !isStl) {
      setStatus('Model import failed: file must be .dae, .obj, or .stl')
      event.target.value = ''
      return
    }

    try {
      setStatus('Loading model...')

      // Clean up old model if exists
      if (modelConfig) {
        if (modelConfig.modelUrl) {
          URL.revokeObjectURL(modelConfig.modelUrl)
        }
        Object.values(modelConfig.textureUrlMap).forEach((url) => {
          URL.revokeObjectURL(url)
        })
      }

      const modelUrl = URL.createObjectURL(file)
      const modelType = isObj ? 'obj' : isStl ? 'stl' : 'dae'

      // Use existing textures if available, otherwise empty map
      const textureUrlMap = modelConfig?.textureUrlMap || {}

      const newModelConfig = {
        name: file.name.replace(/\.(dae|obj|stl)$/i, ''),
        modelUrl,
        modelType,
        textureUrlMap,
        version: 0,
      }

      setModelConfig(newModelConfig)
      setSource('model')
      setTexturesEnabled(true)
      setStatus(`Imported ${modelType.toUpperCase()} model: ${newModelConfig.name}${Object.keys(textureUrlMap).length > 0 ? ' (with existing textures)' : ''}`)
    } catch (error) {
      console.error(error)
      setStatus('Model import failed: could not load file')
    } finally {
      event.target.value = ''
    }
  }

  const handleZipImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setStatus('Processing ZIP archive...')
      const zip = await JSZip.loadAsync(file)

      // Find first .dae file
      const daeEntry = Object.values(zip.files).find((entry) =>
        entry.name.toLowerCase().endsWith('.dae')
      )

      if (!daeEntry) {
        setStatus('ZIP import failed: no .dae file found')
        event.target.value = ''
        return
      }

      // Build texture map (by filename)
      const textureUrlMap = {}
      const texturePromises = []

      Object.values(zip.files).forEach((entry) => {
        const lower = entry.name.toLowerCase()
        if (
          !entry.dir &&
          (lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.png') ||
            lower.endsWith('.webp'))
        ) {
          const promise = entry.async('blob').then((blob) => {
            const url = URL.createObjectURL(blob)
            // Store multiple keys for better matching
            const fullPath = lower
            const fileName = (entry.name.split('/').pop() ?? entry.name).toLowerCase()
            const fileNameNoExt = fileName.replace(/\.(jpg|jpeg|png|webp)$/i, '')
            
            // Store by filename (most common case)
            textureUrlMap[fileName] = url
            // Also store by full path in case .dae references it
            textureUrlMap[fullPath] = url
            // Store path relative to textures folder if it's in textures/
            if (fullPath.includes('textures/')) {
              const relativePath = fullPath.split('textures/').pop() ?? fileName
              textureUrlMap[relativePath] = url
              textureUrlMap[`textures/${relativePath}`] = url
            }
            // Store by basename without extension for flexible matching
            if (fileNameNoExt !== fileName) {
              textureUrlMap[fileNameNoExt] = url
            }
          })
          texturePromises.push(promise)
        }
      })

      await Promise.all(texturePromises)

      const daeBlob = await daeEntry.async('blob')
      const daeUrl = URL.createObjectURL(daeBlob)

      console.log('[Import ZIP] Texture map:', Object.keys(textureUrlMap))
      console.log('[Import ZIP] Total textures:', Object.keys(textureUrlMap).length)

      const modelConfig = {
        name: file.name.replace(/\.zip$/i, ''),
        daeUrl,
        textureUrlMap,
        version: 0,
      }

      setZipModel(modelConfig)
      setSource('zip')
      setTexturesEnabled(true)
      setStatus(`Imported ZIP model: ${modelConfig.name}`)
    } catch (error) {
      console.error(error)
      setStatus('ZIP import failed: could not read archive')
    } finally {
      event.target.value = ''
    }
  }

  const handleTextureUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setStatus('Texture upload failed: file is not an image')
      event.target.value = ''
      return
    }

    const url = URL.createObjectURL(file)
    setCustomTextureUrl(url)
    setTexturesEnabled(true)
    setStatus(`Loaded texture: ${file.name}`)
    event.target.value = ''
  }

  const handleFolderImport = async (event) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      setStatus('Processing folder...')

      const fileArr = Array.from(files)
      const daeFile = fileArr.find((f) => f.name.toLowerCase().endsWith('.dae'))
      
      // Look for textures in root and in "textures" subfolder
      const textureFiles = fileArr.filter((file) => {
        const lower = file.name.toLowerCase()
        const path = file.name.toLowerCase()
        const isImage = lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.png') ||
          lower.endsWith('.webp')
        
        // Include textures from root or from "textures" folder
        const inTexturesFolder = path.includes('textures/') || path.includes('textures\\')
        const inRoot = !path.includes('/') && !path.includes('\\')
        
        return isImage && (inRoot || inTexturesFolder)
      })
      
      console.log('[Import Folder] Found texture files:', textureFiles.map(f => f.name))

      // Case 1: textures only (no .dae)
      if (!daeFile && textureFiles.length > 0) {
        // 1a. If an imported model is active, treat as new textures for that model
        if (source === 'model' && modelConfig) {
          // Merge with existing textures instead of replacing
          const newTextureUrlMap = { ...modelConfig.textureUrlMap }

          await Promise.all(
            textureFiles.map(async (file) => {
              const url = URL.createObjectURL(file)
              // Store multiple keys for better matching
              const fullPath = file.name.toLowerCase()
              const fileName = (file.name.split('/').pop() ?? file.name.split('\\').pop() ?? file.name).toLowerCase()
              const fileNameNoExt = fileName.replace(/\.(jpg|jpeg|png|webp)$/i, '')
              
              // Store by filename (most common case)
              newTextureUrlMap[fileName] = url
              // Also store by full path in case .dae references it
              newTextureUrlMap[fullPath] = url
              // Store path relative to textures folder if it's in textures/
              if (fullPath.includes('textures/') || fullPath.includes('textures\\')) {
                const relativePath = fullPath.split(/textures[\/\\]/).pop() ?? fileName
                newTextureUrlMap[relativePath] = url
                newTextureUrlMap[`textures/${relativePath}`] = url
              }
              // Store by basename without extension for flexible matching
              if (fileNameNoExt !== fileName) {
                newTextureUrlMap[fileNameNoExt] = url
              }
            })
          )

          console.log('[Import Folder] Texture map updated:', Object.keys(newTextureUrlMap))
          console.log('[Import Folder] Total textures:', Object.keys(newTextureUrlMap).length)
          
          setModelConfig({
            ...modelConfig,
            textureUrlMap: newTextureUrlMap,
            version: modelConfig.version + 1,
          })
          setStatus(
            `Updated imported model textures from folder: ${textureFiles.length} images (merged with existing)`
          )
          return
        }

        // 1b. No imported model -> treat as texture library for presets
        const first = textureFiles[0]
        const url = URL.createObjectURL(first)
        setCustomTextureUrl(url)
        setTexturesEnabled(true)
        setSource('preset')
        setStatus(`Imported texture folder: ${textureFiles.length} images (using ${first.name})`)
        return
      }

      // Case 2: .dae + textures -> imported model
      if (!daeFile) {
        setStatus('Folder import failed: no .dae or texture images found')
        event.target.value = ''
        return
      }

      const textureUrlMap = {}

      await Promise.all(
        textureFiles.map(async (file) => {
          const url = URL.createObjectURL(file)
          // Store multiple keys for better matching
          const fullPath = file.name.toLowerCase()
          const fileName = (file.name.split('/').pop() ?? file.name.split('\\').pop() ?? file.name).toLowerCase()
          const fileNameNoExt = fileName.replace(/\.(jpg|jpeg|png|webp)$/i, '')
          
          // Store by filename (most common case)
          textureUrlMap[fileName] = url
          // Also store by full path in case .dae references it
          textureUrlMap[fullPath] = url
          // Store path relative to textures folder if it's in textures/
          if (fullPath.includes('textures/') || fullPath.includes('textures\\')) {
            const relativePath = fullPath.split(/textures[\/\\]/).pop() ?? fileName
            textureUrlMap[relativePath] = url
            textureUrlMap[`textures/${relativePath}`] = url
          }
          // Store by basename without extension for flexible matching
          if (fileNameNoExt !== fileName) {
            textureUrlMap[fileNameNoExt] = url
          }
          // Store by significant parts (e.g., "defaultmaterial_1001_albedo" for "defaultmaterial_1001_albedo.jpeg")
          const parts = fileNameNoExt.split(/[_\-\s]/).filter(p => p.length > 2)
          if (parts.length > 0) {
            const partsKey = parts.join('_')
            textureUrlMap[partsKey] = url
          }
          // If filename contains "albedo", store a special key for albedo matching
          if (fileNameNoExt.includes('albedo')) {
            textureUrlMap['albedo'] = url
            // Also try to match by material number if present (e.g., "1001")
            const materialMatch = fileNameNoExt.match(/(\d+)/)
            if (materialMatch) {
              textureUrlMap[`material_${materialMatch[1]}_albedo`] = url
            }
          }
        })
      )

      const daeUrl = URL.createObjectURL(daeFile)

      console.log('[Import Folder] Texture map:', Object.keys(textureUrlMap))
      console.log('[Import Folder] Total textures:', Object.keys(textureUrlMap).length)
      
      // Extract folder name from file paths
      const firstFilePath = fileArr[0].name
      const folderName = firstFilePath.includes('/') 
        ? firstFilePath.split('/')[0] 
        : firstFilePath.includes('\\') 
          ? firstFilePath.split('\\')[0] 
          : 'Imported Model'
      
      const newModelConfig = {
        name: folderName,
        modelUrl: daeUrl,
        modelType: 'dae',
        textureUrlMap,
        version: 0,
      }

      setModelConfig(newModelConfig)
      setSource('model')
      setTexturesEnabled(true)
      setStatus(`Imported folder model: ${newModelConfig.name}`)
    } catch (error) {
      console.error(error)
      setStatus('Folder import failed: could not read files')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="w-screen h-screen bg-black text-white">
      <div className="absolute top-4 left-4 z-10">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            {showBackToHub && (
              <Link
                to={backToUrl}
                className="shrink-0 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white border border-white/30 hover:border-white/60 rounded px-1.5 py-0.5 transition-colors"
              >
                ← Back
              </Link>
            )}
            <div className="text-xs font-black uppercase tracking-widest">
              Arch Zone // 3D Visualizer (Prototype)
            </div>
          </div>

          <div className="relative tools-menu-container">
              <div
                className={`border rounded px-1.5 py-0.5 text-[9px] transition-all ${
                  toolsMenuOpen
                    ? 'border-white/70 bg-black/60'
                    : 'border-white/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setToolsMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-1 transition-colors whitespace-nowrap ${
                    toolsMenuOpen
                      ? 'text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                  Tools
                </button>
              </div>

              {toolsMenuOpen && (
                <div className="absolute top-full left-0 mt-1 border border-white/70 rounded bg-black/60 px-1.5 py-1.5 text-[9px] flex flex-col gap-1.5 min-w-[140px] z-20" style={{ position: 'absolute' }}>
                <button
                  type="button"
                  onClick={() => setTexturesEnabled((prev) => !prev)}
                  className={`border rounded px-1.5 py-0.5 text-[9px] flex items-center gap-1 transition-colors w-full ${
                    texturesEnabled
                      ? 'border-lime-400/70 text-lime-300 bg-lime-500/10'
                      : 'border-gray-500 text-gray-400'
                  }`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 9h6v6H9z" />
                  </svg>
                  Textures: {texturesEnabled ? 'ON' : 'OFF'}
                </button>

                {source === 'model' && modelConfig && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (transformEnabled && transformMode === 'translate') {
                          setTransformEnabled(false)
                          setTransformMode(null)
                        } else {
                          setTransformEnabled(true)
                          setTransformMode('translate')
                        }
                      }}
                      className={`border rounded px-1.5 py-0.5 text-[9px] flex items-center gap-1 transition-colors w-full ${
                        transformEnabled && transformMode === 'translate'
                          ? 'border-blue-400/70 text-blue-300 bg-blue-500/10'
                          : 'border-gray-500 text-gray-400 hover:bg-gray-500/10'
                      }`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      Move Object
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (transformEnabled && transformMode === 'rotate') {
                          setTransformEnabled(false)
                          setTransformMode(null)
                        } else {
                          setTransformEnabled(true)
                          setTransformMode('rotate')
                        }
                      }}
                      className={`border rounded px-1.5 py-0.5 text-[9px] flex items-center gap-1 transition-colors w-full ${
                        transformEnabled && transformMode === 'rotate'
                          ? 'border-blue-400/70 text-blue-300 bg-blue-500/10'
                          : 'border-gray-500 text-gray-400 hover:bg-gray-500/10'
                      }`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                      </svg>
                      Rotate Object
                    </button>
                    <div className="flex items-center gap-2 w-full px-1.5 py-0.5 border border-purple-400/60 text-purple-300 rounded">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                      <span className="text-[9px] whitespace-nowrap">Size:</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={modelScale}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value)
                          if (!isNaN(val) && val >= 0.1 && val <= 5) {
                            setModelScale(val)
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value)
                          if (isNaN(val) || val < 0.1) {
                            setModelScale(0.1)
                          } else if (val > 5) {
                            setModelScale(5)
                          } else {
                            setModelScale(val)
                          }
                        }}
                        className="flex-1 bg-black border border-white/40 rounded px-1 py-0.5 text-[9px] text-center outline-none focus:border-purple-400 min-h-[24px] touch-manipulation"
                      />
                      <span className="text-[9px] whitespace-nowrap">x</span>
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleExport}
                  className="border border-emerald-400/60 text-emerald-300 rounded px-1.5 py-0.5 text-[9px] hover:bg-emerald-500/10 transition-colors flex items-center gap-1 w-full"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export JSON
                </button>

                <label className="border border-sky-400/60 text-sky-300 rounded px-1.5 py-0.5 text-[9px] hover:bg-sky-500/10 transition-colors cursor-pointer flex items-center gap-1 w-full">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Import JSON
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>

                <label className="border border-amber-400/60 text-amber-300 rounded px-1.5 py-0.5 text-[9px] hover:bg-amber-500/10 transition-colors cursor-pointer flex items-center gap-1 w-full">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  Import Model
                  <input
                    type="file"
                    accept="*/*"
                    onChange={handleModelImport}
                    className="hidden"
                  />
                </label>

                <label className="border border-amber-400/60 text-amber-300 rounded px-1.5 py-0.5 text-[9px] hover:bg-amber-500/10 transition-colors cursor-pointer flex items-center gap-1 w-full">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  Import Folder
                  <input
                    type="file"
                    webkitdirectory=""
                    multiple
                    onChange={handleFolderImport}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 bg-black/60 border border-white/20 rounded px-1.5 py-1 text-[9px] uppercase tracking-widest">
        {source === 'preset' && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-[8px]">Scene</span>
            <select
              value={presetKey}
              onChange={handlePresetChange}
              className="bg-black border border-white/40 rounded px-1.5 py-0.5 text-[9px] outline-none"
            >
              <option value="default">Default Cube</option>
              <option value="templeLayout">Temple Layout</option>
              <option value="tombChamber">Tomb Chamber</option>
            </select>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 text-[8px]">Source</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="bg-black border border-white/40 rounded px-1.5 py-0.5 text-[9px] outline-none"
          >
            <option value="preset">Presets</option>
            <option value="model" disabled={!modelConfig}>
              {modelConfig ? modelConfig.name : 'Imported Model'}
            </option>
          </select>
        </div>
      </div>

      {status && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest bg-black/70 border border-white/20 rounded-full px-4 py-1 text-gray-300">
          {status}
        </div>
      )}

      <Canvas
        camera={{ position: [0, 5, 12], fov: 60 }}
        dpr={[1, 1.5]}
        className="w-full h-full"
        gl={{ outputColorSpace: SRGBColorSpace }}
      >
        <RendererConfig />
        <color attach="background" args={['#020617']} />
        {source === 'model' && modelConfig ? (
          <ModelScene
            key={modelConfig.version}
            model={modelConfig}
            texturesEnabled={texturesEnabled}
            transformMode={transformMode}
            transformEnabled={transformEnabled}
            scale={modelScale}
          />
        ) : (
          <Arch3DScene
            config={sceneConfig}
            textureUrl={customTextureUrl}
            texturesEnabled={texturesEnabled}
          />
        )}
        <OrbitControls 
          enablePan={!transformEnabled} 
          enableDamping 
          target={[0, 0.5, 0]}
          enabled={!transformEnabled}
        />
      </Canvas>
    </div>
  )
}
