/**THE MUTE BUTTON BELONG TO POLYMER
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var scene, camera, renderer, composer
var started = false
var prior_block_id
var beat_lengths = ["1n", "1n", "2n", "4n", "2n", "4n", "4n", "8n"]
var collected_blocks = []
var current_colors = []
var current_colors_send = []
var mute = false
var clock = new THREE.Clock()
var notes_array = []
var cubes = null
const url_nano_main = "wss://ws.nanocrawler.cc"
const url_nano_beta = "wss://beta.ws.nanocrawler.cc"
const block_explorer_main = "https://nanocrawler.cc/explorer/block/"
const block_explorer_beta = "https://beta.nanocrawler.cc/explorer/block/"
var block_explorer = block_explorer_main
const websocket_nc_main = false //custom setting to use the node websocket interface for nanocrawler
const websocket_nc_beta = true //custom setting to use the node websocket interface for nanocrawler

var socket_nano_main
var socket_nano_beta
var netSelected = 0 //0=main, 1=beta
var interpretation = 0 //0=hash note, 1=amount note
var transactions = []
var has_init = false //indicate first init, to avoid double init melodies when using the slider
var should_reset = false //if the next loop should restart from 0 collected blocks
var melody_interval = 8000
var transactions_last = 0 //last processed melody length
var playing = false //currently playing
var noise_counter = 0.0
var noise_pass = null
var muted = false
var mute_state = false //initial mute state from cookie
var volumeval = 40 //current inverted volume
const base_measure_init = 2500 //length in ms of one measure (1m) when not using Tone.js transport
var base_measure = base_measure_init
var blockSeq = 0 //current melody position
var xCount = 0 //current note position in melody
var new_melody = false //indicate new melody is playing
var nano_sent = 0 //total sent since start
var nano_received = 0 //total received since start
var resize_ordered = false //indicate for next melody about new window size
var chords = [
["B1", "F#1", "F#2", "B2", "F#3", "B3", "D3", "A3", "D4", "E4", "A4"],
["B2", "F#2", "B3", "F#3", "D2", "E2", "A2", "D3", "E3", "A3", "D4"],
["D2", "F#2", "D3", "F#3", "D2", "E2","F#2", "A2", "E3", "A3", "E4" ],
["F#2", "C#2", "F#3", "C#3", "E3", "F#3", "A3", "B3", "C#3", "E4", "A4"],
["D1", "A2", "D2", "A3", "E3", "F#3", "G#3", "A3", "B3", "E4", "B4"],
["A2", "E2", "A3", "E3", "F#3", "G#3", "B3", "C#4", "E4", "B4", "E5"],
["C#2", "F#2", "C#3", "F#3", "G#3", "A3", "C#4", "A4", "C#5", "F#5", "G#5"],
["F#1", "C#2", "F#2", "C#3", "F#3", "G#3", "A3", "B3", "C#4", "F#4", "G#4"],
["E1", "A1", "E2", "A2", "C#3", "F#3", "G#3", "A3", "B3", "E4", "G#4"],
["D1", "A1", "D2", "A2", "F#3", "G#3", "A3", "E4", "A4", "E5", "F#5"]]

var current_notes = chords[0]
var current_notes_send = chords[1]
//cyan, green, lime, amber, deep orange, red, pink, purple, indigo, light blue
var color_schemes =
[
[0x006064, 0xe0f7fa, 0xb2ebf2, 0x80deea, 0x44d0e1, 0x26c6da, 0x00bcd4, 0x00acc1, 0x0097a7],
[0x1b5e20, 0xe8f5e9, 0xc8e6c9, 0xa5d6a7, 0x81c784, 0x66bb6a, 0x4caf50, 0x43a047, 0x388e3c],
[0xf57f17, 0xfffde7, 0xfff9c4, 0xfff59d, 0xfff176, 0xffee58, 0xffeb3b, 0xfdd835, 0xfbc02d],
[0xff6f00, 0xfff8e1, 0xffecb3, 0xffe082, 0xffd54f, 0xffca28, 0xffc107, 0xffb300, 0xffa000],
[0xbf360c, 0xfbe9e7, 0xffccbc, 0xffab91, 0xff8a65, 0xff7043, 0xff5722, 0xf4511e, 0xe64a19],
[0xb71c1c, 0xffebee, 0xffcdd2, 0xef9a9a, 0xe57373, 0xef5350, 0xff1744, 0xf44336, 0xd32f2f],
[0x880e4f, 0xfce4ec, 0xf8bbd0, 0xf48fb1, 0xf06292, 0xf50057, 0xec407a, 0xe91e63, 0xe91e63],
[0x4a148c, 0xf3e5f5, 0xe1bee7, 0xce93d8, 0xba68c8, 0xab47bc, 0xd500f9, 0x9c27b0, 0x7b1fa2],
[0x1a237e, 0xe8eaf6, 0xc5cae9, 0x9fa8da, 0x7986cb, 0x5c6bc0, 0x3d5afe, 0x3f51b5, 0x303f9f],
[0x01579b, 0xe1f5fe, 0xb3e5fc, 0x81d4fa, 0x4fc3f7, 0x29b6f6, 0x00b0ff, 0x03a9f4, 0x0288d1]
]

var tick = 0,
  smallest_dimension = Math.min( window.innerWidth, window.innerHeight ),
  viewport_width = smallest_dimension,
  viewport_height = smallest_dimension,

  //world width and world height might become object or card width, card height
  world_width = 250,
  world_height = 250,
  tile_width = 50,
  tile_height = 50,
  ran = 64,
  spotLight, ambient_light, plane,

  FOV = 200

function mute_sound() {
  Tone.Master.mute = !Tone.Master.mute
  muted = !muted
  mute_state = muted
}

//sleep based on Tone.js measure of 2 seconds (because Tone.transport does not work very well with random stops)
function sleep(tone_delay) {
  var ms = 0
  if (tone_delay.includes('m')) {
    ms = base_measure * tone_delay.replace('m','')
  }
  else if (tone_delay.includes('n')) {
    ms = base_measure / tone_delay.replace('n','')
  }

  return new Promise(resolve => setTimeout(resolve, ms));
}

function sleep_simple(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var reverb, reverb2, feedbackDelay, feedbackDelay2, wider, eq_back, eq_synth, dist, tremolo, lowPass, lowPass2, highPass, highPass2, synth, polySynth, noise, autoFilter

function start_tone_stuff(){
  Tone.Master.mute = true //mute to avoid strange sound that kills the speaker
  muted = true

  reverb = new Tone.Reverb(1.5).toMaster()
  reverb.wet.value = 0.5;
	feedbackDelay = new Tone.FeedbackDelay("6n", .75).toMaster()

	//wider = new Tone.StereoWidener(1).connect(reverb) //this is making a heavy click sound when initialized
  feedbackDelay2 = new Tone.PingPongDelay("3n", .5).connect(reverb)

	eq_back = new Tone.EQ3(2, -5, -15)
  eq_synth = new Tone.EQ3(-8, -2, -6, 600, 2000)
  dist = new Tone.Distortion(0.05)
  lowPass = new Tone.Filter({
			frequency: 6000,
      type: 'lowpass',
	})
  highPass = new Tone.Filter({
			frequency: 250,
      type: 'highpass',
	})
  lowPass2 = new Tone.Filter({
			frequency: 2000,
      type: 'lowpass',
	})
  highPass2 = new Tone.Filter({
			frequency: 100,
      type: 'highpass',
	})

	synth = new Tone.FMSynth().chain(dist, eq_synth, lowPass, highPass, feedbackDelay)
	synth.set({
		harmonicity:3,
		modulationIndex:3.5,
		detune:.01,
		oscillator:{
			type:"sine"
		},
		envelope:{
			attack:0.01,
			decay:0.01,
			sustain:1,
			release:0.75,
		},
		modulation:{
			type:"square"
		},
		modulationEnvelope:{
			attack:0.5,
			decay:0,
			sustain:1,
			release:0.5
	}})
	synth.volume.value = -4
	feedbackDelay.wet.value = .4

	polySynth = new Tone.PolySynth(4, Tone.MonoSynth).chain(eq_back, lowPass2, highPass2, feedbackDelay2)
	polySynth.set({
    "oscillator" : "PWM",
    "envelope" : {
        "attack" : 5,
        "release" : .5,
        "attackCurve" : "sine",
        "releaseCurve" : "exponential"
    }
	})
	polySynth.volume.value = -65

	var loop2 = new Tone.Loop(function(time){
	    polySynth.triggerAttackRelease(current_notes[Math.floor(Math.random() * (current_notes.length - 4))], "2m", "+0.05")
	}, beat_lengths[Math.floor(Math.random() * beat_lengths.length)]).start()

	noise = new Tone.Noise("white").start()
	noise.volume.value = -43

	//make an autofilter to shape the noise
	autoFilter = new Tone.AutoFilter({
		"frequency" : "10m",
		"min" : 300,
		"max" : 1000
	})
  let lowPass3 = new Tone.Filter({
			frequency: 2000,
      type: 'lowpass',
	})

	//connect the noise
	noise.chain(lowPass3, autoFilter, reverb)
	//start the autofilter LFO
	autoFilter.start()

  Tone.context.latencyHint = 'playback' //prioritizes sustained playback
	Tone.Transport.start("+0.1")
}

function start_rendering_stuff() {
  var e = document.createElement("canvas")
  e = document.getElementById("canvas")
  console.log("init called ")
  e.width = 16
  e.height = 16
  camera = new THREE.OrthographicCamera( viewport_width, viewport_height, viewport_width, viewport_height, 1, 1000 )
  camera.left = window.innerWidth / - 2
  camera.right = window.innerWidth / 2
  camera.top = window.innerHeight / 2
  camera.bottom = window.innerHeight / - 2

  camera.updateProjectionMatrix()
  scene = new THREE.Scene()
  scene.add(camera)
  renderer = new THREE.WebGLRenderer( {canvas: e,alpha: true, antialias:true} )
  var t = e.getContext("2d")
  e = document.getElementById("canvas")

  for (var p = document.getElementById("address-info"), b = document.getElementsByClassName("address-button"), E = 0; E < b.length; E++)
    b[E].addEventListener("click", function(e) {
        return e.preventDefault(),
        p.classList.toggle("hidden"),
        !1
    })
  window.addEventListener("resize", on_window_resize, !1)

  renderer.setClearColor(0x131519)
  renderer.setPixelRatio( window.devicePixelRatio )
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.autoClear = false

  //render pass
  var renderPass = new THREE.RenderPass(scene, camera)
  composer = new THREE.EffectComposer(renderer)
  composer.addPass(renderPass)

  //bloom pass
  var bloomPass = new THREE.BloomPass(0.9,25,7,128)
  composer.addPass(bloomPass)
  bloomPass.clear = true

  //old film pass (not currently used (0.0) because of a bug where it will look bad after a while)
  //var effectFilm = new THREE.FilmPass(0.0, .01, 648, false)
  //effectFilm.renderToScreen = true
  //composer.addPass(effectFilm)

  //custom shader pass for noise
  var vertShader = document.getElementById('vertexShader').textContent;
  var fragShader = document.getElementById('fragmentShader').textContent;
  var noiseEffect = {
    uniforms: {
      "tDiffuse": { value: null },
      "amount": { value: noise_counter }
    },
    vertexShader: vertShader,
    fragmentShader: fragShader
  }

  noise_pass = new THREE.ShaderPass(noiseEffect);
  noise_pass.renderToScreen = true;
  composer.addPass(noise_pass);

  /*
  var mesh = new THREE.SphereGeometry(300,300,12)
  var vat2 = new THREE.MeshBasicMaterial()
  sphere = new THREE.Mesh(mesh, vat2)
  sphere.material.opacity = 0
  sphere.scale.x = 0.001
  sphere.scale.y = 0.001
  sphere.scale.z = 0.001
  */
  //spotLight = new THREE.DirectionalLight( 0x0066f0 ),
  cubes = new THREE.Object3D()

  camera.position.set( 0, 0, 90 )
  camera.lookAt( scene.position )

  //scene.add(sphere)
  scene.add(cubes)
  //scene.add(spotLight)

  render()
}

