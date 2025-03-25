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
  
  // Récupérer l'état du jeu
  socket.on('getGameState', (gameId, callback) => {
    const game = games[gameId];
    
    if (!game) {
      if (callback) callback({ success: false, message: 'Partie non trouvée' });
      return;
    }
    
    if (callback) callback({ success: true, game });
  });
  
  // Récupérer les logs du jeu
  socket.on('getGameLogs', (gameId, callback) => {
    const game = games[gameId];
    
    if (!game) {
      if (callback) callback({ success: false, message: 'Partie non trouvée' });
      return;
    }
    
    if (callback) callback({ success: true, logs: game.logs || [] });
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
      name: player.name,
      color: player.character.toLowerCase(), // Pour la compatibilité avec le code local
      health: 100,
      mana: 50,
      position: 0,
      inventory: [],
      image: getCharacterImage(player.character),
      power: getCharacterPower(player.character),
      playerNumber: players.indexOf(player) + 1 // Assigner un numéro de joueur comme en local
    })),
    items: [
      { 
        id: 1, 
        name: "Livre des Ombres", 
        type: "spell", 
        power: 20, 
        description: "Le livre ancestral des sœurs Halliwell",
        icon: "https://i.imgur.com/Jb0ckJn.jpg"
      },
      { 
        id: 2, 
        name: "Potion d'Énergie", 
        type: "potion", 
        power: 15, 
        description: "Restaure l'énergie magique",
        icon: "https://i.imgur.com/eYdYKgb.jpg"
      },
      { 
        id: 3,
        name: "Potion de Guérison",
        type: "potion",
        power: 25,
        description: "Soigne les blessures",
        icon: "https://i.imgur.com/HWzRSFR.jpg"
      },
      { 
        id: 4, 
        name: "Athame", 
        type: "weapon", 
        power: 15, 
        description: "Poignard rituel pour combattre les démons",
        icon: "https://i.imgur.com/AKUk4iQ.jpg"
      },
      { 
        id: 5, 
        name: "Cristal de Protection", 
        type: "defense", 
        power: 10, 
        description: "Crée un bouclier protecteur",
        icon: "https://i.imgur.com/6NlaNHK.jpg"
      }
    ],
    demons: [
      {
        id: 1,
        name: "Balthazar",
        power: 30,
        health: 80,
        description: "Un puissant démon de niveau supérieur",
        image: "https://i.imgur.com/S5CnW1V.jpg"
      },
      {
        id: 2,
        name: "Shax",
        power: 25,
        health: 60,
        description: "L'assassin personnel de la Source",
        image: "https://i.imgur.com/JCBCsQJ.jpg"
      },
      {
        id: 3,
        name: "Barbas",
        power: 20,
        health: 50,
        description: "Le démon de la peur",
        image: "https://i.imgur.com/rlVnWnI.jpg"
      }
    ],
    currentPlayerIndex: 0,
    diceValue: 0,
    gameStarted: true,
    gameOver: false
  };
}

// Obtenir l'image du personnage
function getCharacterImage(characterName) {
  const images = {
    "Piper": "https://th.bing.com/th/id/R.e418e2e82e7d024893b72962bfa1fb03?rik=0qM8%2fp3Dzkr63A&riu=http%3a%2f%2fimages5.fanpop.com%2fimage%2fphotos%2f25500000%2fPiper-Halliwell-charmed-25593462-1912-2560.jpg&ehk=rxkknJzYQe06CdLUufNRS94f9bGVAWedZ7yJeX3j2Us%3d&risl=&pid=ImgRaw&r=0",
    "Phoebe": "https://usercontent2.hubstatic.com/14340833_f520.jpg",
    "Prue": "https://th.bing.com/th/id/R.9898bd81a60bd0fb240e5c8a3ed8ec85?rik=QHMl3HpnNXX5Kg&riu=http%3a%2f%2fimages5.fanpop.com%2fimage%2fphotos%2f25500000%2fPrue-Halliwell-charmed-25593840-2141-2560.jpg&ehk=5FdgnbZowUevZ4QwBVZXNyZF7eSUZwcZb1MbS9MvcOg%3d&risl=&pid=ImgRaw&r=0",
    "Paige": "https://images.saymedia-content.com/.image/ar_3:2%2Cc_limit%2Ccs_srgb%2Cfl_progressive%2Cq_auto:eco%2Cw_1400/MTc1MTE0NzE2OTA0MjM2MTI3/the-hairvolution-of-paige-halliwell-from-charmed.jpg",
    "Leo": "https://vignette.wikia.nocookie.net/charmed/images/c/c3/7x17-Leo.jpg/revision/latest?cb=20110125004234",
    "Cole": "https://th.bing.com/th/id/R.c8f0eba9a7ba1a10dd8d500b556f3b38?rik=7kuy7xFys9fDcg&riu=http%3a%2f%2fimg2.wikia.nocookie.net%2f__cb20110925135650%2fcharmed%2fimages%2f7%2f72%2fSeason-4-cole-05.jpg&ehk=6EIaa%2bvcITIVyCyaDptIuIOvBHDYY8KoihtCUv5nk0U%3d&risl=&pid=ImgRaw&r=0"
  };
  return images[characterName] || "";
}

