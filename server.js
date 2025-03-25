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

// Variables globales pour stocker les connexions
const connectedSockets = {};

// Configurer Socket.io
io.on('connection', (socket) => {
  console.log('Nouvelle connexion:', socket.id);
  
  // Stocker le socket pour référence
  connectedSockets[socket.id] = socket;

  // Créer une nouvelle partie
  socket.on('createGame', (playerName) => {
    console.log(`${playerName} crée une nouvelle partie`);
    
    // Générer un ID unique pour la partie
    const gameId = generateUniqueGameId();
    
    // Créer le joueur
    const player = {
      id: socket.id,
      name: playerName,
      character: null // Le personnage sera choisi plus tard
    };
    
    // Créer la partie
    const game = {
      players: [player],
      ready: false,
      gameState: null
    };
    
    // Stocker la partie
    games[gameId] = game;
    
    // Associer le joueur à la partie
    players[socket.id] = gameId;
    
    // Joindre le socket à la room de la partie
    socket.join(gameId);
    
    // Notifier le client
    socket.emit('gameCreated', {
      success: true,
      gameId: gameId,
      playerId: socket.id,
      game: game
    });
    
    console.log(`Partie créée: ${gameId} par ${playerName}`);
  });

  // Sélection d'un personnage
  socket.on('selectCharacter', (characterName) => {
    const gameId = players[socket.id];
    
    if (!gameId || !games[gameId]) {
      socket.emit('error', { message: "Partie non trouvée" });
      return;
    }
    
    const game = games[gameId];
    const player = game.players.find(p => p.id === socket.id);
    
    if (!player) {
      socket.emit('error', { message: "Joueur non trouvé" });
      return;
    }
    
    // Vérifier si le personnage est déjà pris
    const isCharacterTaken = game.players.some(p => p.id !== socket.id && p.character === characterName);
    
    if (isCharacterTaken) {
      socket.emit('error', { message: "Ce personnage est déjà pris" });
      return;
    }
    
    // Assigner le personnage au joueur
    player.character = characterName;
    
    // Notifier tous les joueurs
    io.to(gameId).emit('characterSelected', {
      playerId: socket.id,
      character: characterName,
      game: game
    });
    
    console.log(`Joueur ${player.name} a choisi ${characterName}`);
  });

  // Un joueur rejoint ou crée une partie
  socket.on('joinGame', (data) => {
    const { gameId, playerName, character } = data;
    console.log(`${playerName} essaie de rejoindre la partie ${gameId} avec le personnage ${character}`);
    
    let game = games[gameId];
    let player = {
      id: socket.id,
      name: playerName,
      character: character
    };
    
    if (!game) {
      console.log(`Création d'une nouvelle partie: ${gameId}`);
      // Créer une nouvelle partie
      game = {
        players: [player],
        ready: false,
        gameState: null
      };
      games[gameId] = game;
      socket.join(gameId);
      socket.emit('joinedGame', { success: true, gameId, role: 'host' });
      emitGameUpdate(gameId);
    } else {
      // Rejoindre une partie existante
      if (game.players.length < 4 && !game.ready) {
        // Vérifier si le personnage est déjà pris
        const isCharacterTaken = game.players.some(p => p.character === character);
        if (isCharacterTaken) {
          socket.emit('joinedGame', { 
            success: false, 
            error: "Ce personnage est déjà pris. Veuillez en choisir un autre." 
          });
          return;
        }
      
        socket.join(gameId);
        game.players.push(player);
        socket.emit('joinedGame', { success: true, gameId, role: 'player' });
        emitGameUpdate(gameId);
      } else {
        // Partie pleine ou déjà commencée
        socket.emit('joinedGame', { 
          success: false, 
          error: game.ready ? "La partie a déjà commencé." : "La partie est pleine."
        });
      }
    }
  });

  // L'hôte démarre la partie
  socket.on('startGame', (gameId) => {
    const game = games[gameId];
    if (game && game.players.length >= 2) {
      game.ready = true;
      game.gameState = initGameState(game.players);
      io.to(gameId).emit('gameStarted', { success: true });
      gameStateUpdated(gameId);
      
      // Annoncer le début de la partie
      addGameLog(gameId, "La partie commence ! Bonne chance à tous !");
      addGameLog(gameId, `C'est au tour de ${game.gameState.playerStates[0].name}`);
    } else if (game) {
      socket.emit('gameStarted', { 
        success: false, 
        error: "Il faut au moins 2 joueurs pour commencer."
      });
    }
  });
  
  // Un joueur effectue une action dans le jeu
  socket.on('gameAction', (data) => {
    const { gameId, action, targetId, itemId } = data;
    const game = games[gameId];
    
    if (!game || !game.ready || !game.gameState) {
      socket.emit('actionResult', { 
        success: false, 
        error: "La partie n'a pas encore commencé."
      });
      return;
    }
    
    // Vérifier si c'est le tour du joueur
    const playerIndex = game.gameState.playerStates.findIndex(p => p.id === socket.id);
    if (playerIndex !== game.gameState.currentPlayerIndex) {
      socket.emit('actionResult', { 
        success: false, 
        error: "Ce n'est pas votre tour."
      });
      return;
    }
    
    // Traiter l'action
    processGameAction(gameId, socket.id, action, targetId, itemId);
  });
  
  // Un joueur utilise un objet
  socket.on('useItem', (data) => {
    const { gameId, itemId, targetId } = data;
    const game = games[gameId];
    
    if (!game || !game.gameState) return;
    
    const player = game.gameState.playerStates.find(p => p.id === socket.id);
    if (!player) return;
    
    const item = player.inventory.find(i => i.id === itemId);
    if (!item) {
      socket.emit('actionResult', { success: false, message: "Vous ne possédez pas cet objet" });
      return;
    }
    
    if (item.type === 'potion') {
      if (item.name === "Potion de Guérison") {
        player.health = Math.min(100, player.health + item.power);
        addGameLog(gameId, `${player.name} utilise une ${item.name} et récupère ${item.power} points de vie.`);
      } else if (item.name === "Potion d'Énergie") {
        player.mana = Math.min(100, player.mana + item.power);
        addGameLog(gameId, `${player.name} utilise une ${item.name} et récupère ${item.power} points de mana.`);
      }
    } else if (item.type === 'spell' && game.gameState.activeDemon) {
      // Utiliser un sort contre le démon
      game.gameState.activeDemon.health -= item.power;
      addGameLog(gameId, `${player.name} utilise ${item.name} contre ${game.gameState.activeDemon.name} et inflige ${item.power} points de dégâts.`);
      
      // Vérifier si le démon est vaincu
      if (game.gameState.activeDemon.health <= 0) {
        addGameLog(gameId, `${game.gameState.activeDemon.name} a été vaincu !`);
        game.gameState.activeDemon = null;
        nextTurn(gameId);
      }
    } else if (item.type === 'weapon' && game.gameState.activeDemon) {
      // Utiliser une arme contre le démon
      game.gameState.activeDemon.health -= item.power;
      addGameLog(gameId, `${player.name} utilise ${item.name} contre ${game.gameState.activeDemon.name} et inflige ${item.power} points de dégâts.`);
      
      // Vérifier si le démon est vaincu
      if (game.gameState.activeDemon.health <= 0) {
        addGameLog(gameId, `${game.gameState.activeDemon.name} a été vaincu !`);
        game.gameState.activeDemon = null;
        nextTurn(gameId);
      }
    } else if (item.type === 'defense') {
      // Activer une défense
      player.defense = item.power;
      addGameLog(gameId, `${player.name} active ${item.name} et gagne ${item.power} points de défense.`);
    }
    
    // Retirer l'objet de l'inventaire
    player.inventory = player.inventory.filter(i => i.id !== itemId);
    
    // Mettre à jour l'état du jeu
    gameStateUpdated(gameId);
    socket.emit('actionResult', { success: true });
  });
  
  // Un joueur utilise son pouvoir spécial
  socket.on('usePower', (data) => {
    const { gameId, targetId } = data;
    const game = games[gameId];
    
    if (!game || !game.gameState) return;
    
    const player = game.gameState.playerStates.find(p => p.id === socket.id);
    if (!player) return;
    
    // Coût en mana pour utiliser un pouvoir
    const manaCost = 15;
    
    if (player.mana < manaCost) {
      socket.emit('actionResult', { success: false, message: "Vous n'avez pas assez de mana" });
      return;
    }
    
    // Effet du pouvoir selon le personnage
    let effectDescription = "";
    let powerEffective = false;
    
    if (player.character === "Piper" && game.gameState.activeDemon) {
      // Pouvoir de Piper: immobilisation
      game.gameState.activeDemon.frozen = true;
      effectDescription = `${player.name} utilise son pouvoir d'immobilisation sur ${game.gameState.activeDemon.name}!`;
      powerEffective = true;
    } else if (player.character === "Phoebe") {
      // Pouvoir de Phoebe: prémonition
      const nextCell = game.gameState.board[player.position + 1] || { type: "safe" };
      effectDescription = `${player.name} a une prémonition: la prochaine case contient ${
        nextCell.type === 'demon' ? 'un démon' : 
        nextCell.type === 'item' ? 'un objet' : 
        nextCell.type === 'trap' ? 'un piège' : 
        'rien de spécial'
      }.`;
      powerEffective = true;
    } else if (player.character === "Prue" && game.gameState.activeDemon) {
      // Pouvoir de Prue: télékinésie
      game.gameState.activeDemon.health -= 20;
      effectDescription = `${player.name} utilise sa télékinésie et inflige 20 points de dégâts à ${game.gameState.activeDemon.name}!`;
      powerEffective = true;
      
      // Vérifier si le démon est vaincu
      if (game.gameState.activeDemon.health <= 0) {
        addGameLog(gameId, `${game.gameState.activeDemon.name} a été vaincu !`);
        game.gameState.activeDemon = null;
        nextTurn(gameId);
      }
    } else if (player.character === "Paige") {
      // Pouvoir de Paige: téléportation d'objets
      if (game.gameState.items.length > 0) {
        const randomItem = game.gameState.items[Math.floor(Math.random() * game.gameState.items.length)];
        player.inventory.push({...randomItem});
        effectDescription = `${player.name} utilise son pouvoir de téléportation d'objets et obtient ${randomItem.name}!`;
        powerEffective = true;
      } else {
        effectDescription = `${player.name} tente d'utiliser son pouvoir, mais aucun objet n'est disponible.`;
      }
    } else if (player.character === "Leo") {
      // Pouvoir de Leo: guérison
      if (targetId) {
        const targetPlayer = game.gameState.playerStates.find(p => p.id === targetId);
        if (targetPlayer) {
          targetPlayer.health = Math.min(100, targetPlayer.health + 30);
          effectDescription = `${player.name} guérit ${targetPlayer.name} qui récupère 30 points de vie!`;
          powerEffective = true;
        }
      } else {
        player.health = Math.min(100, player.health + 30);
        effectDescription = `${player.name} se guérit et récupère 30 points de vie!`;
        powerEffective = true;
      }
    } else if (player.character === "Cole" && game.gameState.activeDemon) {
      // Pouvoir de Cole: boules de feu
      game.gameState.activeDemon.health -= 30;
      effectDescription = `${player.name} lance une boule de feu et inflige 30 points de dégâts à ${game.gameState.activeDemon.name}!`;
      powerEffective = true;
      
      // Vérifier si le démon est vaincu
      if (game.gameState.activeDemon.health <= 0) {
        addGameLog(gameId, `${game.gameState.activeDemon.name} a été vaincu !`);
        game.gameState.activeDemon = null;
        nextTurn(gameId);
      }
    } else {
      socket.emit('actionResult', { 
        success: false, 
        message: "Votre pouvoir n'est pas efficace dans cette situation"
      });
      return;
    }
    
    if (powerEffective) {
      player.mana -= manaCost;
      addGameLog(gameId, effectDescription);
      gameStateUpdated(gameId);
      socket.emit('actionResult', { success: true });
    }
  });
  
  // Gestion d'un combat contre un démon
  socket.on('combat', (data) => {
    const { gameId, action } = data;
    const game = games[gameId];
    
    if (!game || !game.gameState || !game.gameState.activeDemon) {
      socket.emit('actionResult', { success: false, message: "Aucun combat en cours" });
      return;
    }
    
    const player = game.gameState.playerStates.find(p => p.id === socket.id);
    if (!player) return;
    
    if (action === 'attack') {
      // Attaque basique
      const damage = 10 + Math.floor(Math.random() * 5);
      game.gameState.activeDemon.health -= damage;
      addGameLog(gameId, `${player.name} attaque ${game.gameState.activeDemon.name} et inflige ${damage} points de dégâts.`);
      
      // Contre-attaque du démon sauf s'il est immobilisé
      if (!game.gameState.activeDemon.frozen) {
        const demonDamage = game.gameState.activeDemon.power - (player.defense || 0);
        const actualDamage = Math.max(5, demonDamage);
        player.health -= actualDamage;
        addGameLog(gameId, `${game.gameState.activeDemon.name} contre-attaque et inflige ${actualDamage} points de dégâts à ${player.name}.`);
        
        // Réinitialiser la défense après utilisation
        player.defense = 0;
      } else {
        addGameLog(gameId, `${game.gameState.activeDemon.name} est immobilisé et ne peut pas contre-attaquer.`);
        game.gameState.activeDemon.frozen = false;
      }
      
      // Vérifier si le joueur est vaincu
      if (player.health <= 0) {
        player.health = 0;
        addGameLog(gameId, `${player.name} a été vaincu par ${game.gameState.activeDemon.name}!`);
        
        // Vérifier si tous les joueurs sont vaincus
        const allDefeated = game.gameState.playerStates.every(p => p.health <= 0);
        if (allDefeated) {
          game.gameState.gameOver = true;
          addGameLog(gameId, "Tous les joueurs ont été vaincus! Partie terminée.");
        } else {
          // Passer au joueur suivant
          game.gameState.activeDemon = null;
          nextTurn(gameId);
        }
      }
      
      // Vérifier si le démon est vaincu
      if (game.gameState.activeDemon && game.gameState.activeDemon.health <= 0) {
        addGameLog(gameId, `${game.gameState.activeDemon.name} a été vaincu!`);
        
        // Récompense pour avoir vaincu le démon
        player.mana += 10;
        addGameLog(gameId, `${player.name} gagne 10 points de mana.`);
        
        game.gameState.activeDemon = null;
        nextTurn(gameId);
      }
      
      // Mettre à jour l'état du jeu
      gameStateUpdated(gameId);
      socket.emit('actionResult', { success: true });
    } else if (action === 'flee') {
      // Tenter de fuir
      const fleeChance = Math.random();
      
      if (fleeChance > 0.6) {
        // Réussite
        addGameLog(gameId, `${player.name} réussit à fuir le combat!`);
        game.gameState.activeDemon = null;
        nextTurn(gameId);
      } else {
        // Échec
        addGameLog(gameId, `${player.name} tente de fuir, mais échoue!`);
        
        // Le démon attaque
        const demonDamage = Math.max(5, game.gameState.activeDemon.power - (player.defense || 0));
        player.health -= demonDamage;
        addGameLog(gameId, `${game.gameState.activeDemon.name} attaque et inflige ${demonDamage} points de dégâts à ${player.name}.`);
        
        // Réinitialiser la défense après utilisation
        player.defense = 0;
        
        // Vérifier si le joueur est vaincu
        if (player.health <= 0) {
          player.health = 0;
          addGameLog(gameId, `${player.name} a été vaincu par ${game.gameState.activeDemon.name}!`);
          
          // Vérifier si tous les joueurs sont vaincus
          const allDefeated = game.gameState.playerStates.every(p => p.health <= 0);
          if (allDefeated) {
            game.gameState.gameOver = true;
            addGameLog(gameId, "Tous les joueurs ont été vaincus! Partie terminée.");
          } else {
            // Passer au joueur suivant
            game.gameState.activeDemon = null;
            nextTurn(gameId);
          }
        }
      }
      
      // Mettre à jour l'état du jeu
      gameStateUpdated(gameId);
      socket.emit('actionResult', { success: true });
    }
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

// Générer un ID de partie unique qui n'existe pas déjà
function generateUniqueGameId() {
  let gameId;
  do {
    gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (games[gameId]); // Continuer tant que l'ID existe déjà
  
  return gameId;
}

// Initialiser l'état du jeu
function initGameState(players) {
  // Créer un plateau de jeu identique au mode local
  const board = createBoard();
  
  // Personnages et leurs pouvoirs
  const characterPowers = {
    "Piper": "Immobilisation moléculaire",
    "Phoebe": "Prémonition",
    "Prue": "Télékinésie",
    "Paige": "Téléportation d'objets",
    "Leo": "Guérison",
    "Cole": "Boules de feu"
  };
  
  // Initialiser les états des joueurs avec toutes les données du mode local
  const playerStates = players.map(player => ({
    id: player.id,
    name: player.name,
    color: player.character ? player.character.toLowerCase() : 'piper',
    health: 100,
    mana: player.character === 'Leo' ? 70 : (player.character === 'Cole' ? 60 : 50),
    position: 0,
    inventory: [],
    image: getCharacterImage(player.character),
    power: characterPowers[player.character] || "Pouvoir inconnu",
    playerNumber: players.indexOf(player) + 1,
    character: player.character
  }));
  
  // Liste d'objets disponibles dans le jeu (exactement comme en mode local)
  const items = [
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
  ];
  
  // Liste de démons (exactement comme en mode local)
  const demons = [
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
  ];
  
  return {
    board: board,
    playerStates: playerStates,
    items: items,
    demons: demons,
    currentPlayerIndex: 0,
    diceValue: 0,
    gameStarted: true,
    gameOver: false,
    activeDemon: null
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
function processGameAction(gameId, playerId, action, targetId, itemId) {
  const game = games[gameId];
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  const playerState = game.gameState.playerStates.find(p => p.id === playerId);
  
  console.log(`Action reçue de ${game.players[playerIndex].name}: ${action.type}`);
  
  switch(action.type) {
    case 'rollDice':
      // Simuler un lancer de dé comme en mode local
      const diceValue = Math.floor(Math.random() * 6) + 1;
      game.gameState.diceValue = diceValue;
      
      // Ajouter au journal
      addGameLog(gameId, `${game.players[playerIndex].name} lance le dé et obtient un ${diceValue}.`);
      
      // Mettre à jour la position
      const previousPosition = playerState.position;
      const newPosition = Math.min(previousPosition + diceValue, 63);
      playerState.position = newPosition;
      
      // Vérifier si le joueur a atteint la fin
      if (newPosition === 63) {
        addGameLog(gameId, `🎉 ${game.players[playerIndex].name} a atteint la fin du plateau et remporte la partie!`);
        game.gameState.gameOver = true;
        return;
      }
      
      // Ajouter un log de déplacement (comme en mode local)
      addGameLog(gameId, `${game.players[playerIndex].name} avance de la case ${previousPosition} à la case ${newPosition}.`);
      
      // Vérifier la case d'arrivée
      const cell = game.gameState.board[newPosition];
      handleCellEffect(gameId, playerId, cell);
      
      break;
      
    case 'useSpell':
      // Logique pour utiliser un sort (comme en mode local)
      // Vérifier que le joueur a assez de mana
      if (playerState.mana < 15) {
        addGameLog(gameId, `${game.players[playerIndex].name} n'a pas assez de mana.`);
        return;
      }
      
      // Utiliser le mana
      playerState.mana -= 15;
      
      // Choisir un sort aléatoire, comme en mode local
      const spells = [
        { name: "Téléportation", effect: "se téléporte de 3 cases en avant" },
        { name: "Bouclier", effect: "récupère 15 points de vie" },
        { name: "Vision", effect: "peut voir les 5 prochaines cases" }
      ];
      
      const spell = spells[Math.floor(Math.random() * spells.length)];
      
      if (spell.name === "Téléportation") {
        playerState.position += 3;
        if (playerState.position >= 63) {
          playerState.position = 63;
          game.gameState.gameOver = true;
          addGameLog(gameId, `${game.players[playerIndex].name} a utilisé le sort ${spell.name} et a atteint la fin du plateau!`);
          return;
        }
        // Vérifier la case d'arrivée après téléportation
        const newCell = game.gameState.board[playerState.position];
        handleCellEffect(gameId, playerId, newCell);
      } else if (spell.name === "Bouclier") {
        playerState.health += 15;
        if (playerState.health > 100) playerState.health = 100;
      }
      
      addGameLog(gameId, `${game.players[playerIndex].name} utilise le sort ${spell.name} et ${spell.effect}.`);
      break;
      
    case 'useItem':
      // Logique pour utiliser un objet
      if (!itemId) {
        addGameLog(gameId, "Aucun objet spécifié.");
        return;
      }
      
      const inventory = playerState.inventory || [];
      const itemIndex = inventory.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        addGameLog(gameId, `${game.players[playerIndex].name} n'a pas cet objet dans son inventaire.`);
        return;
      }
      
      const item = inventory[itemIndex];
      
      // Appliquer l'effet de l'objet
      if (item.type === 'potion') {
        if (item.name.includes('Guérison')) {
          playerState.health += item.power;
          if (playerState.health > 100) playerState.health = 100;
          addGameLog(gameId, `${game.players[playerIndex].name} utilise ${item.name} et récupère ${item.power} points de vie.`);
        } else {
          playerState.mana += item.power;
          if (playerState.mana > 100) playerState.mana = 100;
          addGameLog(gameId, `${game.players[playerIndex].name} utilise ${item.name} et récupère ${item.power} points de mana.`);
        }
      } else if (item.type === 'weapon' && game.gameState.activeDemon) {
        // Augmenter les dégâts contre le démon actif
        game.gameState.activeDemon.health -= item.power;
        addGameLog(gameId, `${game.players[playerIndex].name} utilise ${item.name} et inflige ${item.power} points de dégâts au démon.`);
        
        // Vérifier si le démon a été vaincu
        if (game.gameState.activeDemon.health <= 0) {
          addGameLog(gameId, `${game.players[playerIndex].name} a vaincu le démon avec ${item.name}!`);
          // Donner une récompense
          playerState.mana += 10;
          game.gameState.activeDemon = null;
        }
      } else if (item.type === 'defense') {
        // Ajouter un bouclier temporaire
        playerState.health += item.power;
        if (playerState.health > 100) playerState.health = 100;
        addGameLog(gameId, `${game.players[playerIndex].name} utilise ${item.name} et gagne ${item.power} points de vie.`);
      } else if (item.type === 'spell') {
        // Lancer un sort puissant
        if (game.gameState.activeDemon) {
          game.gameState.activeDemon.health -= item.power * 2;
          addGameLog(gameId, `${game.players[playerIndex].name} utilise ${item.name} et lance un sort puissant infligeant ${item.power * 2} points de dégâts au démon!`);
          
          // Vérifier si le démon a été vaincu
          if (game.gameState.activeDemon.health <= 0) {
            addGameLog(gameId, `${game.players[playerIndex].name} a vaincu le démon avec le pouvoir de ${item.name}!`);
            // Donner une récompense
            playerState.mana += 20;
            game.gameState.activeDemon = null;
          }
        } else {
          // Si pas de démon, ajouter du mana
          playerState.mana += item.power;
          if (playerState.mana > 100) playerState.mana = 100;
          addGameLog(gameId, `${game.players[playerIndex].name} utilise ${item.name} et récupère ${item.power} points de mana.`);
        }
      }
      
      // Retirer l'objet de l'inventaire après utilisation
      inventory.splice(itemIndex, 1);
      break;
      
    case 'attack':
      // Combat contre un démon
      if (!game.gameState.activeDemon) {
        addGameLog(gameId, "Aucun démon à combattre.");
        return;
      }
      
      // Attaque de base
      const playerDamage = Math.floor(Math.random() * 10) + 5;
      game.gameState.activeDemon.health -= playerDamage;
      
      addGameLog(gameId, `${game.players[playerIndex].name} attaque le démon et inflige ${playerDamage} points de dégâts.`);
      
      // Contre-attaque du démon
      if (game.gameState.activeDemon.health > 0) {
        const demonDamage = Math.floor(Math.random() * game.gameState.activeDemon.power / 2) + 5;
        playerState.health -= demonDamage;
        
        addGameLog(gameId, `Le démon ${game.gameState.activeDemon.name} contre-attaque et inflige ${demonDamage} points de dégâts à ${game.players[playerIndex].name}.`);
        
        // Vérifier si le joueur est vaincu
        if (playerState.health <= 0) {
          playerState.health = 10; // Éviter la mort permanente
          addGameLog(gameId, `${game.players[playerIndex].name} a été vaincu par le démon, mais récupère 10 points de vie.`);
          
          // Le combat est terminé (échec)
          game.gameState.activeDemon = null;
        }
      } else {
        // Le démon est vaincu
        addGameLog(gameId, `${game.players[playerIndex].name} a vaincu le démon ${game.gameState.activeDemon.name}!`);
        
        // Récompense
        const manaGain = Math.floor(Math.random() * 15) + 10;
        playerState.mana += manaGain;
        addGameLog(gameId, `${game.players[playerIndex].name} gagne ${manaGain} points de mana.`);
        
        // Chance d'obtenir un objet aléatoire
        if (Math.random() > 0.5) {
          const randomItem = Math.floor(Math.random() * game.gameState.items.length);
          const newItem = game.gameState.items[randomItem];
          
          // Ajouter l'objet à l'inventaire
          if (!playerState.inventory) playerState.inventory = [];
          playerState.inventory.push(newItem);
          
          addGameLog(gameId, `${game.players[playerIndex].name} a trouvé un objet: ${newItem.name}!`);
        }
        
        // Le combat est terminé (succès)
        game.gameState.activeDemon = null;
      }
      break;
      
    case 'flee':
      // Tenter de fuir un combat
      if (!game.gameState.activeDemon) {
        addGameLog(gameId, "Aucun démon duquel fuir.");
        return;
      }
      
      // 50% de chance de réussir
      if (Math.random() > 0.5) {
        addGameLog(gameId, `${game.players[playerIndex].name} réussit à s'enfuir du combat!`);
        game.gameState.activeDemon = null;
      } else {
        addGameLog(gameId, `${game.players[playerIndex].name} tente de fuir mais échoue!`);
        
        // Le démon attaque
        const demonDamage = Math.floor(Math.random() * game.gameState.activeDemon.power / 2) + 5;
        playerState.health -= demonDamage;
        
        addGameLog(gameId, `Le démon ${game.gameState.activeDemon.name} attaque ${game.players[playerIndex].name} et inflige ${demonDamage} points de dégâts.`);
      }
      break;
      
    default:
      console.log(`Action non reconnue: ${action.type}`);
  }
}

// Gérer l'effet d'une case
function handleCellEffect(gameId, playerId, cell) {
  const game = games[gameId];
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  const player = game.gameState.playerStates.find(p => p.id === playerId);
  const playerName = game.players[playerIndex].name;
  
  if (!cell) {
    console.error("Case indéfinie");
    return;
  }
  
  console.log(`Traitement de l'effet de la case type=${cell.type} pour le joueur ${playerName}`);
  
  // Appliquer l'effet en fonction du type de case
  switch(cell.type) {
    case 'special':
      // Case magique: plus de mana
      addGameLog(gameId, `${playerName} a trouvé une source de pouvoir magique!`);
      player.mana += 20;
      if (player.mana > 100) player.mana = 100;
      break;
      
    case 'demon':
      // Case démon: démarrer un combat
      addGameLog(gameId, `${playerName} rencontre un démon!`);
      
      // Sélectionner un démon aléatoire
      const demonIndex = Math.floor(Math.random() * game.gameState.demons.length);
      const demon = game.gameState.demons[demonIndex];
      
      // Créer une instance du démon pour le combat
      game.gameState.activeDemon = {
        id: demon.id,
        name: demon.name,
        power: demon.power,
        health: demon.health,
        description: demon.description,
        image: demon.image
      };
      
      addGameLog(gameId, `Un ${demon.name} apparaît! (Santé: ${demon.health}, Pouvoir: ${demon.power})`);
      break;
      
    case 'trap':
      // Case piège: perdre de la vie
      const damage = Math.floor(Math.random() * 10) + 5;
      player.health -= damage;
      
      addGameLog(gameId, `${playerName} est tombé dans un piège et perd ${damage} points de vie!`);
      
      // Empêcher la mort
      if (player.health <= 0) {
        player.health = 10;
        addGameLog(gameId, `${playerName} était au bord de la mort mais a récupéré 10 points de vie.`);
      }
      break;
      
    case 'item':
      // Case objet: trouver un objet
      if (cell.content && cell.content.itemId) {
        const itemId = cell.content.itemId;
        const item = game.gameState.items.find(i => i.id === itemId);
        
        if (item) {
          addGameLog(gameId, `${playerName} a trouvé : ${item.name}!`);
          
          // Ajouter l'objet à l'inventaire
          if (!player.inventory) player.inventory = [];
          player.inventory.push(item);
          
          // L'objet est ramassé, marquer la case comme normale
          cell.type = 'normal';
          cell.content = null;
        }
      }
      break;
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

// Envoyer une mise à jour de l'état du jeu à tous les joueurs de la partie
function gameStateUpdated(gameId, additionalInfo = {}) {
  const game = games[gameId];
  if (!game) return;
  
  // S'assurer que nous envoyons toutes les informations nécessaires
  const gameState = {
    ...game.gameState,
    ...additionalInfo
  };
  
  // Ajouter des champs supplémentaires si nécessaire pour la compatibilité avec le mode local
  if (!gameState.currentPlayer && gameState.playerStates && gameState.currentPlayerIndex >= 0) {
    gameState.currentPlayer = gameState.playerStates[gameState.currentPlayerIndex];
  }
  
  // Envoyer l'état complet à tous les joueurs connectés
  if (game.players) {
    game.players.forEach(player => {
      const socket = getSocketById(player.id);
      if (socket) {
        console.log(`Envoi de l'état du jeu à ${player.name} (${player.id})`);
        socket.emit('gameStateUpdate', gameState);
      }
    });
  }
}

// Passer au joueur suivant
function nextTurn(gameId) {
  const game = games[gameId];
  if (!game || !game.gameState) return;
  
  // Si la partie est terminée, ne pas passer au joueur suivant
  if (game.gameState.gameOver) return;
  
  // Incrémenter l'index du joueur
  game.gameState.currentPlayerIndex = (game.gameState.currentPlayerIndex + 1) % game.gameState.playerStates.length;
  
  // S'assurer que le joueur suivant a de la vie
  let attempt = 0;
  while (game.gameState.playerStates[game.gameState.currentPlayerIndex].health <= 0 && attempt < game.gameState.playerStates.length) {
    game.gameState.currentPlayerIndex = (game.gameState.currentPlayerIndex + 1) % game.gameState.playerStates.length;
    attempt++;
  }
  
  // Si tous les joueurs sont morts, c'est la fin de la partie
  if (attempt >= game.gameState.playerStates.length) {
    game.gameState.gameOver = true;
    addGameLog(gameId, "Tous les joueurs ont été vaincus! Partie terminée.");
    return;
  }
  
  // Annoncer le nouveau tour
  const currentPlayer = game.gameState.playerStates[game.gameState.currentPlayerIndex];
  addGameLog(gameId, `C'est au tour de ${currentPlayer.name}`);
  
  // Mettre à jour l'état
  gameStateUpdated(gameId);
}

// Récupérer un socket par son ID
function getSocketById(socketId) {
  return connectedSockets[socketId];
}

// Envoyer une mise à jour du statut de la partie à tous les joueurs
function emitGameUpdate(gameId) {
  const game = games[gameId];
  if (!game) return;
  
  io.to(gameId).emit('gameUpdate', {
    players: game.players,
    ready: game.ready
  });
}

// Port d'écoute
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
}); 