var express = require('express');
var app     = express();
var http    = require('http').Server(app);
var io      = require('socket.io')(http);
var _       = require('lodash');

app.use("/app", express.static(__dirname + '/app'));

app.get('/', function (req, res){
  res.sendfile('app/index.html');;
});

var players = [];

/* ============== FUNÇÕES SOCKET ================ */
io.on('connection', function (socket){
  var player = generatePlayer();
  players.push(player);

  socket.emit('saveMyPlayerId', player.id);
  io.emit('updatePlayers', players);

  socket.on('updatePlayer', function (player){
    if (!player) return;
    var index = _.findIndex(players, function (o) { return o.id == player.id; });
    players[index] = player;
  });
  
  socket.on('updatePlayerPosition', function (newPositions){
    var index = _.findIndex(players, function (o) { return o.id == player.id; });
    var item = players[index];
    
    item.goToX = newPositions.goToX;
    item.goToY = newPositions.goToY;
    item.x = newPositions.x;
    item.y = newPositions.y;
    
    players[index] = item;
    io.emit('updatePlayerPosition', item);
  });
  
  socket.on('updatePosition', function (newPositions){
    var index = _.findIndex(players, function (o) { return o.id == player.id; });
    var item = players[index];
    
    item.x = newPositions.x;
    item.y = newPositions.y;
    
    players[index] = item;
    io.emit('updatePlayers', players);
  });

  socket.on('newShoot', function (ball){
    io.emit('createShoot', ball);
  });
  
  socket.on('killPlayer', function (deadPlayerId, killerPlayerId){
    var deadPlayerIndex = _.findIndex(players, function (o) { return o.id == deadPlayerId; });
    var deadPlayer = players[deadPlayerIndex];
    
    var killerPlayerIndex = _.findIndex(players, function (o) { return o.id == killerPlayerId; });
    var killerPlayer = players[killerPlayerIndex];
    
    if (!deadPlayer || !killerPlayer) return;
    
    deadPlayer.x = 0;
    deadPlayer.y = 0;
    deadPlayer.goToX = 0;
    deadPlayer.goToY = 0;
    deadPlayer.deaths += 1;
    players[deadPlayerIndex] = deadPlayer;
    
    killerPlayer.kills += 1;
    players[killerPlayerIndex] = killerPlayer;
    
    io.emit('updatePlayer', deadPlayer);
    io.emit('updatePlayer', killerPlayer);
  });

  socket.on('disconnect', function (aa){
    _.remove(players, function (index) {
      return player.id === index.id;
    });
    io.emit('updatePlayers', players);
  });
});
/* ============== FUNÇÕES SOCKET ================ */

/* ============== FUNÇÕES UTILITÁRIAS ================ */

function generatePlayer() {
  var player = {
    id     : generateId(),
    x      : getRandomInt(0, 150),
    y      : getRandomInt(0, 150),
    color  : generateColor(),
    width  : 50,
    height : 50,
    kills  : 0,
    deaths : 0
  };
  player.goToX = player.x;
  player.goToY = player.y;
  return player;
}

function generateId() {
  var id = '';
  for (var i = 0; i < 5; i++) {
    id += getRandomInt(0, 9);
  }
  return id;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateColor () {
  var chars = "123456789ABCDE",
    color = '#';
  for (var x = 0; x < 6; x++) {
    var i = Math.floor(Math.random() * 14);
    color += chars.charAt(i);
  }
  return color;
}

function removeIds (players, player) {
  return _.map(players, function(obj) {
    delete obj.id;
    return obj;
  });
}

/* ============== FUNÇÕES UTILITÁRIAS ================ */


http.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = http.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
