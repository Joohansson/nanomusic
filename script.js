var scene, camera, renderer, composer
var geometry, material, mesh
var started = false
var sphere
var prior_block_id
// var current_melody = []
// var unused_positions = []
var beat_lengths = ["1n", "1n", "2n", "4n", "2n", "4n", "4n", "8n"]
var collected_blocks = []
var current_colors = []
var last_block_played
var mute = false
var clock = new THREE.Clock()
var special_colors = ["0xff1744", "0xf50057", "0xd500f9", "0xff3d00"]
var notes = ["C2", "D#2", "F2", "Ab2", "Ab3", "G3", "C4", "Bb3", "F3", "D4", "Eb4"]
// var chords = [ ["C2", "F2", "Ab2", "C4"], ["Eb3", "G3", "Ab4", "G2"], ["F2", "Bb3", "F3", "D4"], ["G2", "Bb3", "C4", "Eb4"] ]
const url_nano_main = "wss://ws.nanocrawler.cc"
const url_nano_beta = "wss://beta.ws.nanocrawler.cc"
const block_explorer_main = "https://nanocrawler.cc/explorer/block/"
const block_explorer_beta = "https://beta.nanocrawler.cc/explorer/block/"
var block_explorer = block_explorer_main

//var socket_nano_main = new WebSocket(url_nano_main)
//var socket_nano_beta = new WebSocket(url_nano_beta)
var socket_nano_main
var socket_nano_beta
var netSelected = 0 //0=main, 1=beta
var interpretation = 0 //0=hash note, 1=amount note

var transactions = []
var new_blocks = false //indicate when new blocks has arrived
var has_init = false //indicate first init, to avoid double init melodies when using the slider
var should_reset = false //if the next loop should restart from 0 collected blocks
var melody_interval = 20000 //initial delay
var transactions_last = 0 //last processed melody length

var chords = [["B1", "F#1", "F#2", "B2", "F#3", "B3", "D3", "A3", "D4", "E4", "A4", "D5"],
["B2", "F#2", "B3", "F#3", "D2", "E2", "A2", "D3", "E3", "A3", "D4"],
["D2", "F#2", "D3", "F#3", "D2", "E2","F#2", "A2", "E3", "A3", "E4" ],
["F#2", "C#2", "F#3", "C#3", "E3", "F#3", "A3", "B3", "C#3", "E4", "A4", "B4", "E5"],
["D1", "A2", "D2", "A3", "E3", "F#3", "G#3", "A3", "B3", "E4", "B4"],
["A2", "E2", "A3", "E3", "F#3", "G#3", "B3", "C#4", "E4", "B4"],
["C#2", "F#2", "C#3", "F#3", "G#3", "A3", "C#4", "A4", "C#5"],
["F#1", "C#2", "F#2", "C#3", "F#3", "G#3", "A3", "B3", "C#4", "F#4"],
["E1", "A1", "E2", "A2", "C#3", "F#3", "G#3", "A3", "B3", "E4", "G#4", "B4", "E5"],
["D1", "A1", "D2", "A2", "F#3", "G#3", "A3", "E4", "A4", "E5"]]
var current_notes = chords[0]
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
    ran =64,
    spotLight, ambient_light, plane,

    FOV = 200


// mainGain.gain.exponentialRampToValueAtTime(.1, context.currentTime + 1)
//     mainGain.gain.value = .1

function mute_sound() {
    Tone.Master.mute = !Tone.Master.mute
}

var osc, reverb, feedbackDelay, feedbackDelay2, feedbackDelay3, wider, eq, synthEQ, synth, polySynth, conga, congaPart, noise, autoFilter

