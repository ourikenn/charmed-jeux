// Initialisation du jeu
const game = {
    players: [
        { 
            name: "Piper", 
            color: "piper", 
            health: 100, 
            mana: 50, 
            position: 0, 
            inventory: [],
            image: "https://th.bing.com/th/id/R.e418e2e82e7d024893b72962bfa1fb03?rik=0qM8%2fp3Dzkr63A&riu=http%3a%2f%2fimages5.fanpop.com%2fimage%2fphotos%2f25500000%2fPiper-Halliwell-charmed-25593462-1912-2560.jpg&ehk=rxkknJzYQe06CdLUufNRS94f9bGVAWedZ7yJeX3j2Us%3d&risl=&pid=ImgRaw&r=0",
            power: "Immobilisation moléculaire"
        },
        { 
            name: "Phoebe", 
            color: "phoebe", 
            health: 100, 
            mana: 50, 
            position: 0, 
            inventory: [],
            image: "https://usercontent2.hubstatic.com/14340833_f520.jpg",
            power: "Prémonition"
        },
        { 
            name: "Prue", 
            color: "prue", 
            health: 100, 
            mana: 50, 
            position: 0, 
            inventory: [],
            image: "https://th.bing.com/th/id/R.9898bd81a60bd0fb240e5c8a3ed8ec85?rik=QHMl3HpnNXX5Kg&riu=http%3a%2f%2fimages5.fanpop.com%2fimage%2fphotos%2f25500000%2fPrue-Halliwell-charmed-25593840-2141-2560.jpg&ehk=5FdgnbZowUevZ4QwBVZXNyZF7eSUZwcZb1MbS9MvcOg%3d&risl=&pid=ImgRaw&r=0",
            power: "Télékinésie"
        },
        { 
            name: "Paige", 
            color: "paige", 
            health: 100, 
            mana: 50, 
            position: 0, 
            inventory: [],
            image: "https://images.saymedia-content.com/.image/ar_3:2%2Cc_limit%2Ccs_srgb%2Cfl_progressive%2Cq_auto:eco%2Cw_1400/MTc1MTE0NzE2OTA0MjM2MTI3/the-hairvolution-of-paige-halliwell-from-charmed.jpg",
            power: "Téléportation d'objets"
        },
        { 
            name: "Leo", 
            color: "leo", 
            health: 100, 
            mana: 70, 
            position: 0, 
            inventory: [],
            image: "https://vignette.wikia.nocookie.net/charmed/images/c/c3/7x17-Leo.jpg/revision/latest?cb=20110125004234",
            power: "Guérison"
        },
        { 
            name: "Cole", 
            color: "cole", 
            health: 120, 
            mana: 60, 
            position: 0, 
            inventory: [],
            image: "https://th.bing.com/th/id/R.c8f0eba9a7ba1a10dd8d500b556f3b38?rik=7kuy7xFys9fDcg&riu=http%3a%2f%2fimg2.wikia.nocookie.net%2f__cb20110925135650%2fcharmed%2fimages%2f7%2f72%2fSeason-4-cole-05.jpg&ehk=6EIaa%2bvcITIVyCyaDptIuIOvBHDYY8KoihtCUv5nk0U%3d&risl=&pid=ImgRaw&r=0",
            power: "Boules de feu"
        }
    ],
    
    // Liste d'objets disponibles dans le jeu
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
    
    // Liste de démons pour les combats
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
    board: [],
    diceValue: 0,
    gameStarted: false,
    gameOver: false,
    
    // Mode multijoueur en ligne
    onlineMode: {
        socket: null,
        gameId: null,
        playerId: null,
        isActive: false,
        
        // Initialiser le mode en ligne
        init: function() {
            // Vérifier si on est en mode online
            const urlParams = new URLSearchParams(window.location.search);
            const gameMode = urlParams.get('mode');
            const gameId = urlParams.get('gameId');
            
            if (gameMode === 'online' && gameId) {
                // Activer le mode en ligne
                this.isActive = true;
                this.gameId = gameId;
                
                // Récupérer les informations stockées
                const savedGame = JSON.parse(localStorage.getItem('onlineGame') || '{}');
                this.playerId = savedGame.playerId;
                
                // Initialiser la connexion socket
                this.initSocket();
                
                // Afficher un message dans le journal
                game.addLogEntry('Mode multijoueur en ligne activé');
                game.addLogEntry(`Partie: ${this.gameId}`);
                
                return true;
            }
            
            return false;
        },
        
        // Initialiser la connexion socket
        initSocket: function() {
            // Charger la librairie Socket.io si nécessaire
            if (typeof io === 'undefined') {
                const script = document.createElement('script');
                script.src = '/socket.io/socket.io.js';
                script.onload = () => this.connectSocket();
                document.head.appendChild(script);
            } else {
                this.connectSocket();
            }
        },
        
        // Se connecter au serveur Socket.io
        connectSocket: function() {
            this.socket = io();
            
            // Événement de connexion
            this.socket.on('connect', () => {
                console.log('Connecté au serveur en mode jeu');
                
                // Synchroniser l'état du jeu
                this.syncGameState();
                
                // S'abonner aux logs du jeu
                this.socket.on('gameLog', (logEntry) => {
                    // Ajouter l'entrée au journal local
                    game.addLogEntry(logEntry.message);
                });
            });
            
            // Événement de mise à jour de l'état du jeu
            this.socket.on('gameStateUpdated', (data) => {
                console.log('État du jeu mis à jour:', data);
                
                // Mettre à jour l'état local du jeu
                this.updateLocalGameState(data.game);
                
                // Afficher le résultat du dé si c'était un lancer
                if (data.lastAction && data.lastAction.type === 'rollDice') {
                    this.showDiceResult(data.game.gameState.diceValue);
                }
            });
            
            // Événement de changement de tour
            this.socket.on('turnChanged', (data) => {
                // Mettre à jour l'index du joueur courant
                game.currentPlayerIndex = data.currentPlayerIndex;
                
                // Vérifier si c'est mon tour
                const isMyTurn = data.currentPlayerId === this.playerId;
                
                // Mettre à jour l'interface
                this.updateTurnUI(isMyTurn);
                
                // Afficher un message dans le journal
                const currentPlayer = game.players[game.currentPlayerIndex];
                game.addLogEntry(`C'est au tour de ${currentPlayer.name}`);
            });
        },
        
        // Synchroniser l'état du jeu avec le serveur
        syncGameState: function() {
            this.socket.emit('getGameState', this.gameId, (data) => {
                if (data.success) {
                    // Mettre à jour l'état local du jeu
                    this.updateLocalGameState(data.game);
                    
                    // Récupérer les logs précédents
                    this.syncGameLogs();
                }
            });
        },
        
        // Synchroniser les logs du jeu
        syncGameLogs: function() {
            this.socket.emit('getGameLogs', this.gameId, (data) => {
                if (data.success && data.logs) {
                    // Vider le journal actuel
                    const gameLog = document.getElementById('gameLog');
                    gameLog.innerHTML = '';
                    
                    // Ajouter tous les logs précédents
                    data.logs.forEach(log => {
                        game.addLogEntry(log.message);
                    });
                }
            });
        },
        
        // Afficher le résultat du dé
        showDiceResult: function(diceValue) {
            // Créer une animation pour le dé, comme dans le mode local
            const diceContainer = document.createElement('div');
            diceContainer.className = 'dice-container';
            diceContainer.innerHTML = `<div class="dice">${diceValue}</div>`;
            document.body.appendChild(diceContainer);
            
            // Supprimer après l'animation
            setTimeout(() => {
                diceContainer.classList.add('fade-out');
                setTimeout(() => {
                    document.body.removeChild(diceContainer);
                }, 500);
            }, 1500);
        },
        
        // Mettre à jour l'état local du jeu
        updateLocalGameState: function(serverGame) {
            // Mettre à jour les joueurs
            game.players = serverGame.players;
            
            // Mettre à jour l'index du joueur courant
            game.currentPlayerIndex = serverGame.currentPlayerIndex;
            
            // Mettre à jour le plateau
            game.board = serverGame.gameState.board;
            
            // Mettre à jour les états des joueurs
            game.playerStates = serverGame.gameState.playerStates;
            
            // Mettre à jour les objets et démons
            game.items = serverGame.gameState.items;
            game.demons = serverGame.gameState.demons;
            
            // Mettre à jour l'état du jeu
            game.gameStarted = serverGame.gameState.gameStarted;
            game.gameOver = serverGame.gameState.gameOver;
            
            // Mettre à jour l'interface
            this.updateUI();
        },
        
        // Mettre à jour toute l'interface
        updateUI: function() {
            // Mettre à jour le plateau
            game.renderBoard();
            
            // Mettre à jour les fiches des joueurs
            game.renderPlayers();
            
            // Mettre à jour l'indicateur de tour
            game.showTurnIndicator();
            
            // Mettre à jour l'état du tour
            const isMyTurn = game.players[game.currentPlayerIndex].id === this.playerId;
            this.updateTurnUI(isMyTurn);
            
            // Mettre à jour les compteurs et avatars
            this.updatePlayersUI();
        },
        
        // Mettre à jour l'interface des joueurs
        updatePlayersUI: function() {
            const playerCards = document.querySelectorAll('.player-card');
            
            // Pour chaque carte de joueur
            playerCards.forEach((card, index) => {
                const player = game.players[index];
                const playerState = game.playerStates.find(p => p.id === player.id);
                
                if (player && playerState) {
                    // Mettre à jour la santé et le mana
                    const healthBar = card.querySelector('.health-bar');
                    const manaBar = card.querySelector('.mana-bar');
                    
                    if (healthBar) {
                        healthBar.style.width = `${playerState.health}%`;
                        healthBar.textContent = `${playerState.health}%`;
                    }
                    
                    if (manaBar) {
                        manaBar.style.width = `${playerState.mana}%`;
                        manaBar.textContent = `${playerState.mana}%`;
                    }
                    
                    // Mettre à jour l'inventaire si affiché
                    const inventoryList = card.querySelector('.inventory-list');
                    if (inventoryList && playerState.inventory) {
                        inventoryList.innerHTML = '';
                        
                        playerState.inventory.forEach(item => {
                            const itemElement = document.createElement('div');
                            itemElement.className = 'inventory-item';
                            itemElement.innerHTML = `
                                <img src="${item.icon}" alt="${item.name}">
                                <span>${item.name}</span>
                            `;
                            
                            // Ajouter l'événement de clic pour utiliser l'objet
                            if (player.id === this.playerId) {
                                itemElement.addEventListener('click', () => {
                                    this.sendAction('useItem', { itemId: item.id });
                                });
                            }
                            
                            inventoryList.appendChild(itemElement);
                        });
                    }
                }
            });
        },
        
        // Mettre à jour l'interface pour le tour actuel
        updateTurnUI: function(isMyTurn) {
            // Activer/désactiver les boutons d'action
            document.getElementById('rollDice').disabled = !isMyTurn;
            document.getElementById('useSpell').disabled = !isMyTurn;
            document.getElementById('endTurn').disabled = !isMyTurn;
            
            // Mettre en évidence le joueur actuel
            const playerCards = document.querySelectorAll('.player-card');
            playerCards.forEach((card, index) => {
                if (index === game.currentPlayerIndex) {
                    card.classList.add('active-player');
                } else {
                    card.classList.remove('active-player');
                }
            });
            
            // Afficher un message si c'est mon tour
            if (isMyTurn) {
                game.addLogEntry('C\'est votre tour! Lancez le dé ou utilisez un objet.');
            }
        },
        
        // Envoyer une action au serveur
        sendAction: function(actionType, actionData) {
            if (!this.isActive || !this.socket) return false;
            
            const action = {
                type: actionType,
                playerId: this.playerId,
                ...actionData
            };
            
            this.socket.emit('gameAction', action);
            return true;
        },
        
        // Terminer le tour
        endTurn: function() {
            if (!this.isActive || !this.socket) return false;
            
            this.socket.emit('endTurn');
            return true;
        }
    },
    
    // Initialisation du jeu
    init: function() {
        console.log("Initialisation du jeu avec les joueurs suivants:", this.players);
        
        // S'assurer que tous les joueurs ont un numéro
        this.players.forEach((player, index) => {
            if (!player.playerNumber) {
                player.playerNumber = index + 1;
                console.log(`Numéro de joueur assigné à ${player.name}: ${player.playerNumber}`);
            }
        });
        
        this.createBoard();
        this.renderPlayers();
        this.setupEventListeners();
        this.addLogEntry("Bienvenue dans Charmed - Le Jeu! Cliquez sur 'Lancer le dé' pour commencer.");
        
        // Afficher un résumé des joueurs dans le journal
        this.addLogEntry(`Joueurs actifs: ${this.players.map(p => p.name).join(', ')}`);
    },
    
    // Création du plateau de jeu
    createBoard: function() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        // Créer 64 cases (8x8)
        for (let i = 0; i < 64; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            
            // Déterminer le type de case
            let cellType = 'normal';
            let itemType = null;
            
            // Ajouter quelques cases spéciales aléatoirement
            if (i % 7 === 0) {
                cellType = 'special';
                cell.classList.add('special-cell');
                cell.innerHTML = '<i class="fas fa-magic"></i>';
            } else if (i % 13 === 0) {
                cellType = 'demon';
                cell.classList.add('demon-cell');
                
                // Ajouter une image de démon aléatoire
                const demonIndex = Math.floor(Math.random() * this.demons.length);
                const demon = this.demons[demonIndex];
                cell.innerHTML = `<img src="${demon.image}" alt="${demon.name}" class="cell-image">`;
            } else if (i % 11 === 0) {
                cellType = 'trap';
                cell.classList.add('trap-cell');
                cell.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            } else if (i % 9 === 0) {
                // Ajouter des cases avec des objets à ramasser
                const randomItem = Math.floor(Math.random() * this.items.length);
                const item = this.items[randomItem];
                itemType = item.type;
                cellType = 'item';
                cell.classList.add('item-cell', `${item.type}-cell`);
                cell.dataset.itemId = item.id;
                cell.innerHTML = `<img src="${item.icon}" alt="${item.name}" class="cell-image">`;
            }
            
            gameBoard.appendChild(cell);
            this.board.push({
                index: i,
                type: cellType,
                itemType: itemType,
                itemId: cellType === 'item' ? parseInt(cell.dataset.itemId) : null
            });
        }
    },
    
    // Afficher les joueurs
    renderPlayers: function() {
        console.log("Rendu des joueurs actifs:", this.players);
        
        const playerInfo = document.getElementById('playerInfo');
        playerInfo.innerHTML = '';
        
        // Créer la carte de chaque joueur
        this.players.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${index === this.currentPlayerIndex ? 'current-player' : ''}`;
            playerCard.dataset.playerNumber = player.playerNumber || index + 1;
            playerCard.dataset.playerColor = player.color;
            
            // Ajouter une bannière "À VOUS DE JOUER" pour le joueur actif
            const activePlayerBanner = index === this.currentPlayerIndex ? 
                `<div class="active-player-banner">À VOUS DE JOUER</div>` : '';
            
            playerCard.innerHTML = `
                ${activePlayerBanner}
                <div class="player-header">
                    <div class="player-number">Joueur ${player.playerNumber || index + 1}</div>
                    <div class="player-name">${player.name}</div>
                </div>
                <div class="player-image">
                    <img src="${player.image}" alt="${player.name}">
                </div>
                <div class="player-power">${player.power}</div>
                <div class="player-status">
                    <div class="status-item">
                        <span class="status-value">${player.health}</span>
                        <span class="status-label">Santé</span>
                    </div>
                    <div class="status-item">
                        <span class="status-value">${player.mana}</span>
                        <span class="status-label">Mana</span>
                    </div>
                    <div class="status-item">
                        <span class="status-value">${player.position}</span>
                        <span class="status-label">Position</span>
                    </div>
                </div>
                <div class="inventory">
                    <div class="inventory-title">
                        <span>Inventaire</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="inventory-items">
                        ${player.inventory && player.inventory.length > 0 ? player.inventory.map(item => `
                            <div class="inventory-item">
                                <img src="${item.icon}" alt="${item.name}">
                                <div class="inventory-item-tooltip">
                                    <div class="tooltip-title">${item.name}</div>
                                    <div class="tooltip-description">${item.description}</div>
                                    <div class="tooltip-power">Puissance: ${item.power}</div>
                                </div>
                            </div>
                        `).join('') : '<p>Inventaire vide</p>'}
                    </div>
                </div>
            `;
            
            playerInfo.appendChild(playerCard);
        });
        
        // Placer les joueurs sur le plateau
        this.updatePlayerPositions();
    },
    
    // Mettre à jour la position des joueurs sur le plateau
    updatePlayerPositions: function() {
        console.log("Mise à jour des positions des joueurs:", this.players.map(p => ({
            name: p.name,
            position: p.position,
            number: p.playerNumber
        })));
        
        // Supprimer toutes les représentations de joueurs existantes
        document.querySelectorAll('.player').forEach(el => el.remove());
        
        // Ajouter les joueurs à leurs positions respectives
        this.players.forEach((player, index) => {
            if (player.position < 64) {
                const cell = document.querySelector(`.cell[data-index="${player.position}"]`);
                if (cell) {
                    const playerMarker = document.createElement('div');
                    playerMarker.className = `player ${player.color}`;
                    playerMarker.dataset.playerNumber = player.playerNumber || index + 1;
                    
                    // Ajouter une classe pour le joueur actif
                    if (index === this.currentPlayerIndex) {
                        playerMarker.classList.add('player-active');
                    }
                    
                    // Utiliser une image miniature pour le plateau avec le numéro du joueur
                    playerMarker.innerHTML = `
                        <img src="${player.image}" alt="${player.name}">
                        <span class="player-marker-number">${player.playerNumber || index + 1}</span>
                    `;
                    
                    cell.appendChild(playerMarker);
                } else {
                    console.warn(`Cellule non trouvée pour la position ${player.position} du joueur ${player.name}`);
                }
            } else {
                console.warn(`Position invalide pour ${player.name}: ${player.position}`);
            }
        });
    },
    
    // Configuration des écouteurs d'événements
    setupEventListeners: function() {
        document.getElementById('rollDice').addEventListener('click', () => this.rollDice());
        document.getElementById('useSpell').addEventListener('click', () => this.useSpell());
        document.getElementById('endTurn').addEventListener('click', () => this.nextTurn());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('modalConfirm').addEventListener('click', () => this.handleModalConfirm());
    },
    
    // Lancer le dé
    rollDice: function() {
        if (this.gameOver) return;
        
        this.diceValue = Math.floor(Math.random() * 6) + 1;
        this.addLogEntry(`${this.players[this.currentPlayerIndex].name} a lancé le dé et obtenu un ${this.diceValue}.`);
        
        // Ajouter une animation pour le dé
        const controls = document.querySelector('.controls');
        const diceEl = document.createElement('div');
        diceEl.className = 'dice';
        diceEl.innerHTML = `<i class="fas fa-dice-${this.getWordForNumber(this.diceValue)}"></i>`;
        controls.prepend(diceEl);
        
        setTimeout(() => {
            diceEl.remove();
            this.movePlayer();
        }, 1000);
        
        document.getElementById('rollDice').disabled = true;
        document.getElementById('useSpell').disabled = false;
        document.getElementById('endTurn').disabled = false;
    },
    
    // Convertir un nombre en mot pour les icônes de dé
    getWordForNumber: function(num) {
        const words = ['one', 'two', 'three', 'four', 'five', 'six'];
        return words[num - 1];
    },
    
    // Déplacer le joueur actuel
    movePlayer: function() {
        const player = this.players[this.currentPlayerIndex];
        
        // Mémoriser la position précédente
        const previousPosition = player.position;
        
        // Ajouter le nombre de dé au déplacement
        player.position += this.diceValue;
        
        // Vérifier si le joueur a atteint la fin du plateau
        if (player.position >= 63) {
            player.position = 63;
            this.gameOver = true;
            this.addLogEntry(`${player.name} a atteint la fin du plateau et gagné la partie!`);
            this.showModal('Victoire!', 'images/victory.jpg', `${player.name} a vaincu tous les démons et sauvé le monde!`);
            
            // Désactiver tous les boutons en cas de victoire
            document.getElementById('rollDice').disabled = true;
            document.getElementById('useSpell').disabled = true;
            document.getElementById('endTurn').disabled = true;
        } else {
            // Annoncer le mouvement
            this.addLogEntry(`${player.name} avance de la case ${previousPosition} à la case ${player.position}.`);
            
            // Vérifier si un événement se produit sur la nouvelle case
            this.checkCellEvent();
        }
        
        // Mettre à jour la position des joueurs sur le plateau
        this.updatePlayerPositions();
        
        // Mettre à jour l'affichage des joueurs
        this.renderPlayers();
        
        // Si le jeu n'est pas terminé et qu'aucun combat n'est en cours, activer le bouton de fin de tour
        if (!this.gameOver && (!this.combatState || !this.combatState.inProgress)) {
            document.getElementById('endTurn').disabled = false;
        }
    },
    
    // Vérifier si un événement se produit sur la case actuelle
    checkCellEvent: function() {
        const player = this.players[this.currentPlayerIndex];
        const cell = this.board[player.position];
        
        if (cell.type === 'special') {
            this.addLogEntry(`${player.name} a trouvé une source de pouvoir magique!`);
            player.mana += 20;
            this.renderPlayers();
            this.createMagicEffect(player.position);
        } else if (cell.type === 'demon') {
            this.addLogEntry(`${player.name} rencontre un démon!`);
            this.startCombat();
        } else if (cell.type === 'trap') {
            this.addLogEntry(`${player.name} est tombé dans un piège!`);
            player.health -= 10;
            this.renderPlayers();
        } else if (cell.type === 'item') {
            // Trouver l'objet correspondant
            const item = this.items.find(i => i.id === cell.itemId);
            if (item) {
                this.addLogEntry(`${player.name} a trouvé : ${item.name}!`);
                
                // Ajouter l'objet à l'inventaire du joueur
                player.inventory.push(item);
                
                // Effet visuel
                this.createFoundItemEffect(player.position, item);
                
                // Mettre à jour le plateau (l'objet a été pris)
                cell.type = 'normal';
                cell.itemId = null;
                const cellElement = document.querySelector(`.cell[data-index="${player.position}"]`);
                cellElement.className = 'cell';
                cellElement.innerHTML = '';
                
                this.renderPlayers();
            }
        }
        
        // Réactiver le bouton de fin de tour
        document.getElementById('endTurn').disabled = false;
        // Si le joueur n'est pas sur une case démon, réactiver le bouton de sort
        if (cell.type !== 'demon') {
            document.getElementById('useSpell').disabled = false;
        }
    },
    
    // Créer un effet magique visuel
    createMagicEffect: function(position) {
        const cell = document.querySelector(`.cell[data-index="${position}"]`);
        const rect = cell.getBoundingClientRect();
        const effects = document.getElementById('magicEffects');
        
        for (let i = 0; i < 10; i++) {
            const orb = document.createElement('div');
            orb.className = 'orb';
            orb.style.left = `${rect.left + Math.random() * rect.width}px`;
            orb.style.top = `${rect.top + Math.random() * rect.height}px`;
            orb.style.animationDelay = `${Math.random() * 2}s`;
            effects.appendChild(orb);
            
            setTimeout(() => orb.remove(), 3000);
        }
    },
    
    // Simuler un combat contre un démon
    startCombat: function() {
        // Désactiver tous les boutons pendant le combat
        document.getElementById('rollDice').disabled = true;
        document.getElementById('useSpell').disabled = true;
        document.getElementById('endTurn').disabled = true;
        
        // Sélectionner un démon aléatoire
        const demonIndex = Math.floor(Math.random() * this.demons.length);
        const demon = this.demons[demonIndex];
        
        // Copier le démon pour éviter de modifier l'original
        this.currentDemon = {
            id: demon.id,
            name: demon.name,
            power: demon.power,
            health: demon.health,
            description: demon.description,
            image: demon.image
        };
        
        const player = this.players[this.currentPlayerIndex];
        
        // Créer l'interface de combat
        this.showModal('Combat!', null, '');
        
        // Remplacer le contenu de la modale par l'interface de combat
        const modalContent = document.querySelector('.modal-content');
        if (!modalContent) {
            console.error("Élément .modal-content introuvable");
            return;
        }
        
        modalContent.innerHTML = `
            <span class="close-modal" id="closeModal">&times;</span>
            <h2>Combat contre ${this.currentDemon.name}</h2>
            
            <div class="combat-screen">
                <div class="combat-character combat-player">
                    <div class="combat-player-number">Joueur ${player.playerNumber || this.currentPlayerIndex + 1}</div>
                    <img src="${player.image}" alt="${player.name}" class="combat-image">
                    <div class="combat-name">${player.name}</div>
                    <div class="combat-stats">
                        <div class="combat-health">
                            <span id="player-health">${player.health}</span>
                            <span class="combat-label">Santé</span>
                        </div>
                        <div class="combat-power">
                            <span id="player-power">${player.mana}</span>
                            <span class="combat-label">Mana</span>
                        </div>
                    </div>
                </div>
                
                <div class="vs-symbol">VS</div>
                
                <div class="combat-character combat-demon">
                    <img src="${this.currentDemon.image}" alt="${this.currentDemon.name}" class="combat-image">
                    <div class="combat-name">${this.currentDemon.name}</div>
                    <div class="combat-stats">
                        <div class="combat-health">
                            <span id="demon-health">${this.currentDemon.health}</span>
                            <span class="combat-label">Santé</span>
                        </div>
                        <div class="combat-power">
                            <span id="demon-power">${this.currentDemon.power}</span>
                            <span class="combat-label">Pouvoir</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="combat-actions">
                <button class="combat-action" id="attack-action">Attaquer</button>
                <button class="combat-action" id="spell-action">Utiliser un sort</button>
                <button class="combat-action" id="potion-action">Utiliser une potion</button>
                <button class="combat-action" id="flee-action">Fuir</button>
            </div>
            
            <div class="combat-log" id="combat-log">
                <p>Le combat commence...</p>
            </div>
        `;
        
        // Stocker les références pour le combat
        this.combatState = {
            demon: this.currentDemon,
            round: 0,
            inProgress: true
        };
        
        // Ajouter les écouteurs d'événements pour les actions de combat
        // Utiliser des fonctions nommées pour pouvoir les supprimer plus tard
        const closeModalHandler = () => {
            if (confirm('Êtes-vous sûr de vouloir quitter le combat ? Vous perdrez tous vos progrès dans ce combat.')) {
                this.endCombat(false);
                // Réactiver le bouton de fin de tour
                document.getElementById('endTurn').disabled = false;
            }
        };
        
        const attackHandler = () => this.performCombatAction('attack');
        const spellHandler = () => this.performCombatAction('spell');
        const potionHandler = () => this.performCombatAction('potion');
        const fleeHandler = () => this.tryToFlee();
        
        // Stocker les gestionnaires dans l'objet combatState pour pouvoir les nettoyer
        this.combatState.handlers = {
            closeModal: closeModalHandler,
            attack: attackHandler,
            spell: spellHandler,
            potion: potionHandler,
            flee: fleeHandler
        };
        
        const closeModalBtn = document.getElementById('closeModal');
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModalHandler);
        
        const attackBtn = document.getElementById('attack-action');
        if (attackBtn) attackBtn.addEventListener('click', attackHandler);
        
        const spellBtn = document.getElementById('spell-action');
        if (spellBtn) spellBtn.addEventListener('click', spellHandler);
        
        const potionBtn = document.getElementById('potion-action');
        if (potionBtn) potionBtn.addEventListener('click', potionHandler);
        
        const fleeBtn = document.getElementById('flee-action');
        if (fleeBtn) fleeBtn.addEventListener('click', fleeHandler);
    },
    
    // Effectuer une action de combat
    performCombatAction: function(actionType) {
        if (!this.combatState || !this.combatState.inProgress) return;

        const player = this.players[this.currentPlayerIndex];
        const demon = this.combatState.demon;
        const combatLog = document.getElementById('combat-log');
        if (!combatLog) {
            console.error("Élément #combat-log introuvable");
            return;
        }
        
        let playerDamage = 0;
        let demonDamage = 0;
        let logMessage = '';

        this.combatState.round++;

        // Action du joueur
        switch(actionType) {
            case 'attack':
                playerDamage = Math.floor(Math.random() * 10) + 5;
                logMessage = `${player.name} attaque ${demon.name} et inflige ${playerDamage} points de dégâts.`;
                break;

            case 'spell':
                if (player.mana >= 10) {
                    playerDamage = Math.floor(Math.random() * 15) + 10;
                    player.mana -= 10;
                    logMessage = `${player.name} lance un sort sur ${demon.name} et inflige ${playerDamage} points de dégâts.`;
                    
                    const playerPowerElement = document.getElementById('player-power');
                    if (playerPowerElement) {
                        playerPowerElement.textContent = player.mana;
                    }
                } else {
                    logMessage = `${player.name} n'a pas assez de mana pour lancer un sort.`;
                    combatLog.innerHTML += `<p>${logMessage}</p>`;
                    combatLog.scrollTop = combatLog.scrollHeight;
                    return;
                }
                break;

            case 'potion':
                // Utiliser une potion si disponible
                const potions = player.inventory.filter(item => item.type === 'potion');
                if (potions.length > 0) {
                    const potion = potions[0];
                    player.inventory.splice(player.inventory.indexOf(potion), 1);
                    
                    if (potion.name.includes('Guérison')) {
                        player.health += potion.power;
                        logMessage = `${player.name} utilise une ${potion.name} et récupère ${potion.power} points de vie.`;
                        const playerHealthElement = document.getElementById('player-health');
                        if (playerHealthElement) {
                            playerHealthElement.textContent = player.health;
                        }
                    } else {
                        player.mana += potion.power;
                        logMessage = `${player.name} utilise une ${potion.name} et récupère ${potion.power} points de mana.`;
                        const playerPowerElement = document.getElementById('player-power');
                        if (playerPowerElement) {
                            playerPowerElement.textContent = player.mana;
                        }
                    }
                } else {
                    logMessage = `${player.name} n'a pas de potion à utiliser.`;
                    combatLog.innerHTML += `<p>${logMessage}</p>`;
                    combatLog.scrollTop = combatLog.scrollHeight;
                    return;
                }
                break;
            
            default:
                console.error("Action de combat inconnue:", actionType);
                return;
        }

        // Appliquer les dégâts au démon
        if (playerDamage > 0) {
            demon.health -= playerDamage;
            const demonHealthElement = document.getElementById('demon-health');
            if (demonHealthElement) {
                demonHealthElement.textContent = demon.health;
            }
        }

        // Ajouter le message dans le log
        combatLog.innerHTML += `<p>${logMessage}</p>`;
        combatLog.scrollTop = combatLog.scrollHeight;

        // Vérifier si le démon est vaincu
        if (demon.health <= 0) {
            this.winCombat();
            return;
        }

        // Action du démon (après un court délai)
        setTimeout(() => {
            // Vérifier que le combat est toujours en cours
            if (!this.combatState || !this.combatState.inProgress) return;
            
            demonDamage = Math.floor(Math.random() * demon.power / 2) + 5;
            player.health -= demonDamage;
            
            const playerHealthElement = document.getElementById('player-health');
            if (playerHealthElement) {
                playerHealthElement.textContent = player.health;
            }
            
            // Vérifier que le log de combat existe toujours
            const currentCombatLog = document.getElementById('combat-log');
            if (currentCombatLog) {
                const demonMessage = `${demon.name} attaque ${player.name} et inflige ${demonDamage} points de dégâts.`;
                currentCombatLog.innerHTML += `<p>${demonMessage}</p>`;
                currentCombatLog.scrollTop = currentCombatLog.scrollHeight;
            }

            // Vérifier si le joueur est vaincu
            if (player.health <= 0) {
                this.loseCombat();
            }
        }, 1000);
    },
    
    // Essayer de fuir le combat
    tryToFlee: function() {
        if (!this.combatState || !this.combatState.inProgress) return;
        
        const combatLog = document.getElementById('combat-log');
        if (!combatLog) return;
        
        const player = this.players[this.currentPlayerIndex];
        
        // 50% de chance de réussir
        if (Math.random() > 0.5) {
            combatLog.innerHTML += `<p>${player.name} s'enfuit du combat!</p>`;
            combatLog.scrollTop = combatLog.scrollHeight;
            
            // Fermer le modal de combat après un court délai
            setTimeout(() => {
                if (this.combatState) {
                    this.endCombat(true);
                    this.resetTurnButtons();
                }
            }, 1000);
        } else {
            combatLog.innerHTML += `<p>${player.name} essaie de s'enfuir mais échoue!</p>`;
            combatLog.scrollTop = combatLog.scrollHeight;

            // Le démon attaque
            setTimeout(() => {
                if (!this.combatState || !this.combatState.inProgress) return;
                
                const demon = this.combatState.demon;
                const demonDamage = Math.floor(Math.random() * demon.power / 2) + 5;

                player.health -= demonDamage;
                const playerHealthElement = document.getElementById('player-health');
                if (playerHealthElement) {
                    playerHealthElement.textContent = player.health;
                }
                
                if (combatLog) {
                    const logMessage = `${demon.name} attaque ${player.name} et inflige ${demonDamage} points de dégâts.`;
                    combatLog.innerHTML += `<p>${logMessage}</p>`;
                    combatLog.scrollTop = combatLog.scrollHeight;
                }

                // Vérifier si le joueur est vaincu
                if (player.health <= 0) {
                    this.loseCombat();
                }
            }, 500);
        }
    },
    
    // Gagner le combat
    winCombat: function() {
        const player = this.players[this.currentPlayerIndex];
        const demon = this.combatState.demon;
        const combatLog = document.getElementById('combat-log');
        
        this.combatState.inProgress = false;
        
        // Récompenses
        const manaGain = Math.floor(Math.random() * 15) + 10;
        player.mana += manaGain;
        
        // Obtenir un objet aléatoire
        if (Math.random() > 0.5) {
            const randomItem = Math.floor(Math.random() * this.items.length);
            const item = this.items[randomItem];
            player.inventory.push(item);
            
            combatLog.innerHTML += `
                <p class="victory-message">${player.name} a vaincu ${demon.name}!</p>
                <p>+${manaGain} points de mana</p>
                <p>Objet obtenu: ${item.name}</p>
            `;
        } else {
            combatLog.innerHTML += `
                <p class="victory-message">${player.name} a vaincu ${demon.name}!</p>
                <p>+${manaGain} points de mana</p>
            `;
        }
        
        combatLog.scrollTop = combatLog.scrollHeight;
        
        // Créer un gestionnaire pour le bouton de fin de combat
        const endCombatHandler = () => {
            this.endCombat(true);
            this.resetTurnButtons();
        };
        
        // Stocker le gestionnaire dans combatState pour pouvoir le nettoyer plus tard
        this.combatState.endCombatHandler = endCombatHandler;
        
        // Ajouter un bouton pour fermer le modal
        const combatActions = document.querySelector('.combat-actions');
        if (combatActions) {
            combatActions.innerHTML = `<button class="combat-action" id="end-combat">Continuer</button>`;
            const endCombatBtn = document.getElementById('end-combat');
            if (endCombatBtn) {
                endCombatBtn.addEventListener('click', endCombatHandler);
            }
        }
    },
    
    // Perdre le combat
    loseCombat: function() {
        const player = this.players[this.currentPlayerIndex];
        const combatLog = document.getElementById('combat-log');
        
        this.combatState.inProgress = false;
        
        // Conséquences
        player.health = 10; // Empêcher de mourir complètement
        
        // Perdre un objet aléatoire
        let lostItemMessage = "";
        if (player.inventory.length > 0) {
            const randomIndex = Math.floor(Math.random() * player.inventory.length);
            const lostItem = player.inventory[randomIndex];
            player.inventory.splice(randomIndex, 1);
            lostItemMessage = `<p>Objet perdu: ${lostItem.name}</p>`;
        }
        
        combatLog.innerHTML += `
            <p class="defeat-message">${player.name} a été vaincu!</p>
            <p>Santé réduite à ${player.health}</p>
            ${lostItemMessage}
        `;
        
        combatLog.scrollTop = combatLog.scrollHeight;
        
        // Créer un gestionnaire pour le bouton de fin de combat
        const endCombatHandler = () => {
            this.endCombat(true);
            this.resetTurnButtons();
        };
        
        // Stocker le gestionnaire dans combatState pour pouvoir le nettoyer plus tard
        this.combatState.endCombatHandler = endCombatHandler;
        
        // Ajouter un bouton pour fermer le modal
        const combatActions = document.querySelector('.combat-actions');
        if (combatActions) {
            combatActions.innerHTML = `<button class="combat-action" id="end-combat">Continuer</button>`;
            const endCombatBtn = document.getElementById('end-combat');
            if (endCombatBtn) {
                endCombatBtn.addEventListener('click', endCombatHandler);
            }
        }
    },
    
    // Terminer le combat
    endCombat: function(updateStats) {
        // Supprimer les écouteurs d'événements du combat
        if (this.combatState && this.combatState.handlers) {
            const { closeModal, attack, spell, potion, flee } = this.combatState.handlers;
            
            const closeModalBtn = document.getElementById('closeModal');
            if (closeModalBtn) closeModalBtn.removeEventListener('click', closeModal);
            
            const attackBtn = document.getElementById('attack-action');
            if (attackBtn) attackBtn.removeEventListener('click', attack);
            
            const spellBtn = document.getElementById('spell-action');
            if (spellBtn) spellBtn.removeEventListener('click', spell);
            
            const potionBtn = document.getElementById('potion-action');
            if (potionBtn) potionBtn.removeEventListener('click', potion);
            
            const fleeBtn = document.getElementById('flee-action');
            if (fleeBtn) fleeBtn.removeEventListener('click', flee);
            
            // Nettoyer aussi l'écouteur du bouton de fin de combat s'il existe
            const endCombatBtn = document.getElementById('end-combat');
            if (endCombatBtn) {
                endCombatBtn.removeEventListener('click', this.combatState.endCombatHandler);
            }
        }
        
        // Réinitialiser l'état du combat
        this.combatState = null;
        
        // Fermer la modale
        this.closeModal();
        
        if (updateStats) {
            // Mettre à jour l'affichage des joueurs
            this.updateUI();
            
            // Réactiver les boutons de tour
            this.resetTurnButtons();
        }
    },
    
    // Réinitialiser les boutons de tour
    resetTurnButtons: function() {
        // Activer le bouton pour lancer le dé, désactiver les autres
        document.getElementById('rollDice').disabled = false;
        document.getElementById('useSpell').disabled = true;
        document.getElementById('endTurn').disabled = false;
    },
    
    // Utiliser un sort (bonus)
    useSpell: function() {
        const player = this.players[this.currentPlayerIndex];
        if (player.mana >= 15) {
            player.mana -= 15;
            
            // Sort aléatoire
            const spells = [
                { name: "Téléportation", effect: "se téléporte de 3 cases en avant" },
                { name: "Bouclier", effect: "récupère 15 points de vie" },
                { name: "Vision", effect: "peut voir les 5 prochaines cases" }
            ];
            
            const spell = spells[Math.floor(Math.random() * spells.length)];
            
            if (spell.name === "Téléportation") {
                player.position += 3;
                if (player.position >= 63) {
                    player.position = 63;
                    this.gameOver = true;
                }
                this.updatePlayerPositions();
            } else if (spell.name === "Bouclier") {
                player.health += 15;
                if (player.health > 100) player.health = 100;
            }
            
            this.addLogEntry(`${player.name} utilise le sort ${spell.name} et ${spell.effect}.`);
            this.renderPlayers();
            document.getElementById('useSpell').disabled = true;
        } else {
            this.addLogEntry(`${player.name} n'a pas assez de mana pour lancer un sort.`);
        }
    },
    
    // Passer au joueur suivant
    nextTurn: function() {
        // Supprimer tout indicateur miniature existant
        document.querySelectorAll('.mini-turn-indicator').forEach(el => el.remove());
        
        // Passer au joueur suivant dans le tableau des joueurs
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        
        // Annoncer le changement de tour
        this.addLogEntry(`C'est au tour de ${this.players[this.currentPlayerIndex].name}.`);
        
        // Mettre en surbrillance le joueur actif
        this.renderPlayers();
        
        // Afficher un indicateur visuel de changement de tour
        this.showTurnIndicator();
        
        // Réinitialiser les boutons pour le nouveau tour
        document.getElementById('rollDice').disabled = false;
        document.getElementById('useSpell').disabled = true;
        document.getElementById('endTurn').disabled = true;
    },
    
    // Afficher un indicateur visuel de changement de tour
    showTurnIndicator: function() {
        if (this.currentPlayerIndex < 0 || this.currentPlayerIndex >= this.players.length) {
            console.error("Index de joueur invalide:", this.currentPlayerIndex);
            return;
        }
        
        const player = this.players[this.currentPlayerIndex];
        if (!player) {
            console.error("Joueur non trouvé à l'index:", this.currentPlayerIndex);
            return;
        }
        
        console.log("Affichage de l'indicateur de tour pour:", player.name, "numéro:", player.playerNumber);
        
        // Supprimer tout indicateur de tour précédent
        const oldIndicator = document.querySelector('.turn-indicator');
        if (oldIndicator) {
            oldIndicator.remove();
        }
        
        // Créer un indicateur plus visible
        const indicator = document.createElement('div');
        indicator.className = 'turn-indicator';
        indicator.innerHTML = `
            <div class="turn-indicator-content">
                <div class="turn-player-image">
                    <img src="${player.image}" alt="${player.name}">
                </div>
                <div class="turn-player-info">
                    <div class="turn-player-number">Joueur ${player.playerNumber || this.currentPlayerIndex + 1}</div>
                    <div class="turn-player-name">${player.name}</div>
                    <div class="turn-message">C'EST À VOTRE TOUR DE JOUER !</div>
                </div>
            </div>
        `;
        indicator.style.backgroundColor = `var(--${player.color}-color, #9b59b6)`;
        
        document.body.appendChild(indicator);
        
        // Animation avec une durée plus longue
        setTimeout(() => {
            indicator.classList.add('active');
            
            // L'indicateur reste visible plus longtemps (5 secondes)
            setTimeout(() => {
                indicator.classList.add('minimize');
                // Ne pas supprimer complètement, mais minimiser
                setTimeout(() => {
                    // Créer une version miniature persistante de l'indicateur
                    const miniIndicator = document.createElement('div');
                    miniIndicator.className = 'mini-turn-indicator';
                    miniIndicator.innerHTML = `
                        <img src="${player.image}" alt="${player.name}">
                        <span>Tour de Joueur ${player.playerNumber || this.currentPlayerIndex + 1}</span>
                    `;
                    miniIndicator.style.backgroundColor = `var(--${player.color}-color, #9b59b6)`;
                    
                    // Remplacer l'ancien indicateur
                    indicator.remove();
                    document.body.appendChild(miniIndicator);
                    
                    // L'indicateur miniature disparaîtra au prochain tour
                }, 500);
            }, 5000);
        }, 10);
    },
    
    // Ajouter une entrée au journal
    addLogEntry: function(text) {
        const gameLog = document.getElementById('gameLog');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <span class="log-icon"><i class="fas fa-scroll"></i></span>
            <span class="log-text">${text}</span>
        `;
        gameLog.appendChild(entry);
        gameLog.scrollTop = gameLog.scrollHeight;
    },
    
    // Afficher une fenêtre modale
    showModal: function(title, image, content) {
        const modal = document.getElementById('eventModal');
        if (!modal) {
            console.error("Élément #eventModal introuvable");
            return;
        }
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) {
            modalTitle.textContent = title || '';
        }
        
        const modalImage = document.getElementById('modalImage');
        if (modalImage) {
            if (image) {
                modalImage.src = image;
                modalImage.style.display = 'block';
            } else {
                modalImage.style.display = 'none';
            }
        }
        
        const modalContent = document.getElementById('modalContent');
        if (modalContent) {
            modalContent.innerHTML = content || '';
        }
        
        // Afficher les boutons appropriés
        const modalConfirm = document.getElementById('modalConfirm');
        if (modalConfirm) {
            modalConfirm.style.display = 'inline-block';
        }
        
        const modalCancel = document.getElementById('modalCancel');
        if (modalCancel) {
            modalCancel.style.display = 'none';
        }
        
        modal.style.display = 'flex';
    },
    
    // Fermer la fenêtre modale
    closeModal: function() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Gérer la confirmation dans la fenêtre modale
    handleModalConfirm: function() {
        this.closeModal();
    },
    
    // Créer un effet quand un joueur trouve un objet
    createFoundItemEffect: function(position, item) {
        const cell = document.querySelector(`.cell[data-index="${position}"]`);
        
        // Créer l'élément d'effet
        const effectElement = document.createElement('div');
        effectElement.className = 'item-found-effect';
        effectElement.innerHTML = `
            <img src="${item.icon}" alt="${item.name}">
            <span>${item.name}</span>
        `;

        // Ajouter au DOM
        document.body.appendChild(effectElement);

        // Positionner l'élément au-dessus de la case
        const cellRect = cell.getBoundingClientRect();
        effectElement.style.left = `${cellRect.left + cellRect.width/2}px`;
        effectElement.style.top = `${cellRect.top}px`;
        
        // Animer et supprimer
        setTimeout(() => {
            effectElement.classList.add('fade-out');
            setTimeout(() => {
                effectElement.remove();
            }, 1000);
        }, 1500);
    }
};

// Initialiser le jeu
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si on est en mode en ligne
    const isOnline = game.onlineMode.init();
    
    // Si on n'est pas en mode en ligne, initialiser normalement
    if (!isOnline) {
        game.init();
    }
    
    // Gérer le lancer de dé
    document.getElementById('rollDice').addEventListener('click', function() {
        if (game.onlineMode.isActive) {
            // Mode en ligne - envoyer l'action au serveur
            game.onlineMode.sendAction('rollDice', {});
        } else {
            // Mode local - traiter l'action localement
            game.rollDice();
        }
    });
    
    // Gérer la fin du tour
    document.getElementById('endTurn').addEventListener('click', function() {
        if (game.onlineMode.isActive) {
            // Mode en ligne - envoyer l'action au serveur
            game.onlineMode.endTurn();
        } else {
            // Mode local - traiter l'action localement
            game.endTurn();
        }
    });
    
    // Gérer l'utilisation d'un sort
    document.getElementById('useSpell').addEventListener('click', function() {
        if (game.onlineMode.isActive) {
            // Mode en ligne - envoyer l'action au serveur
            game.onlineMode.sendAction('useSpell', {});
        } else {
            // Mode local - traiter l'action localement
            game.useSpell();
        }
    });
});