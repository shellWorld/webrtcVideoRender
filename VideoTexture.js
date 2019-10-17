"use strict";

var VideoTexture = /** @class */ (function () {
    function VideoTexture(_arrayOfMediaStreams, elementClass) {
        if (elementClass === void 0) { elementClass = 'multi-streams-mixer'; }
        this.vertexCamera = [
            0.2, -1, 0.0,
            1, -1, 0.0,
            1, -0.4, 0.0,
            0.2, -0.4, 0.0
        ];

        this.vertex = [
            -1, -1, 0.0,
            1, -1, 0.0,
            1, 1, 0.0,
            -1, 1, 0.0
        ];


        this.vertexIndice = [
            0, 1, 2,
            0, 2, 3
        ];
        this.triangleTexCoords = [
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ];
        this.video = null;
        this.videoCamera = null;
        // requires: chrome://flags/#enable-experimental-web-platform-features
        this.arrayOfMediaStreams = _arrayOfMediaStreams;
        this.elementClass = elementClass;
        this.videos = new Array();
        // this.canvas = document.getElementById('canvas');
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute("width","640");
        this.canvas.setAttribute("height","480");
        // this.context = this.canvas.getContext('2d');
        // this.canvas.style = 'opacity:0;position:absolute;z-index:-1;top: -100000000;left:-1000000000; margin-top:-1000000000;margin-left:-1000000000;';
        this.canvas.className = this.elementClass;
        // (document.body || document.documentElement).appendChild(this.canvas);
        this.vertexBuffer = null;
        this.requestId = 0;
        this.texture = null;
        this.textureCamera = null;
        this.samplerUniform = null;
        this.vertexIndiceBuffer = null;
        this.glProgram = null;
        this.gl = null;
    }
    VideoTexture.prototype.getFragmentShaderSource = function () {
        var source = [
            "varying highp vec2 vTextureCoord;",
            "uniform sampler2D uSampler;",
            "void main(void) {",
            "    gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));",
            "}"
        ].join("\n");
        return source;
    };
    VideoTexture.prototype.getVertexShaderSource = function () {
        var source = [
            "attribute vec3 aPos;",
            "attribute vec2 aVertexTextureCoord;",
            "varying highp vec2 vTextureCoord;",
            "void main(void){",
            "    gl_Position = vec4(aPos, 1);",
            "    vTextureCoord = aVertexTextureCoord;",
            "}"
        ].join("\n");
        return source;
    };
    VideoTexture.prototype.getTextureVideo = function () {
        // var video = document.querySelector('video');
        var video = document.createElement('video');
        video.controls = false;
        video.autoplay = true;
        video.style.width = '800px;';
        video.style.height = '600px';
        return video;
    };
    VideoTexture.prototype.setupContext = function () {
        try {
            this.gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");
        }
        catch (e) {
        }
        if (this.gl) {
            this.gl.clearColor(0 / 255, 0 / 255, 0 / 255, 1.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        }
    };
    VideoTexture.prototype.initShaders = function () {
        //get shader source
        var vs_source = this.getVertexShaderSource();
        var fs_source = this.getFragmentShaderSource();
        // compile shaders
        var vertexShader = this.makeShader(vs_source, this.gl.VERTEX_SHADER);
        var fragmentShader = this.makeShader(fs_source, this.gl.FRAGMENT_SHADER);
        // create program
        this.glProgram = this.gl.createProgram();
        // attach and link shaders to the program
        this.gl.attachShader(this.glProgram, vertexShader);
        this.gl.attachShader(this.glProgram, fragmentShader);
        this.gl.linkProgram(this.glProgram);
        if (!this.gl.getProgramParameter(this.glProgram, this.gl.LINK_STATUS)) {
            alert("Unable to initialize the shader program.");
        }
        // use program
        this.gl.useProgram(this.glProgram);
    };
    VideoTexture.prototype.makeShader = function (src, type) {
        //compile the vertex shader
        var shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert("Error compiling shader: " + this.gl.getShaderInfoLog(shader));
        }
        return shader;
    };
    VideoTexture.prototype.drawScreen = function () {
        var me = this;
        if (typeof (this) !== "undefined") {
            window.myVideoScreen = this;
        }
        else {
            me = window.myVideoScreen;
        }
        me.requestId = requestAnimationFrame(me.drawScreen);
        // setTimeout(me.draw, 40)
        // vertex data
        me.vertexBuffer = me.gl.createBuffer();
        me.gl.bindBuffer(me.gl.ARRAY_BUFFER, me.vertexBuffer);
        me.gl.bufferData(me.gl.ARRAY_BUFFER, new Float32Array(me.vertex), me.gl.STATIC_DRAW);
        // indice data
        me.vertexIndiceBuffer = me.gl.createBuffer();
        me.gl.bindBuffer(me.gl.ELEMENT_ARRAY_BUFFER, me.vertexIndiceBuffer);
        me.gl.bufferData(me.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(me.vertexIndice), me.gl.STATIC_DRAW);
        // set position attribute
        var aVertexPosition = me.gl.getAttribLocation(me.glProgram, 'aPos');
        me.gl.vertexAttribPointer(aVertexPosition, 3, me.gl.FLOAT, false, 0, 0);
        me.gl.enableVertexAttribArray(aVertexPosition);
        // texture coordinate data
        var trianglesTexCoordBuffer = me.gl.createBuffer();
        me.gl.bindBuffer(me.gl.ARRAY_BUFFER, trianglesTexCoordBuffer);
        me.gl.bufferData(me.gl.ARRAY_BUFFER, new Float32Array(me.triangleTexCoords), me.gl.STATIC_DRAW);
        // set texture coordinate attribute
        var vertexTexCoordAttribute = me.gl.getAttribLocation(me.glProgram, "aVertexTextureCoord");
        me.gl.enableVertexAttribArray(vertexTexCoordAttribute);
        me.gl.vertexAttribPointer(vertexTexCoordAttribute, 2, me.gl.FLOAT, false, 0, 0);
        // bind texture and set the sampler
        me.gl.activeTexture(me.gl.TEXTURE0);
        me.gl.bindTexture(me.gl.TEXTURE_2D, me.texture);
        me.gl.texImage2D(me.gl.TEXTURE_2D, 0, me.gl.RGB, me.gl.RGB, me.gl.UNSIGNED_BYTE, me.video);
        me.gl.uniform1i(me.samplerUniform, 0);

        me.gl.clearColor(0 / 255, 0 / 255, 0 / 255, 1.0);
        me.gl.clear(me.gl.COLOR_BUFFER_BIT);
        me.gl.drawElements(me.gl.TRIANGLES, 6, me.gl.UNSIGNED_SHORT, 0);

    };


    VideoTexture.prototype.drawCamera = function () {
        var me = this;
        if (typeof (this) !== "undefined") {
            window.myVideoCamera = this;
        }
        else {
            me = window.myVideoCamera;
        }
        me.requestId = requestAnimationFrame(me.drawCamera);
        // setTimeout(me.draw, 40)
        // vertex data
        me.vertexBuffer = me.gl.createBuffer();
        me.gl.bindBuffer(me.gl.ARRAY_BUFFER, me.vertexBuffer);
        me.gl.bufferData(me.gl.ARRAY_BUFFER, new Float32Array(me.vertexCamera), me.gl.STATIC_DRAW);
        // indice data
        me.vertexIndiceBuffer = me.gl.createBuffer();
        me.gl.bindBuffer(me.gl.ELEMENT_ARRAY_BUFFER, me.vertexIndiceBuffer);
        me.gl.bufferData(me.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(me.vertexIndice), me.gl.STATIC_DRAW);
        // set position attribute
        var aVertexPosition = me.gl.getAttribLocation(me.glProgram, 'aPos');
        me.gl.vertexAttribPointer(aVertexPosition, 3, me.gl.FLOAT, false, 0, 0);
        me.gl.enableVertexAttribArray(aVertexPosition);
        // texture coordinate data
        var trianglesTexCoordBuffer = me.gl.createBuffer();
        me.gl.bindBuffer(me.gl.ARRAY_BUFFER, trianglesTexCoordBuffer);
        me.gl.bufferData(me.gl.ARRAY_BUFFER, new Float32Array(me.triangleTexCoords), me.gl.STATIC_DRAW);
        // set texture coordinate attribute
        var vertexTexCoordAttribute = me.gl.getAttribLocation(me.glProgram, "aVertexTextureCoord");
        me.gl.enableVertexAttribArray(vertexTexCoordAttribute);
        me.gl.vertexAttribPointer(vertexTexCoordAttribute, 2, me.gl.FLOAT, false, 0, 0);
        // bind texture and set the sampler
        me.gl.activeTexture(me.gl.TEXTURE1);
        me.gl.bindTexture(me.gl.TEXTURE_2D, me.textureCamera);
        me.gl.texImage2D(me.gl.TEXTURE_2D, 0, me.gl.RGB, me.gl.RGB, me.gl.UNSIGNED_BYTE, me.videoCamera);
        me.gl.uniform1i(me.samplerUniform, 1);
        // me.gl.clearColor(0 / 255, 0 / 255, 0 / 255, 0.0);
        // me.gl.clear(me.gl.COLOR_BUFFER_BIT);
        me.gl.drawElements(me.gl.TRIANGLES, 6, me.gl.UNSIGNED_SHORT, 0);
    };

    VideoTexture.prototype.createTexture = function (source) {
        var texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, source);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        return texture;
    };

    VideoTexture.prototype.getMixedVideoStream = function () {
        var capturedStream;

        if ('captureStream' in this.canvas) {
            capturedStream = this.canvas.captureStream();
        } else if ('mozCaptureStream' in this.canvas) {
            capturedStream = this.canvas.mozCaptureStream();
        } else if (!self.disableLogs) {
            console.error('Upgrade to latest Chrome or otherwise enable this flag: chrome://flags/#enable-experimental-web-platform-features');
        }

        var videoStream = new MediaStream();

        capturedStream.getTracks().filter(function(t) {
            return t.kind === 'video';
        }).forEach(function(track) {
            videoStream.addTrack(track);
        });

        this.canvas.stream = videoStream;

        return videoStream;
    };

    VideoTexture.prototype.createTexture = function (source) {
        var texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, source);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        return texture;
    };

    VideoTexture.prototype.loadTexture = function () {
        var me = this;
        this.video = this.getTextureVideo();
        this.video.oncanplay = function () {
            me.texture = me.createTexture(me.video);
            me.drawScreen();
        };
        me.video.onended = function () {
            this.cancelAnimationRequest(me.requestId);
        };
        me.video.srcObject = me.arrayOfMediaStreams[0];


        this.videoCamera = this.getTextureVideo();
        this.videoCamera.oncanplay = function () {
            me.textureCamera = me.createTexture(me.videoCamera);
            me.drawCamera();
        };
        me.videoCamera.onended = function () {
            this.cancelAnimationRequest(me.requestId);
        };
        me.videoCamera.srcObject = me.arrayOfMediaStreams[1];

        // video.src = '../videos/cajon-solo.mp4';
    };
    VideoTexture.prototype.render = function () {
        this.setupContext();
        this.initShaders();
        this.samplerUniform = this.gl.getUniformLocation(this.glProgram, 'uSampler');
        this.loadTexture();
    };
    return VideoTexture;
}());

