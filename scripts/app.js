

var visualizeIt;

$(document).ready(function () {
    visualizeIt = new AudioVisualizer();
    visualizeIt.setup();
    visualizeIt.createCapBar();
    visualizeIt.setupAudioProc();
    visualizeIt.getAudio();
    visualizeIt.dropHandler();
});


function AudioVisualizer() {
    //constants
    this.numberOfElements = 50;

    //Rendering
    this.scene;
    this.camera;
    this.renderer;
    this.controls;

    //barArray and capsArray
    this.barArray = new Array();
    this.capsArray =  new Array();

    //audio
    this.javascriptNode;
    this.audioContext;
    this.sourceBuffer;
    this.analyser;
}

//setup the visualizeIt elements
AudioVisualizer.prototype.setup = function () {
    //generate a ThreeJS Scene
    this.scene = new THREE.Scene();

    //get the width and height
    var WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;

    //get the renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(WIDTH, HEIGHT);

    //append the rederer to the body
    document.body.appendChild(this.renderer.domElement);

    //create and add camera
    this.camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 20000);
    this.camera.position.set(0, 45, 0);
    this.scene.add(this.camera);

    var that = this;

    //update renderer size, aspect ratio and projection matrix on resize
    window.addEventListener('resize', function () {

        var WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight;

        that.renderer.setSize(WIDTH, HEIGHT);

        that.camera.aspect = WIDTH / HEIGHT;
        that.camera.updateProjectionMatrix();

    });

    //background color of the scene
    this.renderer.setClearColor(0x423434, 1);

    //create a light and add it to the scene
    var light = new THREE.PointLight(0xffffff);
    light.position.set(-100, 200, 100);
    this.scene.add(light);

    //Add interation capability to the scene
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
};

//create the barArray required to show the visualization
AudioVisualizer.prototype.createCapBar = function () {

    //iterate and create barArray
    for (var i = 0; i < this.numberOfElements; i++) {

        //create a bar
        var barGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

        var capGeometry =  new THREE.CubeGeometry(0,5,0.5,0.5);

        var capMaterial =   new THREE.MeshPhongMaterial({
            color: this.getRandomColor(),
            ambient: 0x808080,
            specular: 0xffffff,
            shininess: 20,
            reflectivity: 5.5
        });

        //create a material
        var material = new THREE.MeshPhongMaterial({
            color: this.getRandomColor(),
            ambient: 0x808080,
            specular: 0xffffff
        });

        //create the geometry and set the initial position
        this.barArray[i] = new THREE.Mesh(barGeometry, material);
        this.capsArray[i] =  new THREE.Mesh(capGeometry,capMaterial);
        this.barArray[i].position.set(i - this.numberOfElements/2, 0, 0);
        this.capsArray[i].position.set(i - this.numberOfElements/2,0,0 )

        //add the created bar to the scene
        this.scene.add(this.barArray[i]);
        this.scene.add(this.capsArray[i]);
    }
};

AudioVisualizer.prototype.setupAudioProc = function () {
    //get the audio context
    this.audioContext = new AudioContext();

    //create the javascript node
    this.javascriptNode = this.audioContext.createScriptProcessor(2048, 1, 1);
    this.javascriptNode.connect(this.audioContext.destination);

    //create the source buffer
    this.sourceBuffer = this.audioContext.createBufferSource();

    //create the analyser node
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.3;
    this.analyser.fftSize = 512;

    //connect source to analyser
    this.sourceBuffer.connect(this.analyser);

    //analyser to speakers
    this.analyser.connect(this.javascriptNode);

    //connect source to analyser
    this.sourceBuffer.connect(this.audioContext.destination);

    var that = this;

    //this is where we animates the barArray
    this.javascriptNode.onaudioprocess = function () {

        // get the average for the first channel
        var array = new Uint8Array(that.analyser.frequencyBinCount);
        that.analyser.getByteFrequencyData(array);

        //render the scene and update controls
        visualizeIt.renderer.render(visualizeIt.scene, visualizeIt.camera);
        visualizeIt.controls.update();

        var step = Math.round(array.length / visualizeIt.numberOfElements);

        //Iterate through the barArray and scale the z axis
        for (var i = 0; i < visualizeIt.numberOfElements; i++) {
            var value = array[i * step] / 4;
            value = value < 1 ? 1 : value;
            visualizeIt.barArray[i].scale.z = value;
            visualizeIt.capsArray[i].scale.y = value;
        }

    }

};

//get the default audio from the server
AudioVisualizer.prototype.getAudio = function () {
    var request = new XMLHttpRequest();
    request.open("GET", "../4th_symphony_de_mozart.mp3", true);
    request.responseType = "arraybuffer";
    request.send();
    var that = this;
    request.onload = function () {
        //that.start(request.response);
    }
};

//start the audio processing
AudioVisualizer.prototype.start = function (buffer) {
    this.audioContext.decodeAudioData(buffer, decodeAudioDataSuccess, decodeAudioDataFailed);
    var that = this;

    function decodeAudioDataSuccess(decodedBuffer) {
        that.sourceBuffer.buffer = decodedBuffer
        that.sourceBuffer.start(0);
    }

    function decodeAudioDataFailed() {
        debugger
    }
};

//util method to get random colors to make stuff interesting
AudioVisualizer.prototype.getRandomColor = function () {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

AudioVisualizer.prototype.dropHandler = function () {
    //drag Enter
    document.body.addEventListener("dragenter", function () {

    }, false);

    //drag over
    document.body.addEventListener("dragover", function (e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, false);

    //drag leave
    document.body.addEventListener("dragleave", function () {

    }, false);

    //drop
    document.body.addEventListener("drop", function (e) {
        e.stopPropagation();

        e.preventDefault();

        //get the file
        var file = e.dataTransfer.files[0];
        var fileName = file.name;

        $("#guide").text("Playing " + fileName);

        var fileReader = new FileReader();

        fileReader.onload = function (e) {
            var fileResult = e.target.result;
            visualizeIt.start(fileResult);
        };

        fileReader.onerror = function (e) {
          debugger
        };

        fileReader.readAsArrayBuffer(file);
    }, false);
}