function update_current_notes(xx) {
	current_notes = chords[xx]
	current_colors = color_schemes[xx]

  xx_send = xx + 1
  if (xx_send > current_colors.length) {
    xx_send = 0
  }
  current_colors_send = color_schemes[xx_send]
  current_notes_send = chords[xx_send]
}

//send dummy tones to initialize the graphics
function dummy_notes() {
  transactions = []
  transactions_last = 0
  hashes = [
    "0000000000000000000000000000000000000000000000000000000000000000",
    "1111111111111111111111111111111111111111111111111111111111111111",
    "2222222222222222222222222222222222222222222222222222222222222222",
    "3333333333333333333333333333333333333333333333333333333333333333",
    "4444444444444444444444444444444444444444444444444444444444444444",
    "5555555555555555555555555555555555555555555555555555555555555555"
  ]
  for (hash=0; hash<=5; hash++) {
    var txData = {
      "account": [""],
      "hash": ""+hashes[hash],
      "amount": 0.001,
      "subtype": "send"
    }
    transactions.push(txData)
  }
  define_content()
  //transactions = [] //if not using this, the new blocks will append to the dummy melody
}

/*
Less memory invasive function than calling setInterval() over and over again
*/
async function fade_loop(el, fade_delay) {
  if (!el.style.opacity) {
    el.style.opacity = 0.8
  }
  if (el.style.opacity > 0.025) {
    //increase fadeout time while the block queue grows, to mitigate the browser from overloading during high traffic
    el.style.opacity -= (0.025 + (transactions.length-transactions_last) / 10000)
    //setTimeout(fade_loop, 150 + fade_delay, el, fade_delay)
    await sleep_simple(150 + fade_delay)
    fade_loop(el, fade_delay)
  }
  else {
    el.remove()
  }
}

