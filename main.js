console.log("Hello, WebGL!")

const canvas = document.getElementById("glCanvas")
const gl = canvas.getContext("webgl", {antialias: true})
const inp = document.getElementById("inp")
const f = 10.0
const n = 1.0

var drag_start = [0.0, 0.0]
var drag_end = [0.0, 0.0]
var drag = false
var angles = [0.0, 0.0, 0.0]
var prog = 0 

var p = 10

inp.addEventListener("input", function(){
    let alpha = inp.value / 100
    p = Math.floor((10) * (1 - alpha) + 100 * alpha)
    var [torus, colors] = generate_torus(p)
    gl.bindBuffer(gl.ARRAY_BUFFER, pos_buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(torus), gl.STATIC_DRAW)
    
    gl.vertexAttribPointer(gl.getAttribLocation(prog, "pos"), 3, gl.FLOAT, false, 24, 0)
    gl.enableVertexAttribArray(0)
    
    gl.vertexAttribPointer(gl.getAttribLocation(prog, "col"), 3, gl.FLOAT, false, 24, 12)
    gl.enableVertexAttribArray(1)
})

canvas.addEventListener("mousedown", function(event){
    drag_start = [event.pageX - canvas.offsetLeft, 
                 event.pageY - canvas.offsetTop
                ]
    drag = true
})

canvas.addEventListener("mousemove", function(event){
    if(drag){
        drag_end = [event.pageX - canvas.offsetLeft, 
                    event.pageY - canvas.offsetTop
                   ]
        delta = [10 * (drag_end[0] - drag_start[0]) / canvas.clientWidth,
                 10 * (drag_end[1] - drag_start[1]) / canvas.clientHeight]
        angles[1] += delta[0]
        angles[0] += delta[1]
        drag_start = drag_end
        gl.uniform3f(gl.getUniformLocation(prog, "angles"), ...angles)
    }
})

document.addEventListener("mouseup", function(){
    drag = false})

const vs_source = `
    attribute vec3 pos;
    attribute vec3 col;
    uniform mat4 projection;
    uniform vec3 angles;
    varying highp vec3 frag_col;

    mat4 rx = mat4(1.0, 0.0, 0.0, 0.0,
                   0.0, cos(angles.x), sin(angles.x), 0.0,
                   0.0, -sin(angles.x), cos(angles.x), 0.0,
                   0.0, 0.0, 0.0, 1.0);

    mat4 ry = mat4(cos(angles.y), 0.0, -sin(angles.y), 0.0,
                   0.0, 1.0, 0.0, 0.0,
                   sin(angles.y), 0.0, cos(angles.y), 0.0,
                   0.0, 0.0, 0.0, 1.0);

    void main() {
        vec4 rotated = ry * rx * (vec4(pos, 1.0) - vec4(0.0, 0.0, -3.0, 0.0)) + vec4(0.0, 0.0, -3.0, 0.0);
        gl_Position = projection * vec4(rotated);
        frag_col = col;
    }
`

const fs_source = `
    varying highp vec3 frag_col;

    void main(void) {
        gl_FragColor = vec4(frag_col, 1.0);
    }
`

function create_shader(gl, type){
    var src = type == gl.FRAGMENT_SHADER ? fs_source: vs_source
    var shader = gl.createShader(type)
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    return shader
}

function create_program(){
    var prog = gl.createProgram()
    gl.attachShader(prog, create_shader(gl, gl.FRAGMENT_SHADER))
    gl.attachShader(prog, create_shader(gl, gl.VERTEX_SHADER))
    gl.linkProgram(prog)
    
    var success = gl.getProgramParameter(prog, gl.LINK_STATUS)
    if (!success){
        console.log(gl.getProgramInfoLog(prog))
    }else{
        return prog
    }
}

function get_torus_xyz(phi, theta, R, r){
    x = (R + r*Math.cos(theta))*Math.cos(phi)
    y = (R + r*Math.cos(theta))*Math.sin(phi)
    z = -r*Math.sin(theta) - 3
    return [x, y, z] 
}

function cross(u, v){
    let x = u[1] * v[2] - v[1] * u[2]
    let y = v[0] * u[2] - u[0] * v[2]
    let z = u[0] * v[1] - v[0] * u[1]
    return [[x, y, z], Math.sqrt(x*x + y*y + z*z)]
}

function generate_torus(precision){
    let phi= []; let theta = []; for(let i = 0; i < precision; i++){phi.push((2*Math.PI)*(i/precision)); theta.push((2*Math.PI)*(i/precision))}
    phi.push(0.0); theta.push(0.0)
    let torus = []; let colors = [];
    for (let i = 0; i < precision; i++){
        for (let j = 0; j < precision; j++){
            p1 = get_torus_xyz(phi[i], theta[j], 1.5, 0.5)
            p2 = get_torus_xyz(phi[i + 1], theta[j], 1.5, 0.5)
            p3 = get_torus_xyz(phi[i + 1], theta[j + 1], 1.5, 0.5)
            p4 = get_torus_xyz(phi[i], theta[j + 1], 1.5, 0.5)
            let [n1, d1] = cross([p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]], 
                            [p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]])
            let col1 = [n1[0] / d1, n1[1] / d1, n1[2] / d1]
            let [n2, d2] = cross([p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]], 
                [p4[0] - p1[0], p4[1] - p1[1], p4[2] - p1[2]])
            let col2 = [n2[0] / d2, n2[1] / d2, n1[2] / d2]
            torus.push(...p1, ...col1, ...p2, ...col1, ...p3, ...col1, 
                       ...p4, ...col2, ...p1, ...col2, ...p3, ...col2)
        }
    }
    return [torus, colors]
}

const vertices = [
    1.0, 0.0, -1.0,//xy
    1.0, 0.0, 0.0, //rgb

    0.0, 1.0, -1.0,
    0.0, 1.0, 0.0, 

    0.0, 0.0, -1.1,
    0.0, 0.0, 1.0
]

gl.enable(gl.DEPTH_TEST)


var projection = [n, 0.0, 0.0, 0.0, 
                  0.0, n, 0.0, 0.0,
                  0.0, 0.0, -(f + n) / (f - n), -1.0,
                  0.0, 0.0, -2 * (f * n) / (f - n), 0.0]

prog = create_program()
gl.useProgram(prog)
gl.uniformMatrix4fv(gl.getUniformLocation(prog, "projection"), false, new Float32Array(projection))
gl.uniform3f(gl.getUniformLocation(prog, "angles"), ...angles)

var pos_buffer = gl.createBuffer()
p = 50
var [torus, colors] = generate_torus(p)
gl.bindBuffer(gl.ARRAY_BUFFER, pos_buffer)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(torus), gl.STATIC_DRAW)

gl.vertexAttribPointer(gl.getAttribLocation(prog, "pos"), 3, gl.FLOAT, false, 24, 0)
gl.enableVertexAttribArray(0)

gl.vertexAttribPointer(gl.getAttribLocation(prog, "col"), 3, gl.FLOAT, false, 24, 12)
gl.enableVertexAttribArray(1)


function draw(){
    gl.clearColor(28 / 256, 28 / 256, 28 / 256, 1.0)
    gl.clearDepth(1.0)
    gl.depthFunc(gl.LEQUAL)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.drawArrays(gl.TRIANGLES, 0, p*p*6)
    window.requestAnimationFrame(draw)
}

window.requestAnimationFrame(draw)