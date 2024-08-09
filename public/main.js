const socket = io();
let localStream;
let peerConnection;
const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302' // Servidor STUN público de Google
        }
    ]
};

// Enviar mensaje al servidor
document.getElementById('send').onclick = function() {
    const message = document.getElementById('message').value;
    socket.emit('message', message);
    document.getElementById('message').value = '';
};

// Escuchar mensajes del servidor
socket.on('message', function(msg) {
    const messageList = document.getElementById('messages');
    const newMessage = document.createElement('li');
    newMessage.textContent = msg;
    messageList.appendChild(newMessage);
});

document.getElementById('startCall').onclick = async function() {
    await startCommunication({ video: true, audio: true });
};

document.getElementById('startVoiceCall').onclick = async function() {
    await startCommunication({ video: false, audio: true });
};

document.getElementById('stopCall').onclick = function() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        console.log('Captura de audio/video detenida');
    }
    if (peerConnection) {
        peerConnection.close();
        console.log('Conexión WebRTC cerrada');
    }
};

async function startCommunication(mediaConstraints) {
    try {
        localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        if (mediaConstraints.video) {
            document.getElementById('localVideo').srcObject = localStream;
        }

        peerConnection = new RTCPeerConnection(servers);
        peerConnection.addStream(localStream);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc-candidate', event.candidate);
            }
        };

        peerConnection.onaddstream = (event) => {
            const remoteAudio = document.createElement(mediaConstraints.video ? 'video' : 'audio');
            remoteAudio.srcObject = event.stream;
            remoteAudio.autoplay = true;
            if (!mediaConstraints.video) remoteAudio.controls = true; // Para control de audio si es solo voz
            document.body.appendChild(remoteAudio);
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('webrtc-offer', offer);
    } catch (err) {
        console.error('Error al iniciar la llamada:', err);
    }
}
let isMuted = false;

document.getElementById('muteMic').onclick = function() {
    if (localStream) {
        localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
        isMuted = !isMuted;
        document.getElementById('muteMic').textContent = isMuted ? 'Desmutear Micrófono' : 'Mutear Micrófono';
    }
};
document.getElementById('volumeControl').oninput = function(event) {
    const volume = event.target.value / 100;
    const mediaElements = document.querySelectorAll('audio, video');
    mediaElements.forEach(element => {
        element.volume = volume;
    });
};
let callStartTime;
let callDurationInterval;

function startCallDurationCounter() {
    callStartTime = Date.now();
    callDurationInterval = setInterval(() => {
        const elapsedTime = Date.now() - callStartTime;
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        document.getElementById('callDuration').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function stopCallDurationCounter() {
    clearInterval(callDurationInterval);
    document.getElementById('callDuration').textContent = '00:00';
}

document.getElementById('startCall').onclick = async function() {
    await startCommunication({ video: true, audio: true });
    startCallDurationCounter();
};

document.getElementById('startVoiceCall').onclick = async function() {
    await startCommunication({ video: false, audio: true });
    startCallDurationCounter();
};

document.getElementById('stopCall').onclick = function() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        console.log('Captura de audio/video detenida');
    }
    if (peerConnection) {
        peerConnection.close();
        console.log('Conexión WebRTC cerrada');
    }
    stopCallDurationCounter();
};


// Manejo de WebRTC Offer
socket.on('webrtc-offer', async function(offer) {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(servers);
        peerConnection.addStream(localStream);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc-candidate', event.candidate);
            }
        };

        peerConnection.onaddstream = (event) => {
            const remoteAudio = document.createElement(peerConnection.getRemoteStreams()[0].getVideoTracks().length ? 'video' : 'audio');
            remoteAudio.srcObject = event.stream;
            remoteAudio.autoplay = true;
            if (!peerConnection.getRemoteStreams()[0].getVideoTracks().length) remoteAudio.controls = true;
            document.body.appendChild(remoteAudio);
        };
    }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('webrtc-answer', answer);
});

// Manejo de WebRTC Answer
socket.on('webrtc-answer', async function(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Manejo de WebRTC ICE Candidate
socket.on('webrtc-candidate', async function(candidate) {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
        console.error('Error al añadir el ICE Candidate:', err);
    }
});