/*
  place text randomly on the screen with the transaction amount
  larger amount => larger font and slower fadeout
  increased fadeout speed if many objects to avoid overloading the browser
*/
function text_generator(amount, hash, type) {
  if (!has_init) {
    return
  }
  var fullWidth = window.innerWidth-100
  var fullHeight = window.innerHeight-200

  var elem = document.createElement("div")

  var size = Math.round(amount/10 + 10)
  if (size < 10) {
      size = 10
  }
  if (size > 50) {
      size = 50
  }

  //base the fading time from amount
  var fade_delay = Math.sqrt(amount) * 10
  if (fade_delay > 500) {
    fade_delay = 500
  }

  if (type == "send") {
      elem.innerHTML = '<a target="_blank" href="' + block_explorer + hash + '">' + amount.toFixed(4) + '►</a>'
  }
  else {
      elem.innerHTML = '<a target="_blank" href="' + block_explorer + hash + '">►' + amount.toFixed(4) + '</a>'
  }

  left_pos = Math.round(Math.random() * (fullWidth))
  digits = Math.floor(Math.log10(amount))+1+6 //integer digit count plus decimals

  //avoid the text to go outside the screen (reduce the position by the length of the object)
  if (left_pos > fullWidth - (size*digits)) {
    left_pos = fullWidth - (size*digits)
  }
  if (left_pos < 0) {
    left_pos = 0
  }

  elem.style.fontSize = size + "px"
  elem.style.position = "absolute"
  elem.style.left = left_pos + 50 + "px"
  elem.style.top = Math.round(Math.random() * (fullHeight)) + 150 - (size/2) + "px"
  elem.classList.add("floating-text")

  //fadeout effect
  fade_loop(elem, fade_delay)

  document.body.appendChild(elem)
}

