const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Sirve los archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Configura los eventos de conexión y mensajes
io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado');

    socket.on('message', (msg) => {
        io.emit('message', msg);
    });

    // Manejo de señalización de WebRTC
    socket.on('webrtc-offer', (offer) => {
        socket.broadcast.emit('webrtc-offer', offer);
    });

    socket.on('webrtc-answer', (answer) => {
        socket.broadcast.emit('webrtc-answer', answer);
    });

    socket.on('webrtc-candidate', (candidate) => {
        socket.broadcast.emit('webrtc-candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});


// Inicia el servidor
server.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
