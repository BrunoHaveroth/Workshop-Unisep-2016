/*global _ io $*/

window.onload = function() {
  // Inicia o jogo
  start();

  /* ===================== VARIAVEIS GLOBAIS ======================== */
  var heightScreen,
    widthScreen,
    ctx,
    canvas,
    myId,
    backgroundColor = '#000',
    socket = io();
  /* ===================== VARIAVEIS GLOBAIS ======================== */

  /* ===================== ENGINE ======================== */
  function start () {
    // Armazena a largura e a altura da tela
    heightScreen = window.innerHeight -5;
    widthScreen  = window.innerWidth -5;

    // Cria uma elemento canvas e adiciona a altura e largura da tela (full screen)
    canvas = document.getElementById("canvas");
    canvas.width  = widthScreen;
    canvas.height = heightScreen;

    /* Armazena o contexto do canvas em uma variavel, sempre que
    for adicionar alterar ou remover itens do cenário, esta variavel será manipulada.*/
    ctx = canvas.getContext("2d");

    run();
  }

  // Função que será executada infinitamente chamando o metodo update e draw
  function run () {
    update();
    draw();

    // Faz com que a função "run" chame ela mesma fazendo um loop infinito
    window.requestAnimationFrame(run);
  }

  // Função responsável por atualizar todos os componentes do jogo

  function update () {
    if (Player) { Player.update(); }
    if (Ball) { Ball.update(); }
  }

  // Função responsável por desenhar todos os componentes do jogo
  function draw () {
    // Limpa o cenário
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, widthScreen, heightScreen);
    
    if (Base) { Base.draw(); }
    if (Player) { Player.draw(); }
    if (Ball) { Ball.draw(); }
  }
  /* ======================== ENGINE ========================== */

  /* ===================== COMPONENTES ======================== */
  var Base = {
    content: {
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      color: '#eee'
    },

    draw: function() {
      ctx.fillStyle = this.content.color;
      ctx.fillRect(this.content.x, this.content.y, this.content.width, this.content.height);
      ctx.fillStyle = '#000';
      ctx.font = "20px Georgia";
      ctx.fillText("BASE", 70, 100);
    }
  };
  
  var Player = {
    content: [],

    myPlayer: function() {
      return _.find(this.content, { id: myId });
    },

    shoot: function (goToX, goToY) {
      var myPlayer = Player.myPlayer();
      var ball = {
        ownerId : myPlayer.id,
        x       : myPlayer.x + 25,
        y       : myPlayer.y + 25,
        color   : '#e83313',
        goToX   : goToX,
        goToY   : goToY,
        width   : 5,
        height  : 5
      };
      emitNewShoot(ball);
    },

    update: function () {
      this.content.forEach(function(item) {
        // Atualiza a posição do Player, a cada volta da função run
        if (item.x != item.goToX) { item.x = item.goToX > item.x ? (item.x +2) : (item.x -2); }
        if (item.y != item.goToY) { item.y = item.goToY > item.y ? (item.y +2) : (item.y -2); }
      });
      
      var myPlayer = Player.myPlayer();
      emitUpdatePlayer(myPlayer);
    },

    draw: function () {
      this.content.forEach(function(item) {
        // Desenha o Player no cenário (canvas)
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x, item.y, item.width, item.height);
      });
    }
  };

  var Ball = {
    content: [],

    update: function () {
      var that = this;
      
      this.content.forEach(function(item) {
        // Atualiza a posição do Projetil, a cada volta da função run
        if (item.x != item.goToX) { item.x = item.goToX > item.x ? (item.x +5) : (item.x -5); }
        if (item.y != item.goToY) { item.y = item.goToY > item.y ? (item.y +5) : (item.y -5); }
        
        
        // Verifica se o myPlayer entrou em contato com algum projetil inimigo
        var myPlayer = Player.myPlayer();
        if (myPlayer.id != item.ownerId)  {
          if (((item.x + item.width) > myPlayer.x &&
            item.x < (myPlayer.x + myPlayer.width) &&
            ((item.y + item.height) > myPlayer.y &&
            item.y < (myPlayer.y + myPlayer.height)))
          ) {
            // Caso ele tenha levado algum tiro, a bala e removida do cenário e envia a informação para o servidor
            emitKillPlayer(myPlayer.id, item.ownerId);
            _.remove(that.content, item);
          }
        }
        
        // Caso um projetil passe pela Base, ele é destruido, isso para impedir que alguem morra qunado estiver na mesma.
        if (item.x < 200 && item.y < 200) {
          _.remove(that.content, item);
        }
      });
    },

    draw: function () {
      this.content.forEach(function(item) {
        // Desenha o Projetil no cenário (canvas)
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x, item.y, item.width, item.height);
      });
    }
  };
  /* ===================== COMPONENTES ======================== */

  /* ===================== CONTROLES ======================== */
  
  // Este eventoé é acionado quando o clique do mouse for acionado. 
  document.addEventListener("mousedown", function onClick(event) {
    var myPlayer = Player.myPlayer();

    switch(event.which){
      case 1 :
        // Botao esquerdo altera a posicao do player para o ponto clicado.
        emitChangePositionPlayer(event.offsetX -25, event.offsetY -25);
        break;
      case 3 :
        // Botao direito dispara um projetil saindo do canto mais proximo do player 
        var goToX = event.offsetX > myPlayer.x ? 10000 : -10000;
        var goToY = event.offsetY > myPlayer.y ? 10000 : -10000;
        Player.shoot(goToX, goToY);
    }

    document.oncontextmenu = function () { return false; };
  });
  /* ===================== CONTROLES ======================== */


  /* ===================== FUNÇÕES SOCKET EMIT ======================== */
  function emitChangePositionPlayer (goToX, goToY) {
    // Envia para o servidor a nova posicao que o player deve ir
    var newPositions = { goToX: goToX, goToY: goToY};
    socket.emit('updatePlayerPosition', newPositions);
  }
  
  function emitUpdatePlayer (player) {
    // Atualiza o player armazenado no servidor com o player do lado do cliente
    if (!player) return;
    socket.emit('updatePlayer', player);
  }

  function emitNewShoot (ball) {
    // Envia um novo shoot para o servidor para ser replicado entre os outros jogagores pelo servidor
    socket.emit('newShoot', ball);
  }
  
  function emitKillPlayer (deadPlayerId, killerPlayerId) {
    /* Envia para o servidor a informacao de que um player foi morto, 
    o servidor vai replicar a informacao para os outros jogadores*/
    socket.emit('killPlayer', deadPlayerId, killerPlayerId);
  }
  /* ===================== FUNÇÕES SOCKET EMIT ======================== */

  /* ===================== EVENTOS SOCKET ======================== */
  socket.on('saveMyPlayerId', function(playerId){
    // Atualiza o id do Player
    myId = playerId;
  });

  socket.on('updatePlayers', function(players) {
    // Recebe um array com todos os player do servidor e atualiza o array local de players
    Player.content = players;
    
    // Chama a funcao responsavel por atualizar o frag dos jogadores
    updateFrag(players);
  });
  
  socket.on('updatePlayer', function(player) {
    // Recebe um player especifico e atualiza ele dentro do array de local de players
    var index = _.findIndex(Player.content, function (o) { return o.id == player.id; });
    Player.content[index] = player;
    updateFrag(Player.content);
  });
  
  socket.on('updatePlayerPosition', function(obj) {
    var player = _.find(Player.content, { id: obj.id });
    player.goToX = obj.goToX;
    player.goToY = obj.goToY;
  });

  socket.on('createShoot', function(ball) {
    // Recebe a ball, e insere dentro de Ball.content para ser renderizado no cenário
    Ball.content.push(ball);
  });
  /* ===================== EVENTOS SOCKET ======================== */
  
  function updateFrag (players) {
    if (!players) return;
    
    $('.info-bar ul').html('');
    
    players = _.sortBy(players, 'kills').reverse();
    
    players.forEach(function(player) {
      $('.info-bar ul').append('<li><div class="player-color" style="background: ' + player.color + '"></div> <p>' + player.kills + ' / ' + player.deaths + '</p></li>');
    });
  }
};