//Thousand separator
function add_commas(nStr) {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
}

async function init() {
  has_init = true
  start_tone_stuff()
  start_rendering_stuff()

  //play dummy notes to show visitor it's alive
  dummy_notes()
  await sleep('1m')

  //set mute state
  if (mute_state == true) {
    Tone.Master.mute = true
    muted = true
  }
  else {
    Tone.Master.mute = false
    muted = false
  }
  create_grid(64)
  check_for_new_content()
  mainSocketCloseListener()
  betaSocketCloseListener()
}

window.onresize = function(event) {
  resize_ordered = true
}

/*
Draw the light box for each note
*/
function trigger_light(x, amount, type) {
  var ran_cube = cubes.children[ (cubes.children.length - 1) -  x]
  ran_cube.material.color.setHex(interpret_cube_color(amount,type))
  ran_cube.material.opacity= 1
  //tween object is supposed to remove itself after it has finished, no memory cleanup needed
  new TWEEN.Tween( ran_cube.material )
      .to( {opacity: 0 }, 12000 )
      .repeat( 0 )
      .easing( create_step_function(64) )
      .start()
}

function create_step_function(numSteps) {
	return function(k) {
		return (Math.floor(k * numSteps) / numSteps)
	}
}

function interpret_amount_beat(val) {
	if (val < .01) {
		return "28n"
	} else if ((val >= .01) && (val < 0.1)) {
		return "16n"
	} else if ((val >= 0.1) && (val < 1)) {
		return "8n"
	} else if ((val >= 1) && (val < 10)) {
		return "4n"
	} else if ((val >= 10) && (val < 100)) {
		return "3n"
	} else if ((val >= 100) && (val < 1000)) {
		return "2n"
	} else if ((val >= 1000) && (val < 10000)) {
		return "1n"
	} else {
		return "2m"
	}
}

function interpret_amount_vel(val) {
	if (val < .01) {
		return .3
	} else if ((val >= .01) && (val < 0.1)) {
		return .4
	} else if ((val >= 0.1) && (val < 1)) {
		return .5
	} else if ((val >= 1) && (val < 10)) {
		return .65
	} else if ((val >= 10) && (val < 100)) {
		return .8
	}else {
		return .9
	}
}

function interpret_hash(hash, type) {
    //notes = ["A3", "Bb3", "C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4", "C5", "Eb5", "G5"]
    notes_send = ["A2", "Bb2", "C3", "D3", "Eb3", "F3", "G3", "Ab3", "Bb3", "C4", "Eb4", "G4"]
    num_hash = hash.replace(/\D/g,'')
    num = mode(add(num_hash))
    //if (type == 'send') {
      //return notes_send[num]
    //}
    return notes_send[num]
}

