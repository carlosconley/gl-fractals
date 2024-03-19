import {m4perspNegZ, add, sub, mul, scadd, scsub} from './modules/math.js'

const IlliniBlue = new Float32Array([0.075, 0.16, 0.292, 1])
const IlliniOrange = new Float32Array([1, 0.373, 0.02, 1])
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])

/**
 * Given the source code of a vertex and fragment shader, compiles them,
 * and returns the linked program.
 */
function compileShader(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }

    const uniforms = {}
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}

/**
 * Sends per-vertex data to the GPU and connects it to a VS input
 *
 * @param data    a 2D array of per-vertex data (e.g. [[x,y,z,w],[x,y,z,w],...])
 * @param program a compiled and linked GLSL program
 * @param vsIn    the name of the vertex shader's `in` attribute
 * @param mode    (optional) gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc
 *
 * @returns the ID of the buffer in GPU memory; useful for changing data later
 */
function supplyDataBuffer(data, loc, mode) {
   if (mode === undefined) mode = gl.STATIC_DRAW

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)

    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc)

    return buf;
}

/**
 * Creates a Vertex Array Object and puts into it all of the data in the given
 * JSON structure, which should have the following form:
 *
 * ````
 * {"triangles": a list of of indices of vertices
 * ,"attributes":
 *  {name_of_vs_input_1: a list of 1-, 2-, 3-, or 4-vectors, one per vertex
 *  ,name_of_vs_input_2: a list of 1-, 2-, 3-, or 4-vectors, one per vertex
 *  }
 * }
 * ````
 *
 * @returns an object with four keys:
 *  - mode = the 1st argument for gl.drawElements
 *  - count = the 2nd argument for gl.drawElements
 *  - type = the 3rd argument for gl.drawElements
 *  - vao = the vertex array object for use with gl.bindVertexArray
 */
function setupGeometry(geom) {
  var triangleArray = gl.createVertexArray()
  gl.bindVertexArray(triangleArray)

  for(let i=0; i<geom.attributes.length; i+=1) {
      let data = geom.attributes[i]
      supplyDataBuffer(data, i)
  }

  var indices = new Uint16Array(geom.triangles.flat())
  var indexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

  return {
      mode: gl.TRIANGLES,
      count: indices.length,
      type: gl.UNSIGNED_SHORT,
      vao: triangleArray
  }
}

function fillScreen() {
  let canvas = document.querySelector('canvas')
  document.body.style.margin = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.width = canvas.clientWidth - 10
  canvas.height = canvas.clientHeight - 10
  canvas.style.width = ''
  canvas.style.height = ''
  window.dims = new Float32Array([canvas.width, canvas.height])
  if (window.gl) {
      gl.viewport(0,0, canvas.width, canvas.height)
      window.p = m4perspNegZ(0.1, 50, 1, canvas.width, canvas.height)
  }
}


window.fpsUpdate = 0
function timeStep(ms) {
  let seconds = ms / 1000

  draw()
  if (fpsUpdate == 10) {
    let delta = (seconds - time) / 10
    // update framerate
    document.querySelector('#fps').innerHTML = (1/delta).toFixed(0)
    time = seconds
    fpsUpdate = 0
  }

  fpsUpdate++;
  requestAnimationFrame(timeStep)
}

function draw(seconds) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.useProgram(program)


  // calculate viewport once:
  // viewport is centered around center
  // viewport is 1:1 aspect ratio
  let minDim = Math.min(dims[0], dims[1])
  let viewportx = scsub(mul([-.5, 0.5], scale), center[0] / minDim)
  let viewporty = scsub(mul([-0.5, 0.5], scale), center[1] / minDim)


  //gl.uniform2fv(program.uniforms.center, center);
  gl.uniform2fv(program.uniforms.viewportx, viewportx);
  gl.uniform2fv(program.uniforms.viewporty, viewporty);
  gl.uniform1f(program.uniforms.minDim, minDim);
  //gl.uniform1f(program.uniforms.iters, Math.max(100, 0.5 / scale))

  //gl.uniform2fv(program.uniforms.dims, dims);

  gl.bindVertexArray(tetra.vao)
  gl.drawElements(tetra.mode, tetra.count, tetra.type, 0)
}




async function setup(event) {
  window.gl = document.querySelector('canvas').getContext('webgl2',
    // optional configuration object: see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
    {antialias: false, depth:false, preserveDrawingBuffer:true}
  )
  gl.clearColor(...[1, 1, 1, 1]) // f(...[1,2,3]) means f(1,2,3)
  let fs = await fetch('frag.glsl').then(res => res.text())
  let vs = await fetch('vert.glsl').then(res => res.text())

  window.program = compileShader(vs,fs)

  let tetra = await fetch('quad.json').then(res => res.json())

  window.tetra = setupGeometry(tetra)

  window.addEventListener('resize', fillScreen)

  fillScreen()
  let canvas = document.querySelector('canvas')
  window.clicked = null
  window.center = [canvas.width / 2, 0.]
  window.last_center = center
  window.scale = 2.0

  console.log(center)

  const factor = 0.90;
  const invFactor = 1.0 / factor;


  canvas.addEventListener('mousedown', (ev) => {
    window.clicked = [-ev.clientX, ev.clientY]
  });

  canvas.addEventListener('mousemove', (ev) => {
    if (!window.clicked) {
      return;
    }

    let pos = [-ev.clientX, ev.clientY];
    let diff = mul(sub(pos, window.clicked), scale)

    center = sub(last_center, diff)
  })

  canvas.addEventListener('mouseup', (ev) => {
    window.clicked = null;
    window.last_center = center
  })

  canvas.addEventListener('wheel', (ev) => {
    if (ev.deltaY < 0) {
      scale *= factor;
    } else {
      scale *= invFactor;
    }

  })

  window.time = 0
  window.frameNum = requestAnimationFrame(timeStep)
}

window.addEventListener('load',setup)