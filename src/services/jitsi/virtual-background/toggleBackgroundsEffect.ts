/* eslint-disable @typescript-eslint/ban-ts-comment */
//@ts-nocheck

import { timeout } from './constants.js';

// Ensure WebAssembly is available globally
if (typeof globalThis !== 'undefined' && typeof globalThis.WebAssembly === 'undefined') {
  console.warn('WebAssembly not found on globalThis, attempting to access from window');
  if (typeof window !== 'undefined' && window.WebAssembly) {
    globalThis.WebAssembly = window.WebAssembly;
  }
}
import JitsiStreamBackgroundEffect from './JitsiStreamBackgroundEffect.js';
import modelUrl from './vendor/models/selfie_segmentation_landscape.tflite?url';
import createTFLiteSIMDModule from './vendor/tflite/tflite-simd.js'
import createTFLiteModule from './vendor/tflite/tflite.js'

// Import WASM files with proper URL resolution for production
import tfliteWasmUrl from './vendor/tflite/tflite.wasm?url';
import tfliteSimdWasmUrl from './vendor/tflite/tflite-simd.wasm?url';

let modelBuffer: ArrayBuffer;
let tflite: any;
let isWasmDisabled = false;

const segmentationDimensions = {
  modelLandscape: {
    height: 144,
    width: 256,
  },
};

// A minimal valid WASM module containing one SIMD instruction. Keeping the
// feature test local avoids loading wasm-check's CommonJS bundle, which reads
// `this.WebAssembly` during ESM module evaluation and can prevent the entire
// video-meeting route from loading.
const simdTestModule = Uint8Array.of(
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 7, 5, 1, 1, 97, 0, 0, 10, 9, 1,
  7, 0, 65, 0, 253, 17, 26, 11, 0, 10, 4, 110, 0, 1, 102, 2, 3, 1, 0, 0,
);

const supportsWasmSimd = () => {
  try {
    return typeof WebAssembly !== 'undefined' && WebAssembly.validate(simdTestModule);
  } catch {
    return false;
  }
};

export async function createVirtualBackgroundEffect(virtualBackground: any) {
  if (!MediaStreamTrack.prototype.getSettings && !MediaStreamTrack.prototype.getConstraints) {
    throw new Error('JitsiStreamBackgroundEffect not supported!');
  }

  if (isWasmDisabled) {
    console.error('virtualBackground.backgroundEffectError WasmDisabled');
    return;
  }

  // Log the environment and URLs for debugging
  console.log('Creating virtual background effect in environment:', import.meta.env.MODE);
  console.log('Model URL:', modelUrl);
  console.log('WASM URLs:', { tfliteWasmUrl, tfliteSimdWasmUrl });

  // Test if WASM files are accessible
  try {
    const wasmTestResponse = await fetch(tfliteWasmUrl, { method: 'HEAD' });
    console.log('WASM file accessibility test:', wasmTestResponse.ok ? 'SUCCESS' : 'FAILED');
    if (!wasmTestResponse.ok) {
      console.error('WASM file not accessible:', wasmTestResponse.status, wasmTestResponse.statusText);
    }
  } catch (wasmTestError) {
    console.error('WASM file accessibility test failed:', wasmTestError);
  }

  // Test if model file is accessible
  try {
    const modelTestResponse = await fetch(modelUrl, { method: 'HEAD' });
    console.log('Model file accessibility test:', modelTestResponse.ok ? 'SUCCESS' : 'FAILED');
    if (!modelTestResponse.ok) {
      console.error('Model file not accessible:', modelTestResponse.status, modelTestResponse.statusText);
    }
  } catch (modelTestError) {
    console.error('Model file accessibility test failed:', modelTestError);
  }

  if (!tflite) {
    try {
      const tfliteTimeout = 10000;

      // Check if WebAssembly is available
      if (typeof WebAssembly === 'undefined') {
        console.error('WebAssembly is not available in this environment');
        isWasmDisabled = true;
        return;
      }

      console.log("Starting WASM module loading process...")
      console.log("WebAssembly available:", typeof WebAssembly !== 'undefined')
      
      const useSimd = supportsWasmSimd();
      console.log("WebAssembly SIMD support:", useSimd)

      if (useSimd) {
        console.log('Loading TensorFlow Lite SIMD module from:', tfliteSimdWasmUrl);
        try {
          tflite = await timeout(
            tfliteTimeout,
            createTFLiteSIMDModule({ locateFile: () => tfliteSimdWasmUrl }),
          );
          console.log('SIMD module loaded successfully');
        } catch (simdError) {
          console.warn('Failed to load SIMD module, falling back to regular module:', simdError);
          console.log('Loading fallback TensorFlow Lite module from:', tfliteWasmUrl);
          tflite = await timeout(tfliteTimeout, createTFLiteModule({ locateFile: () => tfliteWasmUrl }));
          console.log('Regular module loaded successfully as fallback');
        }
      } else {
        console.log('Loading TensorFlow Lite module from:', tfliteWasmUrl);
        tflite = await timeout(tfliteTimeout, createTFLiteModule({ locateFile: () => tfliteWasmUrl }));
        console.log('Regular module loaded successfully');
      }
      console.log('TensorFlow Lite module loaded successfully');
    } catch (err) {
      isWasmDisabled = true;
      console.error('Looks like WebAssembly is disabled or not supported on this browser', err);
      console.error('WASM loading failed with error:', err.message || err);
      return;
    }
  }

  if (!modelBuffer) {
    try {
      console.log('Loading TensorFlow Lite model from:', modelUrl);
      const modelResponse = await fetch(modelUrl);
      if (!modelResponse.ok) {
        throw new Error(`Failed to download tflite model! Status: ${modelResponse.status} ${modelResponse.statusText}`);
      }
      modelBuffer = await modelResponse.arrayBuffer();
      console.log('Model loaded successfully, size:', modelBuffer.byteLength, 'bytes');
      tflite.HEAPU8.set(new Uint8Array(modelBuffer), tflite._getModelBufferMemoryOffset());
      tflite._loadModel(modelBuffer.byteLength);
    } catch (err) {
      console.error('Error loading TensorFlow Lite model:', err);
      throw err;
    }
  }

  const options = {
    ...segmentationDimensions.modelLandscape,
    virtualBackground,
  };

  return new JitsiStreamBackgroundEffect(tflite, options);
}

export async function toggleBackgroundEffect(options, jitsiTrack) {
  console.log('toggleBackgroundEffect called with options:', options);
  console.log('jitsiTrack available:', !!jitsiTrack);
  
  if (jitsiTrack) {
    try {
      if (options.backgroundEffectEnabled) {
        console.log('Creating and applying virtual background effect...');
        const effect = await createVirtualBackgroundEffect(options);
        console.log('Virtual background effect created:', !!effect);
        await jitsiTrack.setEffect(effect);
        console.log('Virtual background effect applied successfully');
      } else {
        console.log('Removing virtual background effect...');
        await jitsiTrack.setEffect(undefined);
        console.log('Virtual background effect removed successfully');
      }
    } catch (error) {
      console.error('Error on apply background effect:', error);
      console.error('Error details:', error.message || error);
      console.error('Error stack:', error.stack);
    }
  } else {
    console.warn('No jitsiTrack available for virtual background effect');
  }
}