function interpret_amount_note(val, type){
  let length = current_notes.length
  if (type == 'send') {
    if (val < .001) {
  		return current_notes_send[length - 1]
  	} else if ((val >= .001) && (val < 0.01)) {
  		return current_notes_send[length - 2]
  	} else if ((val >= 0.01) && (val < 0.1)) {
  		return current_notes_send[length - 3]
  	} else if ((val >= 0.1) && (val < 1)) {
  		return current_notes_send[length - 4]
  	} else if ((val >= 1) && (val < 10)) {
  		return current_notes_send[length - 5]
  	} else if ((val >= 10) && (val < 100)) {
  		return current_notes_send[length - 6]
  	}else if ((val >= 100) && (val < 1000)) {
  		return current_notes_send[length - 7]
  	}else if ((val >= 1000) && (val < 5000)) {
  		return current_notes_send[length - 8]
    }else if ((val >= 5000) && (val < 10000)) {
    	return current_notes_send[length - 9]
  	}else {
  		return current_notes_send[length - 10]
  	}
  }
  else {
    if (val < .001) {
  		return current_notes[length - 1]
  	} else if ((val >= .001) && (val < 0.01)) {
  		return current_notes[length - 2]
  	} else if ((val >= 0.01) && (val < 0.1)) {
  		return current_notes[length - 3]
  	} else if ((val >= 0.1) && (val < 1)) {
  		return current_notes[length - 4]
  	} else if ((val >= 1) && (val < 10)) {
  		return current_notes[length - 5]
  	} else if ((val >= 10) && (val < 100)) {
  		return current_notes[length - 6]
  	}else if ((val >= 100) && (val < 1000)) {
  		return current_notes[length - 7]
  	}else if ((val >= 1000) && (val < 5000)) {
  		return current_notes[length - 8]
    }else if ((val >= 5000) && (val < 10000)) {
    	return current_notes[length - 9]
  	}else {
  		return current_notes[length - 10]
  	}
  }
}

function interpret_cube_color(val,type){
  if (type=='send') {
    if (val < .001) {
  		return current_colors_send[8]
  	} else if ((val >= .001) && (val < 0.01)) {
  		return current_colors_send[7]
  	} else if ((val >= 0.01) && (val < 0.1)) {
  		return current_colors_send[6]
  	} else if ((val >= 0.1) && (val < 1)) {
  		return current_colors_send[5]
  	} else if ((val >= 1) && (val < 10)) {
  		return current_colors_send[4]
  	} else if ((val >= 10) && (val < 100)) {
  		return current_colors_send[3]
  	}else if ((val >= 100) && (val < 1000)) {
  		return current_colors_send[2]
  	}else {
  		return current_colors_send[1]
  	}
  }

  else {
  	if (val < .001) {
  		return current_colors[8]
  	} else if ((val >= .001) && (val < 0.01)) {
  		return current_colors[7]
  	} else if ((val >= 0.01) && (val < 0.1)) {
  		return current_colors[6]
  	} else if ((val >= 0.1) && (val < 1)) {
  		return current_colors[5]
  	} else if ((val >= 1) && (val < 10)) {
  		return current_colors[4]
  	} else if ((val >= 10) && (val < 100)) {
  		return current_colors[3]
  	}else if ((val >= 100) && (val < 1000)) {
  		return current_colors[2]
  	}else {
  		return current_colors[1]
  	}
  }
}

function interpret_amount_scale(val){
	if (val < .01) {
		return 1.1
	} else if ((val >= .01) && (val < 0.1)) {
		return 3
	} else if ((val >= 0.1) && (val < 10)) {
		return 9
	} else if ((val >= 10) && (val < 1000)) {
		return 12
	} else {
		return 22
	}
}

/*
  Creates the background bars synced with the melody
*/
function create_grid(content) {
  //reset objects and clean up references in memory
  while (cubes.children.length > 256) {
    cubes.children[0].geometry.dispose()
    cubes.children[0].material.dispose()
    //cubes.children[0] = undefined
    cubes.remove(cubes.children[0])
  }

	var framedWidth = (window.innerWidth) * .9 //frame amount
  //var transaxx = content[0].length
  var transaxx = content
  var fixedWidthOfOneUnit = framedWidth / transaxx
  if (fixedWidthOfOneUnit > 150) {
  	fixedWidthOfOneUnit = 150
  }
  var totalWidth =  fixedWidthOfOneUnit * transaxx
  var the_floor = ((totalWidth) * .5) - (fixedWidthOfOneUnit * .5)

  var geometry = new THREE.BoxGeometry(fixedWidthOfOneUnit, window.innerHeight, 50)

  for (var x = 0; x < transaxx; x++) {
      var material = new THREE.MeshBasicMaterial({})
      material.color.setHex (0x00ffff)
      material.transparent = true
      material.opacity = 0
      var cube = new THREE.Mesh(geometry, material)
      cube.scale.z = 1
      cube.position.x = the_floor - (fixedWidthOfOneUnit * x)
      cube.position.y = 0
      cube.position.z = cube.geometry.parameters.depth / 2 * cube.scale.z
      cubes.add(cube)
      material.dispose();
  }
  geometry.dispose();
}

function render() {
    var delta = clock.getDelta()
    renderer.clear()
    composer.render(delta)
    requestAnimationFrame( render )

    //noise generator
    noise_counter += 0.01
    noise_pass.uniforms["amount"].value = noise_counter
    if (noise_counter > 1000) {
      noise_counter = 0.0
    }

    TWEEN.update()
}