function start_tone_stuff(){
  reverb = new Tone.Freeverb(.95).toMaster()
	reverb.dampening.value = 3000
	feedbackDelay = new Tone.FeedbackDelay("6n", .75).toMaster()
	feedbackDelay3 = new Tone.FeedbackDelay("1n", 0.55).toMaster()

	wider = new Tone.StereoWidener (1).connect(reverb)
	feedbackDelay2 = new Tone.PingPongDelay("3n", .25).connect(wider)
	//var stereoFeed = new Tone.StereoFeedbackEffect ().connect(feedbackDelay2)

	eq = new Tone.EQ3(-5, 3, -9).connect(feedbackDelay2)

	synthEQ = new Tone.EQ3(-10, -1, 3).connect(feedbackDelay)

	synth = new Tone.FMSynth().connect(feedbackDelay)
	synth.set({
		harmonicity:3,
		modulationIndex:3.5,
		detune:.01,
		oscillator:{
			type:"sine"
		},
		envelope:{
			attack:0.001,
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
	synth.volume.value = -5
	feedbackDelay.wet.value = .5

	polySynth = new Tone.PolySynth(4, Tone.MonoSynth).connect(eq)
	polySynth.set({
	    "oscillator" : "PWM",
	    "envelope" : {
	        "attack" : 5,
	        "release" : .5,
	        "attackCurve" : "sine",
	        "releaseCurve" : "exponential"
	    }
	})
	polySynth.volume.value = -55

	var loop2 = new Tone.Loop(function(time){
	    polySynth.triggerAttackRelease(current_notes[Math.floor(Math.random() * (current_notes.length - 5))], "1m")
	}, beat_lengths[Math.floor(Math.random() * beat_lengths.length)]).start()
	conga = new Tone.MembraneSynth({
	    "pitchDecay" : 0.004,
	    "octaves" : 4,
	    "envelope" : {
	        "attack" : 0.0005,
	        "decay" : 0.4,
	        "sustain" : 0
	    }
	}).connect(feedbackDelay)
	//conga.volume.value = -100
	//congaPart = new Tone.Sequence(function(time, pitch){
	//   conga.triggerAttack(pitch, time, Math.random()*0.5 + 0.5)
	//}, ["D1"], "2n").start(0)

	noise = new Tone.Noise("white").start()
	noise.volume.value = -40
	//make an autofilter to shape the noise
	autoFilter = new Tone.AutoFilter({
		"frequency" : "20m",
		"min" : 300,
		"max" : 1000
	}).connect(reverb)

	//connect the noise
	noise.connect(autoFilter)
	//start the autofilter LFO
	autoFilter.start()

	Tone.Transport.start("+0.01")
}


function update_current_notes(xx) {
	//console.log("Chord: " + xx)
	current_notes = chords[xx]
	current_colors = color_schemes[xx]
}

//send dummy tones to initialize the graphics
function dummy_notes() {
  transactions = []
  transactions_last = 0
  hashes = [
    "000000000000000000000000000000000000000000000000000000000000000",
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

  new_blocks = true
  define_content()
  //transactions = [] //if not using this, the new blocks will append to the dummy melody
}

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
    if (size > 80) {
        size = 80
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

    elem.style.fontSize = size + "px"
    elem.style.position = "absolute"
    elem.style.left = Math.round(Math.random() * (fullWidth)) + "px"
    elem.style.top = Math.round(Math.random() * (fullHeight)) + 100 + "px"
    elem.classList.add("floating-text")

    //fadeout effect
    var fadeEffect = setInterval(function () {
        if (!elem.style.opacity) {
            elem.style.opacity = 0.8
        }
        if (elem.style.opacity > 0.025) {
            elem.style.opacity -= 0.025
        } else {
            elem.remove()
            clearInterval(fadeEffect)
        }
    }, 150 + fade_delay)
    document.body.appendChild(elem)
}

function init() {
    has_init = true
	  start_tone_stuff()
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

    //camera.updateProjectionMatrix()
    // camera.left = window.innerWidth / - 2
    // camera.right = window.innerWidth / 2
    // camera.top = window.innerHeight / 2
    // camera.bottom = window.innerHeight / - 2
    camera.updateProjectionMatrix()
    scene = new THREE.Scene()
    scene.add(camera)
    renderer = new THREE.WebGLRenderer( {canvas: e,alpha: true, antialias:true} )
    var t = e.getContext("2d")
    e = document.getElementById("canvas")

    // mute button
    document.getElementById("speaker").addEventListener("click", function(e) {
        this.classList.toggle('is-muted')
        mute_sound()
    })

    for (var p = document.getElementById("address-info"), b = document.getElementsByClassName("address-button"), E = 0; E < b.length; E++)
        b[E].addEventListener("click", function(e) {
            return e.preventDefault(),
            p.classList.toggle("hidden"),
            !1
        })
    window.addEventListener("resize", on_window_resize, !1)

	   renderer.setClearColor(0x000000)
	    renderer.setPixelRatio( window.devicePixelRatio )
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.autoClear = false

    var renderPass = new THREE.RenderPass(scene, camera)
    composer = new THREE.EffectComposer(renderer)

    composer.addPass(renderPass)

    var bloomPass = new THREE.BloomPass(1,25,5,128)
    composer.addPass(bloomPass)
    bloomPass.clear = true

    var effectFilm = new THREE.FilmPass(1, .05, 128, false)
    effectFilm.renderToScreen = true
    composer.addPass(effectFilm)
    //container = document.getElementById( 'container' )
    //container.appendChild( renderer.domElement )

    // container = document.getElementById( 'container' )
    // container.appendChild( renderer.domElement )
    var mesh = new THREE.SphereGeometry(300,300,12)
	  var vat2 = new THREE.MeshBasicMaterial()
	  //vat2.blending = THREE.AdditiveBlending
	  sphere = new THREE.Mesh(mesh, vat2)
	  sphere.material.opacity = 0
	  sphere.scale.x = 0.001
	  sphere.scale.y = 0.001
	  sphere.scale.z = 0.001
    spotLight = new THREE.DirectionalLight( 0x0066f0 ),
    //ambient_light = new THREE.AmbientLight( 0x66f606 )
    cubes = new THREE.Object3D()
    // plane = new THREE.Mesh(
    //     new THREE.PlaneBufferGeometry( world_width * 2, world_height * 2, 1 ),
    //     new THREE.MeshBasicMaterial({
    //         color: 0x00ffff
    //     })
    // )
    // plane.rotation.z = 180
    // plane.position.set( 0, 0, -10 )
    // plane.castShadow = false
    // plane.recieveShadow = false

    camera.position.set( 0, 0, 90 )
    camera.lookAt( scene.position )

    //spotLight.position.set( 1000, 10, 400 )
    //spotLight.intensity = .1
    scene.add(sphere)
    scene.add( cubes )
    scene.add( spotLight )
    //scene.add( ambient_light )

    var ran = Math.floor(Math.random() * 50)

    check_for_new_content()
    render()

    dummy_notes()
}

function trigger_light(x, hasPitch, scale) {
    if (!collected_blocks[blockSeq]) {
      return
    }
    var block_info = collected_blocks[blockSeq][2][x]
    if (!block_info) {
      return
    }
    //update_transaction_display(block_info)

    var ran_cube = cubes.children[ (cubes.children.length - 1) -  x]
    var justCol = block_info[1]
    var new_col = interpret_cube_color(justCol)
    ran_cube.material.color.setHex( new_col)
    if (hasPitch){
        ran_cube.material.opacity= 1
        tween1 = new TWEEN.Tween( ran_cube.material )
            .to( {opacity: 0 }, 12000 )
            .repeat( 0 )
            .easing( create_step_function(64) )
            .start()
    } else {
        ran_cube.material.opacity= .1
        tween1 = new TWEEN.Tween( ran_cube.material )
            .to( {opacity: 0 }, 12000 )
            .repeat( 0 )
            .easing(  create_step_function(12)  )
            .start()
    }
}

function create_step_function(numSteps) {
	return function(k) {
		return (Math.floor(k * numSteps) / numSteps)
	}
}

function interpret_amount_beat(val) {
	if (val < .01) {
		return "32n"
	} else if ((val >= .01) && (val < 0.1)) {
		return "16n"
	} else if ((val >= 0.1) && (val < 1)) {
		return "8n"
	} else if ((val >= 1) && (val < 10)) {
		return "4n"
	} else if ((val >= 10) && (val < 100)) {
		return "2n"
	} else if ((val >= 100) && (val < 1000)) {
		return "1n"
	} else if ((val >= 1000) && (val < 10000)) {
		return "1m"
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
	}else if ((val >= 100)) {
		return .9
	}
}

function interpret_hash(hash) {
    notes = ["A3", "Bb3", "C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4", "C5", "Eb5", "G5"]
    num_hash = hash.replace(/\D/g,'')
    num = mode(add(num_hash))
    //num = Math.floor(Math.random() * notes.length)
    return notes[num]
}

function interpret_amount_note(val){
  if (val < .001) {
		return current_notes[current_notes.length - 1]
	} else if ((val >= .001) && (val < 0.01)) {
		return current_notes[current_notes.length - 2]
	} else if ((val >= 0.01) && (val < 0.1)) {
		return current_notes[current_notes.length - 3]
	} else if ((val >= 0.1) && (val < 1)) {
		return current_notes[current_notes.length - 4]
	} else if ((val >= 1) && (val < 10)) {
		return current_notes[current_notes.length - 5]
	} else if ((val >= 10) && (val < 100)) {
		return current_notes[current_notes.length - 6]
	}else if ((val >= 100) && (val < 1000)) {
		return current_notes[current_notes.length - 7]
	}else if ((val >= 1000) && (val < 5000)) {
		return current_notes[current_notes.length - 8]
	}else if ((val >= 5000)) {
		return current_notes[current_notes.length - 9]
	}
}

function interpret_cube_color(val){
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
	}else if ((val >= 1000) && (val < 5000)) {
		return current_colors[1]
	}else if ((val >= 5000)) {
		return current_colors[0]
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
	} else if ((val >= 1000)) {
		return 22
	}
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
    // only create new melody if new blocks has arrived
    if (!new_blocks) {
      return
    }
    discarded = transactions.length - 128
    if (discarded < 0) {
      discarded = 0
    }
    //console.log("Discarded tx: " + discarded)
    var new_melody = []
    var new_beats = []
    var new_velocity = []
    var new_scale = []
    var transaction_info = []
    var block_num = 0

    // pop old values if longer than 64
    while (transactions.length > 64) {
      transactions.shift()
    }

    transactions_last = transactions.length

    if (transactions.length == 0) {
    	var one_info = []
		    //one_info.push(this_tx.block_id)
		    one_info.push("0")
        one_info.push(0)
        transaction_info.push(one_info)
    } else {
    	for (var xx = 0; xx < transactions.length; xx++ ) {
	        var one_info = []
	        this_tx = transactions[xx]

 	        var amount =  this_tx.amount
	        one_info.push(this_tx.hash)
	        one_info.push(amount.toFixed(4))
	        transaction_info.push(one_info)
	        if (this_tx.amount == 0) {
	            new_melody.push('C7')
	            new_beats.push("4n")
	            new_velocity.push(0)
	            //newMelody.push(["4n", null])
	        } else {
	            new_beats.push(interpret_amount_beat(amount))
              if (interpretation == 0) {
                new_melody.push(interpret_hash(this_tx.hash))
              }
              else if (interpretation == 1){
                new_melody.push(interpret_amount_note(amount))
              }
	            new_velocity.push(interpret_amount_vel(amount))
	            new_scale.push(interpret_amount_scale(amount))
	        }
    	}
    }
    // play the melody
    //console.log(new_melody)
    write_to_dic(new_melody, new_beats, transaction_info, new_velocity, new_scale)
    new_blocks = false //disable repeating the melody if no new blocks
}

function create_grid(content) {
	var framedWidth = (window.innerWidth) * .9 //frame amount
    var transaxx = content[0].length
    var fixedWidthOfOneUnit = framedWidth / transaxx
    if (fixedWidthOfOneUnit > 150) {
    	fixedWidthOfOneUnit = 150
    }
    var totalWidth =  fixedWidthOfOneUnit * transaxx
    //var offset = (framedWidth - totalWidth) / transaxx
    var the_floor = ((totalWidth) * .5) - (fixedWidthOfOneUnit * .5)

    var geometry = new THREE.BoxGeometry(fixedWidthOfOneUnit, window.innerHeight, 50)
    for (var x = transaxx - 1; x > -1; x--) {
        material = new THREE.MeshBasicMaterial({
                    })
        material.color.setHex (0x00ffff)
        material.transparent = true
        material.opacity = 0
        var cube = new THREE.Mesh(geometry, material)
        //cube.scale.y = world_height
        cube.scale.z = 1
        cube.position.x = the_floor - (fixedWidthOfOneUnit * x)
        cube.position.y = 0
        cube.position.z = cube.geometry.parameters.depth / 2 * cube.scale.z
        cubes.add(cube)
    }
}

$(document).ready(function(){
	var $start = document.querySelector('#play_button')

  document.getElementById("net-switch").addEventListener('change', (event) => {
      if (event.target.checked) {
          netSelected = 1
          block_explorer = block_explorer_beta
      } else {
          netSelected = 0
          block_explorer = block_explorer_main
      }
      if (has_init) {
          dummy_notes()
          should_reset = true
          document.getElementById("currentSequence").innerHTML = "Blocks Queued: " + (transactions.length-transactions_last) + " | Melody Sequence: " + blockSeq + " / " + (collected_blocks.length)
      }
  })

  document.getElementById("note-switch").addEventListener('change', (event) => {
      if (event.target.checked) {
          interpretation = 1
      } else {
          interpretation = 0
      }
  })

  document.getElementById("info-button").addEventListener("click", function(e) {
      var l = document.getElementById("info")
      return e.preventDefault(),
      l.classList.toggle("hidden"),
      !1
  }),
  document.getElementById("close-button").addEventListener("click", function(e) {
      var l = document.getElementById("info")
      return e.preventDefault(),
      l.classList.toggle("hidden"),
      !1
  })

	//init()
	$(".play_button").show()
	$(".play_button").click(function(){
    Tone.start()
		StartAudioContext(Tone.context, $start, () => {
			$start.remove()
			console.debug('AUDIO READY')
		})
		init()
	})
})

function render() {
    var delta = clock.getDelta()
    renderer.clear()
    composer.render(delta)
    requestAnimationFrame( render )
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

//setInterval(update_data(), delay)
var blockSeq = 0
var xCount = 0
function schedule_next(){
  if (collected_blocks.length != 0) {
    //play note
    if (xCount == 0 ) {
    	var col = new THREE.Color(current_colors[0])
    	renderer.setClearColor(col, .25)
    }
  	var n = collected_blocks[blockSeq][0][xCount]
  	var b = collected_blocks[blockSeq][1][xCount]
  	var v = collected_blocks[blockSeq][3][xCount]
  	var s = collected_blocks[blockSeq][4][xCount]
  	if (n !== "C7") {
  		//console.log(n, b, v, s)
  		play_note(n,b,v, s, xCount)

      // update stats
      var hash = collected_blocks[blockSeq][2][xCount][0]
      var amount = collected_blocks[blockSeq][2][xCount][1]
      document.getElementById("currentHash").innerHTML = '<a target="_blank" href="' + block_explorer  + hash + '">' + hash + '</a> | ' + amount + ' ► Note: ' + n + " - " + b
  	} else {
  		trigger_light(xCount, false, 1)
  	}

  	if (xCount  < collected_blocks[blockSeq][0].length-1) {
  		//schedule the next event relative to the current time by prefixing "+"
  		Tone.Transport.scheduleOnce(schedule_next, ("+" + b))
  		xCount++
  	} else {
  		blockSeq++
      //console.log("Sequence:" + blockSeq + " / " + (collected_blocks.length))
      document.getElementById("currentSequence").innerHTML = "Blocks Queued: " + (transactions.length-transactions_last) + " | Melody Sequence: " + blockSeq + " / " + (collected_blocks.length)
  		check_for_new_content()
  	}
  }
  else {
    check_for_new_content()
  }
}

function check_for_new_content() {
	if (collected_blocks[blockSeq] !== undefined) {
		if (collected_blocks[blockSeq][0].length > 0) {
			update_current_notes(Math.floor(Math.random() * chords.length))
			xCount = 0
			create_grid(collected_blocks[blockSeq])

			Tone.Transport.scheduleOnce(schedule_next, ("+1m"))
		} else {
			//update_transaction_display(collected_blocks[blockSeq][2][0])
			blockSeq++
			Tone.Transport.scheduleOnce(check_for_new_content, ("+1m"))
		}
	} else {
		Tone.Transport.scheduleOnce(check_for_new_content, ("+1m"))
	}
  if (should_reset) {
    collected_blocks = []
    blockSeq = 0
    should_reset = false
  }
}

//const now = Tone.now()
function play_note(n, b, v, s, x) {
	var note = new Tone.Event(function(b, n){
		synth.triggerAttackRelease(n, "4n", b, .5)
		trigger_light(x, true,s)
	}, n).start(Tone.now())
}

//melody interval
setInterval(function() {
    define_content()
}, melody_interval)

const mainSocketMessageListener = (event) => {
  if (netSelected == 0) {
    processSocket(event.data)
  }
}

const mainSocketOpenListener = (event) => {
  console.log("Websocket main opened")
	socket_nano_main.send(JSON.stringify({
    event: "subscribe",
    data: ["all"]
  }))
}

const mainSocketCloseListener = (event) => {
  if (socket_nano_main) {
    console.error('Main socket disconnected.')
  }
  socket_nano_main = new WebSocket(url_nano_main)
  socket_nano_main.addEventListener('open', mainSocketOpenListener)
  socket_nano_main.addEventListener('message', mainSocketMessageListener)
  socket_nano_main.addEventListener('close', mainSocketCloseListener)
}

const betaSocketMessageListener = (event) => {
  if (netSelected == 1) {
    processSocket(event.data)
  }
}

const betaSocketOpenListener = (event) => {
  console.log("Websocket beta opened")
	socket_nano_beta.send(JSON.stringify({
    event: "subscribe",
    data: ["all"]
  }))
}

const betaSocketCloseListener = (event) => {
  if (socket_nano_beta) {
    console.error('Beta socket disconnected.')
  }
  socket_nano_beta = new WebSocket(url_nano_beta)
  socket_nano_beta.addEventListener('open', betaSocketOpenListener)
  socket_nano_beta.addEventListener('message', betaSocketMessageListener)
  socket_nano_beta.addEventListener('close', betaSocketCloseListener)
}

mainSocketCloseListener()
betaSocketCloseListener()

// read data from websocket callback
function processSocket(data) {
  let res = JSON.parse(data)

	var txData = {
		"account": [res.data.account],
		"hash": res.data.hash,
		"amount": (res.data.amount / 1000000000000000000000000000000),
    "subtype": res.data.subtype
	}

	//console.log(txData)
  transactions.push(txData)
  new_blocks = true

  //randomize the amount on screen
  text_generator(txData.amount, txData.hash, txData.subtype)
  document.getElementById("currentSequence").innerHTML = "Blocks Queued: " + (transactions.length-transactions_last) + " | Melody Sequence: " + blockSeq + " / " + (collected_blocks.length)
}

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

function SetToZero() {
	sphere.scale.x = 0.001
	sphere.scale.y = 0.001
	sphere.scale.z = 0.001
	sphere.material.opacity = 0
}
