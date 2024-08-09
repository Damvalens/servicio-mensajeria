const socket = io();
let localStream;
let peerConnections = {};  // Almacenar todas las conexiones WebRTC

const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302' // Servidor STUN público de Google
        }
    ]
};

// Inicializar la conexión cuando el usuario se une a la llamada
document.getElementById('joinCall').onclick = async function() {
    await startCommunication();
    socket.emit('join-call');
};

async function startCommunication() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;

        socket.on('all-clients', (clients) => {
            clients.forEach(clientId => {
                createPeerConnection(clientId);
                sendOffer(clientId);
            });
        });

        socket.on('webrtc-offer', async (offer, fromSocketId) => {
            if (!peerConnections[fromSocketId]) {
                createPeerConnection(fromSocketId);
            }
            await peerConnections[fromSocketId].setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnections[fromSocketId].createAnswer();
            await peerConnections[fromSocketId].setLocalDescription(answer);
            socket.emit('webrtc-answer', answer, fromSocketId);
        });

        socket.on('webrtc-answer', async (answer, fromSocketId) => {
            await peerConnections[fromSocketId].setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('webrtc-candidate', async (candidate, fromSocketId) => {
            try {
                await peerConnections[fromSocketId].addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('Error al añadir el ICE Candidate:', err);
            }
        });
    } catch (err) {
        console.error('Error al iniciar la comunicación:', err);
    }
}

function createPeerConnection(socketId) {
    const peerConnection = new RTCPeerConnection(servers);
    peerConnections[socketId] = peerConnection;

    peerConnection.addStream(localStream);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('webrtc-candidate', event.candidate, socketId);
        }
    };

    peerConnection.onaddstream = (event) => {
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = event.stream;
        remoteVideo.autoplay = true;
        document.body.appendChild(remoteVideo);
    };
}

async function sendOffer(socketId) {
    const offer = await peerConnections[socketId].createOffer();
    await peerConnections[socketId].setLocalDescription(offer);
    socket.emit('webrtc-offer', offer, socketId);
}