function on_window_resize() {
    camera.left = window.innerWidth / - 2
    camera.right = window.innerWidth / 2
    camera.top = window.innerHeight / 2
    camera.bottom = window.innerHeight / - 2

    camera.updateProjectionMatrix()

    renderer.setSize( window.innerWidth, window.innerHeight )
}

// save melody in a melody buffer
function write_to_dic(mel, beats, info, vel, scale) {
    arr = []
    arr.push(mel)
    arr.push(beats)
    arr.push(info)
    arr.push(vel)
    arr.push(scale)
    collected_blocks.push(arr)
}

// create melody of transactions in the buffer
function define_content() {
    //do not create melody if no new blocks
    if (transactions.length == transactions_last) {
      return
    }
    discarded = transactions.length - 128
    if (discarded < 0) {
      discarded = 0
    }

    var new_melody = []
    var new_beats = []
    var new_velocity = []
    var new_scale = []
    var transaction_info = []

    // pop old values if longer than 64
    while (transactions.length > 64) {
      transactions.shift()
    }

    transactions_last = transactions.length

  	for (var xx = 0; xx < transactions.length; xx++ ) {
        var one_info = []
        this_tx = transactions[xx]

        let amount = this_tx.amount
        let type = this_tx.subtype
        one_info.push(this_tx.hash)
        one_info.push(amount.toFixed(4))
        one_info.push(type)
        transaction_info.push(one_info)

        new_beats.push(interpret_amount_beat(amount))
        if (interpretation == 0) {
          new_melody.push(interpret_hash(this_tx.hash, type))
        }
        else if (interpretation == 1){
          new_melody.push(interpret_amount_note(amount, type))
        }
        new_velocity.push(interpret_amount_vel(amount))
        new_scale.push(interpret_amount_scale(amount))
  	}
    // save to be played after current melody
    write_to_dic(new_melody, new_beats, transaction_info, new_velocity, new_scale)
}

//play note
async function schedule_next(){
  if (collected_blocks.length != 0) {
    playing = true

  	var n = collected_blocks[blockSeq][0][xCount]
  	var b = collected_blocks[blockSeq][1][xCount]
  	var v = collected_blocks[blockSeq][3][xCount]
  	var s = collected_blocks[blockSeq][4][xCount]

		//console.log(n, b, v, s, xCount)
    let hash = collected_blocks[blockSeq][2][xCount][0]
    let amount = collected_blocks[blockSeq][2][xCount][1]
    let type = collected_blocks[blockSeq][2][xCount][2]
		play_note(n,b,v, s, xCount, amount, type, hash)

  	if (xCount  < collected_blocks[blockSeq][0].length-1) {
      xCount++
      await sleep(b)
      schedule_next()
      //schedule the next event relative to the current time by prefixing "+"
  		//Tone.Transport.scheduleOnce(schedule_next, ("+" + b))

  	} else {
      playing = false
  		blockSeq++

      //clean up collected blocks if there are no queued
      if (collected_blocks.length == blockSeq) {
        while (collected_blocks.length > 0) {
          collected_blocks.shift()
          blockSeq = 0
        }
      }

      //clean up collected blocks if too many
      while (collected_blocks.length > 999) {
        collected_blocks.shift()
        blockSeq--
        if (blockSeq < 0) {
          blockSeq = 0
        }
      }
  		check_for_new_content()
  	}
  }
  else {
    playing = false
    check_for_new_content()
  }
}

/*
  Check if new blocks have been saved in the queue to be played
*/
async function check_for_new_content() {
	if (collected_blocks[blockSeq] !== undefined) {
		if (collected_blocks[blockSeq][0].length > 0) {
			update_current_notes(Math.floor(Math.random() * chords.length))
			xCount = 0
      new_melody = true

      document.getElementById("current-queue").innerHTML = 'Blocks Queued: <mark class="blue">' + (transactions.length-transactions_last) + '</mark> '
      document.getElementById("current-sequence").innerHTML = ' Melody Sequence: <mark class="blue">' + (blockSeq+1) + '</mark> / <mark class="blue">' + (collected_blocks.length) + '</mark>'

      //increase base melody speed if lagging behind on blocks
      var multiplier = (collected_blocks.length - (blockSeq+1)) * 0.2
      if (multiplier < 1) {
        multiplier = 1
      }
      base_measure = base_measure_init * (1/multiplier)

      await sleep('1m')
      //create_grid(collected_blocks[blockSeq])
      //only create new grid if the window size has changed
      if (resize_ordered) {
        resize_ordered = false
        create_grid(64)
      }
      schedule_next()
			//Tone.Transport.scheduleOnce(schedule_next, ("+1m"))
		} else {
			blockSeq++
      await sleep('1m')
      check_for_new_content()
			//Tone.Transport.scheduleOnce(check_for_new_content, ("+1m"))
		}
	} else {
    await sleep('1m')
    check_for_new_content()
		//Tone.Transport.scheduleOnce(check_for_new_content, ("+1m"))
	}
  if (should_reset) {
    collected_blocks = []
    blockSeq = 0
    should_reset = false
    playing = false
  }
}

