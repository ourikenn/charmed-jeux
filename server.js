const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Dossier public pour les fichiers statiques
app.use(express.static(path.join(__dirname, './')));
app.use(cors());

// Stockage des parties et des joueurs
const games = {};
const players = {};

// Quand un client se connecte
io.on('connection', (socket) => {
  console.log('Nouveau joueur connecté:', socket.id);
  
  // Créer une nouvelle partie
  socket.on('createGame', (playerName) => {
    const gameId = generateGameId();
    const playerId = socket.id;
    
    // Créer l'objet game
    games[gameId] = {
      id: gameId,
      players: [{id: playerId, name: playerName, character: null}],
      status: 'waiting', // waiting, started, ended
      currentPlayerIndex: 0,
      gameState: {} // État du jeu
    };
    
    // Enregistrer l'ID de la partie pour ce joueur
    players[playerId] = gameId;
    
    // Rejoindre la room de la partie
    socket.join(gameId);
    
    // Confirmer la création de la partie
    socket.emit('gameCreated', {gameId, playerId, game: games[gameId]});
    console.log(`Partie ${gameId} créée par ${playerName}`);
  });
  
  // Rejoindre une partie existante
  socket.on('joinGame', ({gameId, playerName}) => {
    const playerId = socket.id;
    
    // Vérifier si la partie existe
    if (!games[gameId]) {
      socket.emit('error', {message: 'Partie non trouvée'});
      return;
    }
    
    // Vérifier si la partie est pleine (max 4 joueurs)
    if (games[gameId].players.length >= 4) {
      socket.emit('error', {message: 'Partie pleine'});
      return;
    }
    
    // Ajouter le joueur à la partie
    games[gameId].players.push({id: playerId, name: playerName, character: null});
    players[playerId] = gameId;
    
    // Rejoindre la room de la partie
    socket.join(gameId);
    
    // Informer tous les joueurs du nouveau joueur
    io.to(gameId).emit('playerJoined', {
      player: {id: playerId, name: playerName},
      game: games[gameId]
    });
    
    console.log(`${playerName} a rejoint la partie ${gameId}`);
  });
  
  // Choisir un personnage
  socket.on('selectCharacter', (character) => {
    const playerId = socket.id;
    const gameId = players[playerId];
    
    if (!gameId || !games[gameId]) return;
    
    // Vérifier si le personnage n'est pas déjà pris par un autre joueur
    const isCharacterTaken = games[gameId].players.some(
      player => player.id !== playerId && player.character === character
    );
    
    if (isCharacterTaken) {
      socket.emit('error', {message: 'Ce personnage est déjà pris par un autre joueur'});
      return;
    }
    
    // Trouver le joueur dans la partie
    const playerIndex = games[gameId].players.findIndex(player => player.id === playerId);
    if (playerIndex !== -1) {
      games[gameId].players[playerIndex].character = character;
      
      // Informer tous les joueurs de la sélection
      io.to(gameId).emit('characterSelected', {
        playerId,
        character,
        game: games[gameId]
      });
    }
  });
  
  // Commencer la partie
  socket.on('startGame', () => {
    const playerId = socket.id;
    const gameId = players[playerId];
    
    if (!gameId || !games[gameId]) return;
    
    // Vérifier si tous les joueurs ont choisi un personnage
    const allSelected = games[gameId].players.every(player => player.character);
    
    if (!allSelected) {
      socket.emit('error', {message: 'Tous les joueurs doivent choisir un personnage'});
      return;
    }
    
    // Démarrer la partie
    games[gameId].status = 'started';
    games[gameId].gameState = initGameState(games[gameId].players);
    
    // Informer tous les joueurs du démarrage
    io.to(gameId).emit('gameStarted', {
      game: games[gameId]
    });
    
    console.log(`Partie ${gameId} démarrée`);
  });
  
  // Actions du jeu
  socket.on('gameAction', (action) => {
    const playerId = socket.id;
    const gameId = players[playerId];
    
    if (!gameId || !games[gameId]) return;
    
    // Vérifier si c'est le tour du joueur
    const currentPlayer = games[gameId].players[games[gameId].currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      socket.emit('error', {message: 'Ce n\'est pas votre tour'});
      return;
    }
    
    // Traiter l'action selon son type
    processGameAction(gameId, playerId, action);
    
    // Envoyer le nouvel état du jeu à tous les joueurs
    io.to(gameId).emit('gameStateUpdated', {
      game: games[gameId],
      lastAction: action
    });
  });
  
  // Fin du tour
  socket.on('endTurn', () => {
    const playerId = socket.id;
    const gameId = players[playerId];
    
    if (!gameId || !games[gameId]) return;
    
    // Passer au joueur suivant
    games[gameId].currentPlayerIndex = (games[gameId].currentPlayerIndex + 1) % games[gameId].players.length;
    
    // Informer tous les joueurs du changement de tour
    io.to(gameId).emit('turnChanged', {
      currentPlayerIndex: games[gameId].currentPlayerIndex,
      currentPlayerId: games[gameId].players[games[gameId].currentPlayerIndex].id
    });
  });
  
  // Chat
  socket.on('sendMessage', (message) => {
    const playerId = socket.id;
    const gameId = players[playerId];
    
    if (!gameId || !games[gameId]) return;
    
    // Trouver le joueur dans la partie
    const player = games[gameId].players.find(p => p.id === playerId);
    
    // Envoyer le message à tous les joueurs de la partie
    io.to(gameId).emit('newMessage', {
      sender: player.name,
      message,
      timestamp: new Date().toISOString()
    });
  });
  
  // Déconnexion
  socket.on('disconnect', () => {
    const playerId = socket.id;
    const gameId = players[playerId];
    
    console.log('Joueur déconnecté:', playerId);
    
    if (gameId && games[gameId]) {
      // Retirer le joueur de la partie
      games[gameId].players = games[gameId].players.filter(p => p.id !== playerId);
      
      // Si la partie est vide, la supprimer
      if (games[gameId].players.length === 0) {
        delete games[gameId];
        console.log(`Partie ${gameId} supprimée (plus de joueurs)`);
      } else {
        // Informer les autres joueurs
        io.to(gameId).emit('playerLeft', {
          playerId,
          game: games[gameId]
        });
        
        // Si la partie était en cours, ajuster l'index du joueur courant
        if (games[gameId].status === 'started') {
          if (games[gameId].currentPlayerIndex >= games[gameId].players.length) {
            games[gameId].currentPlayerIndex = 0;
          }
        }
      }
    }
    
    // Supprimer les références au joueur
    delete players[playerId];
  });
});