// Obtenir le pouvoir du personnage
function getCharacterPower(characterName) {
  const powers = {
    "Piper": "Immobilisation moléculaire",
    "Phoebe": "Prémonition",
    "Prue": "Télékinésie",
    "Paige": "Téléportation d'objets",
    "Leo": "Guérison",
    "Cole": "Boules de feu"
  };
  return powers[characterName] || "";
}

// Créer le plateau de jeu
function createBoard() {
  // Créer 64 cases comme dans le mode local
  const board = [];
  for (let i = 0; i < 64; i++) {
    let cellType = 'normal';
    let cellContent = null;
    
    // Ajouter des cases spéciales selon le même pattern que le mode local
    if (i % 7 === 0) {
      cellType = 'special';
      cellContent = { icon: '<i class="fas fa-magic"></i>' };
    } else if (i % 13 === 0) {
      cellType = 'demon';
      // Ajouter un démon aléatoire comme dans le mode local
      const demonIndex = Math.floor(Math.random() * 3);
      const demonIds = [1, 2, 3];
      cellContent = { demonId: demonIds[demonIndex] };
    } else if (i % 11 === 0) {
      cellType = 'trap';
      cellContent = { icon: '<i class="fas fa-exclamation-triangle"></i>' };
    } else if (i % 9 === 0) {
      cellType = 'item';
      // Ajouter un objet aléatoire comme dans le mode local
      const itemIndex = Math.floor(Math.random() * 5) + 1;
      cellContent = { itemId: itemIndex };
    }
    
    board.push({
      index: i,
      type: cellType,
      content: cellContent
    });
  }
  return board;
}

// Traiter une action de jeu
function processGameAction(gameId, playerId, action) {
  const game = games[gameId];
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  const playerState = game.gameState.playerStates.find(p => p.id === playerId);
  
  switch(action.type) {
    case 'rollDice':
      // Simuler un lancer de dé
      const diceValue = Math.floor(Math.random() * 6) + 1;
      game.gameState.diceValue = diceValue;
      
      // Ajouter au journal
      addGameLog(gameId, `${game.players[playerIndex].name} lance le dé et obtient un ${diceValue}.`);
      
      // Mettre à jour la position
      const newPosition = Math.min(playerState.position + diceValue, 63);
      playerState.position = newPosition;
      
      // Vérifier si le joueur a atteint la fin
      if (newPosition === 63) {
        addGameLog(gameId, `🎉 ${game.players[playerIndex].name} a atteint la fin du plateau et remporte la partie!`);
        game.gameState.gameOver = true;
        return;
      }
      
      // Vérifier la case d'arrivée
      const cell = game.gameState.board[newPosition];
      handleCellEffect(gameId, playerId, cell);
      
      break;
      
    case 'useSpell':
      // Logique pour utiliser un sort
      // Vérifier que le joueur a assez de mana
      if (playerState.mana < 15) {
        addGameLog(gameId, `${game.players[playerIndex].name} n'a pas assez de mana.`);
        return;
      }
      
      // Utiliser le mana
      playerState.mana -= 15;
      
      if (action.target === 'demon' && game.gameState.activeDemon) {
        // Sort contre un démon
        game.gameState.activeDemon.health -= 20;
        addGameLog(gameId, `${game.players[playerIndex].name} lance un sort contre ${game.gameState.activeDemon.name} et inflige 20 points de dégâts!`);
        
        // Vérifier si le démon est vaincu
        if (game.gameState.activeDemon.health <= 0) {
          addGameLog(gameId, `${game.gameState.activeDemon.name} a été vaincu!`);
          game.gameState.activeDemon = null;
        }
      } else if (action.target === 'heal') {
        // Sort de soin
        playerState.health = Math.min(playerState.health + 25, 100);
        addGameLog(gameId, `${game.players[playerIndex].name} lance un sort de guérison et récupère 25 points de vie!`);
      } else if (action.target === 'player' && action.targetId) {
        // Sort contre un autre joueur
        const targetPlayer = game.gameState.playerStates.find(p => p.id === action.targetId);
        if (targetPlayer) {
          targetPlayer.health = Math.max(targetPlayer.health - 15, 1);
          addGameLog(gameId, `${game.players[playerIndex].name} lance un sort contre ${game.players.find(p => p.id === action.targetId).name} et inflige 15 points de dégâts!`);
        }
      }
      break;
      
    case 'useItem':
      // Logique pour utiliser un objet
      if (action.itemId && playerState.inventory) {
        const itemIndex = playerState.inventory.findIndex(item => item.id === action.itemId);
        
        if (itemIndex !== -1) {
          const item = playerState.inventory[itemIndex];
          
          switch(item.type) {
            case 'potion':
              if (item.name.includes('Guérison')) {
                playerState.health = Math.min(playerState.health + item.power, 100);
                addGameLog(gameId, `${game.players[playerIndex].name} utilise une ${item.name} et récupère ${item.power} points de vie!`);
              } else {
                playerState.mana = Math.min(playerState.mana + item.power, 100);
                addGameLog(gameId, `${game.players[playerIndex].name} utilise une ${item.name} et récupère ${item.power} points de mana!`);
              }
              break;
              
            case 'weapon':
              if (game.gameState.activeDemon) {
                game.gameState.activeDemon.health -= item.power;
                addGameLog(gameId, `${game.players[playerIndex].name} utilise ${item.name} contre ${game.gameState.activeDemon.name} et inflige ${item.power} points de dégâts!`);
                
                if (game.gameState.activeDemon.health <= 0) {
                  addGameLog(gameId, `${game.gameState.activeDemon.name} a été vaincu!`);
                  game.gameState.activeDemon = null;
                }
              }
              break;
              
            case 'defense':
              playerState.shield = {
                power: item.power,
                duration: 2
              };
              addGameLog(gameId, `${game.players[playerIndex].name} utilise ${item.name} et se protège des attaques!`);
              break;
          }
          
          // Retirer l'objet de l'inventaire
          playerState.inventory.splice(itemIndex, 1);
        }
      }
      break;
  }
}