//const now = Tone.now()
function play_note(n, b, v, s, x, a, t, h) {
  notes_array.push(new Tone.Event(function(time, pitch){
    //this should be in the draw schedule for perfect visual sync but then the music stops when switching tab..
    synth.triggerAttackRelease(pitch, "4n", time, .5, "+0.05")

    Tone.Draw.schedule(function(){
		//this callback is invoked from a requestAnimationFrame
		//and will be invoked close to AudioContext time
    if (new_melody) {
      new_melody = false
    	var col = new THREE.Color(current_colors[0])
    	renderer.setClearColor(col, .25)
    }
    // update stats
    document.getElementById("current-hash").innerHTML = '<a target="_blank" href="' + block_explorer  + h + '">' + h.substring(0,5) + '...' + h.substring(59,64) + '</a> | ' + a + ' | ' + t + ' ► Note: ' + n + " - " + b
		trigger_light(x, a, t)
	  }, time) //use AudioContext time of the event
	}, n).start(Tone.now()))

  //allow up to 64 notes to be played simulatenously before releasing them from memory
  while (notes_array.length > 64) {
    notes_array[0].stop("1m")
    notes_array.shift()
  }
}

/*
  Hash interpreting into notes
*/
var mode = function mode(arr) {
    return arr.reduce(function(current, item) {
        var val = current.numMapping[item] = (current.numMapping[item] || 0) + 1
        if (val > current.greatestFreq) {
            current.greatestFreq = val
            current.mode = item
        }
        return current
    }, {mode: null, greatestFreq: -Infinity, numMapping: {}}, arr).mode
}

function add(string) {
    string = string.split('')
    var nums = []
    for (var i = 0; i < string.length; i++) {
        nums[i] =  parseInt(string[i],10)
    }
    return nums
}

// read data from websocket callback
function processSocket(data, nanocrawler) {
  let res = JSON.parse(data)

  if (nanocrawler) {
    var txData = {
  		"account": [res.data.account],
  		"hash": res.data.hash,
  		"amount": (res.data.amount / 1000000000000000000000000000000),
      "subtype": res.data.subtype
  	}
  }
  else {
    var txData = {
  		"account": [res.message.account],
  		"hash": res.message.hash,
  		"amount": (res.message.amount / 1000000000000000000000000000000),
      "subtype": res.message.block.subtype
  	}
  }

  //increase sent / received
  if (txData.subtype == "send") {
    nano_sent += txData.amount
  }
  else if (txData.subtype == "receive") {
    nano_received += txData.amount
  }

	//console.log(txData)
  transactions.push(txData)

  //randomize the amount on screen
  text_generator(txData.amount, txData.hash, txData.subtype)
  document.getElementById("current-queue").innerHTML = 'Blocks Queued: <mark class="blue">' + (transactions.length-transactions_last) + '</mark> '
  document.getElementById("current-tx").innerHTML = ' Total Sent / Received: <mark class="blue">' + add_commas(nano_sent.toFixed(4)) + '</mark> / <mark class="blue">' + add_commas(nano_received.toFixed(4)) + '</mark>'
}

async function socket_sleep_main(wait) {
  if (wait) {
    await sleep_simple(10000)
  }
  socket_nano_main = new WebSocket(url_nano_main)
  socket_nano_main.addEventListener('open', mainSocketOpenListener)
  socket_nano_main.addEventListener('message', mainSocketMessageListener)
  socket_nano_main.addEventListener('close', mainSocketCloseListener)
}

async function socket_sleep_beta(wait) {
  if (wait) {
    await sleep_simple(10000)
  }
  socket_nano_beta = new WebSocket(url_nano_beta)
  socket_nano_beta.addEventListener('open', betaSocketOpenListener)
  socket_nano_beta.addEventListener('message', betaSocketMessageListener)
  socket_nano_beta.addEventListener('close', betaSocketCloseListener)
}

const mainSocketMessageListener = (event) => {
  if (netSelected == 0) {
    processSocket(event.data, websocket_nc_main)
  }
}

const mainSocketOpenListener = (event) => {
  console.log("Websocket main opened")
  if (websocket_nc_main) {
    //Nanocrawler interface
  	socket_nano_main.send(JSON.stringify({
      event: "subscribe",
      data: ["all"]
    }))
  }
  else {
    //Node default interface
    socket_nano_main.send(JSON.stringify({
      action: "subscribe",
      topic: "confirmation"
    }))
  }
}

const mainSocketCloseListener = (event) => {
  if (socket_nano_main) {
    console.error('Main socket disconnected.')
    ga('send', 'event', 'websocket-disconnect', 'main', 'main')
    socket_sleep_main(true)
  }
  else {
    socket_sleep_main(false)
  }
}