// Générer un ID de partie aléatoire
function generateGameId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Initialiser l'état du jeu
function initGameState(players) {
  return {
    board: createBoard(),
    playerStates: players.map(player => ({
      id: player.id,
      character: player.character,
      position: 0,
      health: 100,
      mana: 50,
      inventory: []
    }))
  };
}

// Créer le plateau de jeu
function createBoard() {
  // Simplifié pour l'exemple - à adapter selon votre jeu
  const board = [];
  for (let i = 0; i < 64; i++) {
    let cellType = 'normal';
    
    // Ajouter des cases spéciales aléatoirement
    if (i % 7 === 0) cellType = 'special';
    else if (i % 13 === 0) cellType = 'demon';
    else if (i % 11 === 0) cellType = 'trap';
    else if (i % 9 === 0) cellType = 'item';
    
    board.push({
      index: i,
      type: cellType
    });
  }
  return board;
}

// Traiter une action de jeu
function processGameAction(gameId, playerId, action) {
  switch(action.type) {
    case 'rollDice':
      // Simuler un lancer de dé
      const diceValue = Math.floor(Math.random() * 6) + 1;
      
      // Trouver l'état du joueur
      const playerState = games[gameId].gameState.playerStates.find(p => p.id === playerId);
      
      // Mettre à jour la position
      const newPosition = Math.min(playerState.position + diceValue, 63);
      playerState.position = newPosition;
      
      // Vérifier la case d'arrivée
      const cell = games[gameId].gameState.board[newPosition];
      handleCellEffect(gameId, playerId, cell);
      
      break;
      
    case 'useSpell':
      // Logique pour utiliser un sort
      // À adapter selon vos mécaniques de jeu
      break;
      
    case 'useItem':
      // Logique pour utiliser un objet
      // À adapter selon vos mécaniques de jeu
      break;
  }
}

// Gérer l'effet d'une case
function handleCellEffect(gameId, playerId, cell) {
  const playerState = games[gameId].gameState.playerStates.find(p => p.id === playerId);
  
  switch(cell.type) {
    case 'special':
      // Bonus aléatoire
      playerState.mana += 10;
      break;
      
    case 'demon':
      // Combat contre un démon
      playerState.health -= 15;
      break;
      
    case 'trap':
      // Piège
      playerState.health -= 10;
      break;
      
    case 'item':
      // Objet à ramasser
      playerState.inventory.push({
        id: Date.now(),
        name: 'Potion',
        type: 'healing',
        power: 15
      });
      break;
  }
}

// Port d'écoute
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
}); 