// Gérer l'effet d'une case
function handleCellEffect(gameId, playerId, cell) {
  const game = games[gameId];
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  const playerState = game.gameState.playerStates.find(p => p.id === playerId);
  
  addGameLog(gameId, `${game.players[playerIndex].name} arrive sur une case ${cell.type}.`);
  
  switch(cell.type) {
    case 'special':
      // Bonus aléatoire
      playerState.mana += 10;
      addGameLog(gameId, `✨ ${game.players[playerIndex].name} gagne 10 points de mana bonus!`);
      break;
      
    case 'demon':
      // Combat contre un démon
      if (cell.content && cell.content.demonId) {
        const demonId = cell.content.demonId;
        const demonTemplate = game.gameState.demons.find(d => d.id === demonId);
        
        if (demonTemplate) {
          // Créer une copie du démon pour ce combat
          game.gameState.activeDemon = JSON.parse(JSON.stringify(demonTemplate));
          
          // Le démon attaque automatiquement
          const damage = Math.max(5, game.gameState.activeDemon.power - (playerState.shield ? playerState.shield.power : 0));
          playerState.health -= damage;
          
          addGameLog(gameId, `⚔️ ${game.players[playerIndex].name} rencontre ${demonTemplate.name}!`);
          addGameLog(gameId, `👹 ${demonTemplate.name} attaque et inflige ${damage} points de dégâts!`);
          
          if (playerState.health <= 0) {
            playerState.health = 1;
            addGameLog(gameId, `😱 ${game.players[playerIndex].name} est gravement blessé mais survit de justesse!`);
          }
        }
      }
      break;
      
    case 'trap':
      // Piège
      playerState.health -= 10;
      addGameLog(gameId, `🔥 ${game.players[playerIndex].name} est pris dans un piège et perd 10 points de vie!`);
      
      if (playerState.health <= 0) {
        playerState.health = 1;
        addGameLog(gameId, `😱 ${game.players[playerIndex].name} est gravement blessé mais survit de justesse!`);
      }
      break;
      
    case 'item':
      // Objet à ramasser
      if (cell.content && cell.content.itemId) {
        const itemId = cell.content.itemId;
        const item = game.gameState.items.find(i => i.id === itemId);
        
        if (item) {
          // Créer une copie de l'objet pour l'inventaire
          const newItem = JSON.parse(JSON.stringify(item));
          newItem.id = Date.now(); // ID unique
          
          // Ajouter à l'inventaire
          if (!playerState.inventory) {
            playerState.inventory = [];
          }
          playerState.inventory.push(newItem);
          
          addGameLog(gameId, `🎁 ${game.players[playerIndex].name} trouve ${item.name}!`);
        }
      }
      break;
  }
  
  // Gérer les effets actifs
  if (playerState.shield) {
    playerState.shield.duration--;
    if (playerState.shield.duration <= 0) {
      playerState.shield = null;
      addGameLog(gameId, `🛡️ Le bouclier de ${game.players[playerIndex].name} disparaît.`);
    }
  }
}

// Ajouter un message au journal de jeu
function addGameLog(gameId, message) {
  if (!games[gameId].logs) {
    games[gameId].logs = [];
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    message: message
  };
  
  games[gameId].logs.push(logEntry);
  
  // Limiter la taille du journal (garder les 50 derniers messages)
  if (games[gameId].logs.length > 50) {
    games[gameId].logs = games[gameId].logs.slice(-50);
  }
  
  // Envoyer le message à tous les joueurs de la partie
  io.to(gameId).emit('gameLog', logEntry);
}

// Port d'écoute
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
}); 