const betaSocketMessageListener = (event) => {
  if (netSelected == 1) {
    processSocket(event.data, websocket_nc_beta)
  }
}

const betaSocketOpenListener = (event) => {
  console.log("Websocket beta opened")
  if (websocket_nc_beta) {
    //Nanocrawler interface
  	socket_nano_beta.send(JSON.stringify({
      event: "subscribe",
      data: ["all"]
    }))
  }
  else {
    //Node default interface
    socket_nano_beta.send(JSON.stringify({
      action: "subscribe",
      topic: "confirmation"
    }))
  }
}

const betaSocketCloseListener = (event) => {
  if (socket_nano_beta) {
    console.error('Beta socket disconnected.')
    ga('send', 'event', 'websocket-disconnect', 'main', 'main')
    socket_sleep_beta(true)
  }
  else {
    socket_sleep_beta(false)
  }
}

//melody interval
setInterval(function() {
  //only add a new melody if not currently playing or if the melody is full (this will make the music less repetitive)
  if (!playing || (transactions.length - transactions_last) >= 64) {
    define_content()
  }
}, melody_interval)

$(document).ready(function(){
  //Switches
  $('#net-switch').change(function() {
    ga('send', 'event', 'buttton', 'click-net-switch', 'net-switch')
     if($(this).is(":checked")) {
       netSelected = 1
       block_explorer = block_explorer_beta
     }
     else {
       netSelected = 0
       block_explorer = block_explorer_main
     }
     nano_sent = 0
     nano_received = 0
  })

  $('#note-switch').change(function() {
    ga('send', 'event', 'buttton', 'click-note-switch', 'note-switch')
    if($(this).is(":checked")) {
      interpretation = 1
    }
    else {
      interpretation = 0
    }
  });

  //Handle automatic cookies for all checkboxes. Using js.cookie.js plugin
  $('input[type=checkbox]').each(function() {
    var mycookie = Cookies.get($(this).attr('name'))

    if (mycookie == 'true') {
      $(this).prop('checked', true)
      if ($(this).attr('name') == 'net-switch') {
        netSelected = 1
        block_explorer = block_explorer_beta
      }
      if ($(this).attr('name') == 'note-switch') {
        interpretation = 1
      }
    }
    else if (mycookie == 'false') {
      $(this).prop('checked', false)
      if ($(this).attr('name') == 'net-switch') {
        netSelected = 0
        block_explorer = block_explorer_main
      }
      if ($(this).attr('name') == 'note-switch') {
        interpretation = 0
      }
    }
  })

  $('input[type=checkbox]').change(function() {
    Cookies.set($(this).attr("name"), $(this).prop('checked'), {
        path: '',
        expires: 365
    })
  })

  document.getElementById("info-button").addEventListener("click", function(e) {
      var l = document.getElementById("info")
      l.classList.toggle("hidden")
      l = document.getElementById("play_button")
      if (l) {
        l.classList.toggle("hidden")
      }
      return e.preventDefault()

      ga('send', 'event', 'buttton', 'click-info', 'info')
  }),
  document.getElementById("close-button").addEventListener("click", function(e) {
    var l = document.getElementById("info")
    l.classList.toggle("hidden")
    l = document.getElementById("play_button")
    if (l) {
      l.classList.toggle("hidden")
    }
    return e.preventDefault()
  })

  var $start = document.querySelector('#play_button')
	$(".play_button").show()
	$(".play_button").click(function(){
    ga('send', 'event', 'buttton', 'click-play', 'play')
    Tone.start()
		StartAudioContext(Tone.context, $start, () => {
			$start.remove()
			console.log('AUDIO READY')
		})
		init()
	})

  $(".volume-chooser").on("input", ".volume", function(e){
    volumeval = $(e.currentTarget).val()
    Cookies.set("volume", volumeval, {
        path: '',
        expires: 365
    })
    if(!muted) {
      var volume = Tone.Master;
        volume.set("volume", -(40-volumeval));
    }
  })

  // mute button
  document.getElementById("speaker").addEventListener("click", function(e) {
    ga('send', 'event', 'buttton', 'click-mute', 'mute')
    this.classList.toggle('is-muted')
    mute_sound()
    Cookies.set("muted", muted, {
        path: '',
        expires: 365
    })
  })

  //restore volume from cookie
  var vol = Cookies.get('volume')
  if(vol != undefined) {
    $('.volume-chooser .volume').val(vol)
  }

  //restore mute state from cookie
  var cookie_mute = Cookies.get('muted')
  if(cookie_mute != undefined) {
    if(cookie_mute == 'true') {
      mute_state = true
      document.getElementById("speaker").classList.toggle('is-muted')
    }
  }

  //set mute state
  if (mute_state == true) {
    muted = true
  }
  else {
    muted = false
  }
})
