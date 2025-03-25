// Module de gestion du jeu en ligne
const onlineGame = {
    socket: null,
    gameId: null,
    playerId: null,
    playerName: '',
    players: [],
    isHost: false,
    
    // Initialiser la connexion socket
    init: function() {
        // Établir la connexion avec le serveur Socket.io
        this.socket = io();
        
        // Gestionnaires d'événements pour le socket
        this.setupSocketListeners();
        
        // Gestionnaires d'événements pour l'interface
        this.setupUIListeners();
    },
    
    // Configurer les écouteurs d'événements pour le socket
    setupSocketListeners: function() {
        // Connexion établie avec le serveur
        this.socket.on('connect', () => {
            console.log('Connecté au serveur');
        });
        
        // Partie créée avec succès
        this.socket.on('gameCreated', (data) => {
            this.gameId = data.gameId;
            this.playerId = data.playerId;
            this.isHost = true;
            
            // Mettre à jour l'interface
            document.getElementById('game-code-display').textContent = this.gameId;
            this.updatePlayersList(data.game.players);
            
            // Afficher la salle d'attente et le sélecteur de personnages
            document.getElementById('online-modal').style.display = 'none';
            document.getElementById('waiting-room-modal').style.display = 'block';
            
            // Initialiser la liste des personnages disponibles
            this.renderCharacterSelection();
        });
        
        // Un joueur a rejoint la partie
        this.socket.on('playerJoined', (data) => {
            console.log(`${data.player.name} a rejoint la partie`);
            
            // Mettre à jour la liste des joueurs
            this.updatePlayersList(data.game.players);
            
            // Activer le bouton de démarrage si c'est l'hôte et qu'il y a au moins 2 joueurs
            if (this.isHost && data.game.players.length >= 2) {
                document.getElementById('start-online-game').disabled = false;
            }
        });
        
        // Un joueur a quitté la partie
        this.socket.on('playerLeft', (data) => {
            console.log(`Un joueur a quitté la partie`);
            
            // Mettre à jour la liste des joueurs
            this.updatePlayersList(data.game.players);
            
            // Désactiver le bouton de démarrage s'il n'y a plus assez de joueurs
            if (this.isHost && data.game.players.length < 2) {
                document.getElementById('start-online-game').disabled = true;
            }
        });
        
        // Sélection de personnage confirmée
        this.socket.on('characterSelected', (data) => {
            console.log(`${data.playerId} a choisi ${data.character}`);
            this.updatePlayersList(data.game.players);
            
            // Actualiser la liste des personnages disponibles
            this.updateAvailableCharacters();
        });
        
        // La partie commence
        this.socket.on('gameStarted', (data) => {
            console.log('La partie commence!');
            
            // Stocker l'état du jeu
            localStorage.setItem('onlineGame', JSON.stringify({
                gameId: this.gameId,
                playerId: this.playerId,
                playerName: this.playerName,
                isHost: this.isHost
            }));
            
            // Rediriger vers la page du jeu avec le mode en ligne
            window.location.href = `game.html?mode=online&gameId=${this.gameId}`;
        });
        
        // Erreur
        this.socket.on('error', (data) => {
            alert(`Erreur: ${data.message}`);
        });
    },
    
    // Configurer les écouteurs d'événements pour l'interface
    setupUIListeners: function() {
        // Ouvrir la modal pour jouer en ligne
        document.getElementById('online-game').addEventListener('click', () => {
            document.getElementById('online-modal').style.display = 'block';
        });
        
        // Fermer la modal
        document.getElementById('closeOnlineModal').addEventListener('click', () => {
            document.getElementById('online-modal').style.display = 'none';
        });
        
        // Créer une partie
        document.getElementById('createGameBtn').addEventListener('click', () => {
            const playerName = document.getElementById('playerName').value.trim();
            if (playerName) {
                this.playerName = playerName;
                this.socket.emit('createGame', playerName);
            } else {
                alert('Veuillez entrer votre nom');
            }
        });
        
        // Rejoindre une partie
        document.getElementById('joinGameBtn').addEventListener('click', () => {
            const gameId = document.getElementById('gameCode').value.trim().toUpperCase();
            const playerName = document.getElementById('joinPlayerName').value.trim();
            
            if (gameId && playerName) {
                this.playerName = playerName;
                this.gameId = gameId;
                this.socket.emit('joinGame', {gameId, playerName});
                
                // Attendre confirmation du serveur avant de passer à l'écran d'attente
                this.socket.once('playerJoined', (data) => {
                    if (data.player.id === this.socket.id) {
                        // Je suis celui qui vient de rejoindre
                        document.getElementById('game-code-display').textContent = this.gameId;
                        this.updatePlayersList(data.game.players);
                        
                        document.getElementById('online-modal').style.display = 'none';
                        document.getElementById('waiting-room-modal').style.display = 'block';
                        
                        // Initialiser la liste des personnages disponibles
                        this.renderCharacterSelection();
                    }
                });
            } else {
                alert('Veuillez remplir tous les champs');
            }
        });
        
        // Démarrer la partie en ligne
        document.getElementById('start-online-game').addEventListener('click', () => {
            if (this.isHost) {
                // Vérifier si tous les joueurs ont choisi un personnage
                const allSelected = this.players.every(player => player.character);
                
                if (!allSelected) {
                    alert('Tous les joueurs doivent choisir un personnage avant de commencer');
                    return;
                }
                
                this.socket.emit('startGame');
            }
        });
        
        // Annuler la partie en ligne
        document.getElementById('cancel-online-game').addEventListener('click', () => {
            if (confirm('Êtes-vous sûr de vouloir quitter la partie?')) {
                window.location.reload();
            }
        });
    },
    
    // Mettre à jour la liste des joueurs dans l'interface
    updatePlayersList: function(players) {
        this.players = players;
        const playersList = document.getElementById('connected-players');
        playersList.innerHTML = '';
        
        players.forEach(player => {
            const li = document.createElement('li');
            li.style.padding = '8px';
            li.style.margin = '5px 0';
            li.style.background = 'rgba(30, 30, 30, 0.7)';
            li.style.borderRadius = '5px';
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            
            // Icône selon le statut (hôte, prêt, etc.)
            const icon = player.id === this.socket.id ? '👑 ' : '👤 ';
            
            // Nom du joueur et personnage choisi
            const characterInfo = player.character ? ` - ${player.character}` : ' - <span style="color:#dd7777">Pas de personnage sélectionné</span>';
            li.innerHTML = `<span style="margin-right: 10px;">${icon}</span> ${player.name}${characterInfo}`;
            
            playersList.appendChild(li);
        });
        
        // Vérifier si tous les joueurs ont choisi un personnage
        const allSelected = this.players.every(player => player.character);
        
        // Si c'est l'hôte, activer/désactiver le bouton de démarrage
        if (this.isHost) {
            document.getElementById('start-online-game').disabled = !allSelected || this.players.length < 2;
        }
    },
    
    // Rendre la sélection de personnages
    renderCharacterSelection: function() {
        // Vérifier si la section de sélection existe déjà
        let characterSelectionDiv = document.getElementById('character-selection-online');
        
        if (!characterSelectionDiv) {
            // Créer la section de sélection de personnages
            characterSelectionDiv = document.createElement('div');
            characterSelectionDiv.id = 'character-selection-online';
            characterSelectionDiv.className = 'character-selection-online';
            characterSelectionDiv.innerHTML = `
                <h3>Choisissez votre personnage</h3>
                <div class="characters-grid" id="characters-grid-online"></div>
            `;
            
            // Insérer après la liste des joueurs
            const playersList = document.getElementById('players-list');
            playersList.parentNode.insertBefore(characterSelectionDiv, playersList.nextSibling);
        }
        
        // Charger les personnages disponibles
        this.updateAvailableCharacters();
    },
    
    // Mettre à jour les personnages disponibles
    updateAvailableCharacters: function() {
        // Liste des personnages du jeu (exactement comme dans game.js)
        const characters = [
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
        ];
        
        // Obtenir les personnages déjà sélectionnés
        const selectedCharacters = this.players
            .filter(player => player.character)
            .map(player => player.character);
        
        // Récupérer le grid des personnages
        const charactersGrid = document.getElementById('characters-grid-online');
        if (!charactersGrid) return;
        
        // Vider le grid
        charactersGrid.innerHTML = '';
        
        // Ajouter chaque personnage disponible au grid
        characters.forEach(character => {
            const isSelected = selectedCharacters.includes(character.name);
            const isMyCharacter = this.players.find(p => p.id === this.socket.id && p.character === character.name);
            
            const characterCard = document.createElement('div');
            characterCard.className = `character ${isSelected ? 'selected' : ''} ${isMyCharacter ? 'my-character' : ''}`;
            characterCard.dataset.name = character.name;
            
            // Ajouter un symbole pour indiquer qui a sélectionné ce personnage
            let selectedBy = '';
            if (isSelected) {
                const player = this.players.find(p => p.character === character.name);
                selectedBy = player ? `<div class="selected-by">${player.name}</div>` : '';
            }
            
            // Afficher les statistiques et le pouvoir comme dans le mode local
            characterCard.innerHTML = `
                <div class="character-image">
                    <img src="${character.image}" alt="${character.name}">
                    ${selectedBy}
                </div>
                <div class="character-name">${character.name}</div>
                <div class="character-stats">
                    <div class="stat">
                        <span class="stat-label">Santé:</span>
                        <span class="stat-value">${character.health}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Mana:</span>
                        <span class="stat-value">${character.mana}</span>
                    </div>
                </div>
                <div class="character-power">${character.power}</div>
            `;
            
            // Si le personnage n'est pas déjà sélectionné par quelqu'un d'autre, permettre la sélection
            if (!isSelected || isMyCharacter) {
                characterCard.addEventListener('click', () => {
                    this.selectCharacter(character.name);
                });
            } else {
                characterCard.classList.add('unavailable');
            }
            
            charactersGrid.appendChild(characterCard);
        });
    },
    
    // Sélectionner un personnage (amélioré)
    selectCharacter: function(characterName) {
        // Vérifier si c'est un nouveau choix ou un changement
        const myPlayer = this.players.find(p => p.id === this.socket.id);
        const previousCharacter = myPlayer ? myPlayer.character : null;
        
        // Si c'est le même personnage qu'avant, ne rien faire
        if (previousCharacter === characterName) return;
        
        // Émettez l'événement pour informer le serveur de la sélection
        this.socket.emit('selectCharacter', characterName);
        
        // Mise à jour locale (à confirmer par le serveur)
        const characterCards = document.querySelectorAll('.character');
        
        // Supprimer la sélection précédente si elle existe
        if (previousCharacter) {
            const prevCard = document.querySelector(`.character[data-name="${previousCharacter}"]`);
            if (prevCard) {
                prevCard.classList.remove('selected', 'my-character');
                // Supprimer l'indicateur de sélection
                const selectedBy = prevCard.querySelector('.selected-by');
                if (selectedBy) selectedBy.remove();
            }
        }
        
        // Ajouter la nouvelle sélection
        const newCard = document.querySelector(`.character[data-name="${characterName}"]`);
        if (newCard) {
            newCard.classList.add('selected', 'my-character');
            
            // Ajouter un indicateur montrant que c'est vous qui avez sélectionné ce personnage
            const selectedBy = document.createElement('div');
            selectedBy.className = 'selected-by';
            selectedBy.textContent = this.playerName + ' (Vous)';
            newCard.querySelector('.character-image').appendChild(selectedBy);
        }
    }
};

// Initialiser le jeu en ligne quand le document est chargé
document.addEventListener('DOMContentLoaded', function() {
    // Charger la librairie Socket.io
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = function() {
        // Initialiser le module de jeu en ligne
        onlineGame.init();
    };
    document.head.appendChild(script);
    
    // Ajouter des styles pour la sélection de personnages
    const style = document.createElement('style');
    style.textContent = `
        .character-selection-online {
            margin: 20px 0;
            text-align: center;
        }
        
        .characters-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            margin-top: 15px;
        }
        
        .character-card {
            width: 80px;
            border: 2px solid #444;
            border-radius: 8px;
            padding: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        }
        
        .character-card:hover:not(.disabled) {
            transform: translateY(-5px);
            border-color: crimson;
            box-shadow: 0 0 15px rgba(220, 20, 60, 0.5);
        }
        
        .character-card.selected {
            border-color: #5a9;
            box-shadow: 0 0 15px rgba(80, 170, 150, 0.5);
        }
        
        .character-card.my-selection {
            border-color: crimson;
            box-shadow: 0 0 15px rgba(220, 20, 60, 0.7);
        }
        
        .character-card.disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .character-card img {
            width: 100%;
            height: 100px;
            object-fit: cover;
            border-radius: 5px;
        }
        
        .character-name {
            margin-top: 5px;
            font-size: 0.8rem;
            color: #fff;
        }
        
        .taken-badge {
            position: absolute;
            top: 0;
            right: 0;
            background: rgba(220, 20, 60, 0.8);
            color: white;
            font-size: 0.7rem;
            padding: 2px 5px;
            border-radius: 0 0 0 5px;
        }
    `;
    document.head.appendChild(style);
});

// Mettre à jour l'interface utilisateur avec le nouvel état du jeu
function handleGameStateUpdate(gameState) {
    console.log("Mise à jour de l'état du jeu:", gameState);
    
    // Stocker l'état du jeu
    currentGameState = gameState;
    
    // Mettre à jour le plateau et les positions des joueurs
    updateBoardUI(gameState.board);
    updatePlayerPositions(gameState.playerStates);
    
    // Mettre à jour les informations des joueurs
    updatePlayerStats(gameState.playerStates);
    
    // Mettre à jour les informations du joueur actuel
    updateCurrentPlayerInfo(gameState);
    
    // Gérer les combats et autres situations spéciales
    handleSpecialGameStates(gameState);
    
    // Activer/désactiver les contrôles selon que c'est le tour du joueur ou non
    togglePlayerControls(gameState);
}

// Mettre à jour l'interface du plateau
function updateBoardUI(board) {
    if (!board) return;
    
    const gameBoard = document.getElementById('game-board');
    
    // Si le plateau n'est pas déjà créé, le créer
    if (gameBoard.children.length === 0) {
        for (let i = 0; i < board.length; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            
            // Ajouter un contenu visuel selon le type de case
            let cellContent = '';
            if (board[i].type === 'special') {
                cellContent = '<i class="fas fa-magic"></i>';
            } else if (board[i].type === 'demon') {
                cellContent = '<i class="fas fa-skull"></i>';
            } else if (board[i].type === 'trap') {
                cellContent = '<i class="fas fa-exclamation-triangle"></i>';
            } else if (board[i].type === 'item') {
                cellContent = '<i class="fas fa-gift"></i>';
            }
            
            cell.innerHTML = `<span class="cell-number">${i}</span>${cellContent}`;
            gameBoard.appendChild(cell);
        }
    } else {
        // Mettre à jour les icônes des cases si nécessaire
        for (let i = 0; i < board.length; i++) {
            const cell = gameBoard.children[i];
            const cellNumberSpan = cell.querySelector('.cell-number');
            
            // Recréer le contenu de la cellule
            let cellContent = '';
            if (board[i].type === 'special') {
                cellContent = '<i class="fas fa-magic"></i>';
            } else if (board[i].type === 'demon') {
                cellContent = '<i class="fas fa-skull"></i>';
            } else if (board[i].type === 'trap') {
                cellContent = '<i class="fas fa-exclamation-triangle"></i>';
            } else if (board[i].type === 'item') {
                cellContent = '<i class="fas fa-gift"></i>';
            }
            
            // Préserver le numéro de case
            cell.innerHTML = '';
            cell.appendChild(cellNumberSpan);
            cell.insertAdjacentHTML('beforeend', cellContent);
        }
    }
}

// Mettre à jour les positions des joueurs sur le plateau
function updatePlayerPositions(players) {
    if (!players) return;
    
    // Supprimer tous les marqueurs de joueurs existants
    const existingMarkers = document.querySelectorAll('.player-marker');
    existingMarkers.forEach(marker => marker.remove());
    
    // Créer de nouveaux marqueurs pour chaque joueur
    players.forEach(player => {
        if (player.position < 0 || player.position >= 64) return;
        
        const cell = document.querySelector(`.cell[data-index="${player.position}"]`);
        if (!cell) return;
        
        const marker = document.createElement('div');
        marker.className = `player-marker player-${player.playerNumber}`;
        marker.style.backgroundColor = player.color || getRandomColor();
        marker.setAttribute('title', player.name);
        
        // Ajouter les initiales du joueur
        marker.textContent = player.name.slice(0, 1).toUpperCase();
        
        cell.appendChild(marker);
    });
}

// Mettre à jour les statistiques des joueurs
function updatePlayerStats(players) {
    if (!players) return;
    
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.setAttribute('data-id', player.id);
        
        // Détecter si c'est le joueur actuel
        if (player.id === socket.id) {
            playerItem.classList.add('current-user');
        }
        
        // Ajouter une indication visuelle si c'est le tour du joueur
        if (currentGameState && player.id === currentGameState.playerStates[currentGameState.currentPlayerIndex].id) {
            playerItem.classList.add('active-turn');
        }
        
        playerItem.innerHTML = `
            <div class="player-avatar" style="background-color: ${player.color || getRandomColor()}">
                <img src="${player.image || ''}" alt="${player.name}" onerror="this.style.display='none'">
            </div>
            <div class="player-info">
                <div class="player-name">${player.name} (${player.character})</div>
                <div class="player-stats">
                    <div class="stat health">
                        <i class="fas fa-heart"></i> ${player.health}/100
                    </div>
                    <div class="stat mana">
                        <i class="fas fa-bolt"></i> ${player.mana}/100
                    </div>
                </div>
                <div class="player-position">Position: ${player.position}/63</div>
                <div class="player-inventory">
                    Inventaire: ${player.inventory ? player.inventory.length : 0} objets
                </div>
                <div class="player-power">
                    Pouvoir: ${player.power || 'Aucun'}
                </div>
            </div>
        `;
        
        // Ajouter un gestionnaire d'événements pour afficher l'inventaire du joueur
        playerItem.addEventListener('click', () => {
            if (player.inventory && player.inventory.length > 0) {
                showInventory(player);
            }
        });
        
        playersList.appendChild(playerItem);
    });
}

// Mettre à jour les informations du joueur actuel
function updateCurrentPlayerInfo(gameState) {
    if (!gameState || !gameState.playerStates || !gameState.currentPlayerIndex) return;
    
    const currentPlayer = gameState.playerStates[gameState.currentPlayerIndex];
    const currentPlayerInfoEl = document.getElementById('current-player-info');
    
    if (currentPlayerInfoEl && currentPlayer) {
        currentPlayerInfoEl.innerHTML = `
            <div class="current-player-header">Tour de ${currentPlayer.name}</div>
            <div class="current-player-stats">
                <div class="stat health">
                    <i class="fas fa-heart"></i> ${currentPlayer.health}/100
                </div>
                <div class="stat mana">
                    <i class="fas fa-bolt"></i> ${currentPlayer.mana}/100
                </div>
            </div>
            <div class="dice-value ${gameState.diceValue ? 'visible' : ''}">
                Dé: ${gameState.diceValue || '?'}
            </div>
        `;
    }
}

// Gérer les états spéciaux du jeu
function handleSpecialGameStates(gameState) {
    // Gérer les combats
    if (gameState.activeDemon) {
        showCombatInterface(gameState.activeDemon);
    } else {
        hideCombatInterface();
    }
    
    // Gérer la fin du jeu
    if (gameState.gameOver) {
        showGameOverScreen(gameState);
    }
}

// Activer ou désactiver les contrôles du joueur
function togglePlayerControls(gameState) {
    const controls = document.getElementById('game-controls');
    const isPlayerTurn = gameState.playerStates && 
                        gameState.currentPlayerIndex >= 0 && 
                        gameState.playerStates[gameState.currentPlayerIndex].id === socket.id;
    
    if (controls) {
        if (isPlayerTurn && !gameState.gameOver) {
            controls.classList.remove('disabled');
            
            // Si un combat est en cours, afficher les contrôles de combat
            if (gameState.activeDemon) {
                document.getElementById('normal-controls').style.display = 'none';
                document.getElementById('combat-controls').style.display = 'flex';
            } else {
                document.getElementById('normal-controls').style.display = 'flex';
                document.getElementById('combat-controls').style.display = 'none';
            }
        } else {
            controls.classList.add('disabled');
        }
    }
}

// Afficher l'interface de combat
function showCombatInterface(demon) {
    const combatPanel = document.getElementById('combat-panel');
    if (!combatPanel) return;
    
    combatPanel.style.display = 'block';
    combatPanel.innerHTML = `
        <div class="combat-header">Combat contre ${demon.name}</div>
        <div class="demon-image">
            <img src="${demon.image}" alt="${demon.name}" onerror="this.style.display='none'">
        </div>
        <div class="demon-stats">
            <div class="stat health">
                <i class="fas fa-heart"></i> ${demon.health}
            </div>
            <div class="stat power">
                <i class="fas fa-fist-raised"></i> ${demon.power}
            </div>
        </div>
        <div class="demon-description">${demon.description}</div>
    `;
    
    // Activer les boutons de combat
    document.getElementById('attack-btn').disabled = false;
    document.getElementById('flee-btn').disabled = false;
    document.getElementById('use-item-btn').disabled = currentPlayer.inventory && currentPlayer.inventory.length > 0 ? false : true;
    document.getElementById('use-power-btn').disabled = currentPlayer.mana < 15 ? true : false;
}

// Masquer l'interface de combat
function hideCombatInterface() {
    const combatPanel = document.getElementById('combat-panel');
    if (combatPanel) {
        combatPanel.style.display = 'none';
    }
}

// Afficher l'écran de fin de partie
function showGameOverScreen(gameState) {
    const gameOverScreen = document.getElementById('game-over');
    if (!gameOverScreen) return;
    
    const winner = gameState.playerStates.find(p => p.position >= 63);
    const allDefeated = gameState.playerStates.every(p => p.health <= 0);
    
    gameOverScreen.style.display = 'flex';
    
    if (winner) {
        gameOverScreen.innerHTML = `
            <div class="game-over-content">
                <h2>Partie terminée !</h2>
                <p>${winner.name} a gagné la partie !</p>
                <button id="new-game-btn">Nouvelle partie</button>
            </div>
        `;
    } else if (allDefeated) {
        gameOverScreen.innerHTML = `
            <div class="game-over-content">
                <h2>Partie terminée !</h2>
                <p>Tous les joueurs ont été vaincus par les démons !</p>
                <button id="new-game-btn">Nouvelle partie</button>
            </div>
        `;
    }
    
    document.getElementById('new-game-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

// Afficher l'inventaire d'un joueur
function showInventory(player) {
    const inventoryPanel = document.getElementById('inventory-panel');
    if (!inventoryPanel) return;
    
    inventoryPanel.style.display = 'block';
    inventoryPanel.innerHTML = `
        <div class="inventory-header">Inventaire de ${player.name}</div>
        <div class="inventory-items">
            ${player.inventory && player.inventory.length > 0 
                ? player.inventory.map(item => `
                    <div class="inventory-item" data-id="${item.id}">
                        <img src="${item.icon}" alt="${item.name}" onerror="this.style.display='none'">
                        <div class="item-details">
                            <div class="item-name">${item.name}</div>
                            <div class="item-description">${item.description}</div>
                            <div class="item-stats">Type: ${item.type}, Puissance: ${item.power}</div>
                        </div>
                        ${player.id === socket.id ? `<button class="use-item-btn" data-id="${item.id}">Utiliser</button>` : ''}
                    </div>
                `).join('')
                : '<div class="no-items">Aucun objet dans l\'inventaire</div>'
            }
        </div>
        <button class="close-inventory-btn">Fermer</button>
    `;
    
    // Ajouter des gestionnaires d'événements
    document.querySelector('.close-inventory-btn').addEventListener('click', () => {
        inventoryPanel.style.display = 'none';
    });
    
    if (player.id === socket.id) {
        const useItemBtns = document.querySelectorAll('.use-item-btn');
        useItemBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = parseInt(btn.getAttribute('data-id'));
                socket.emit('useItem', { gameId: currentGameId, itemId });
                inventoryPanel.style.display = 'none';
            });
        });
    }
}

// Fonction pour lancer le dé
function rollDice() {
    if (!currentGameId || !currentPlayer || 
        (currentGameState && currentGameState.playerStates[currentGameState.currentPlayerIndex].id !== socket.id)) {
        console.log("Ce n'est pas votre tour");
        return;
    }
    
    socket.emit('gameAction', {
        gameId: currentGameId,
        action: { type: 'rollDice' }
    });
}

// Fonction pour utiliser un sort
function useSpell() {
    if (!currentGameId || !currentPlayer || 
        (currentGameState && currentGameState.playerStates[currentGameState.currentPlayerIndex].id !== socket.id)) {
        console.log("Ce n'est pas votre tour");
        return;
    }
    
    if (currentPlayer.mana < 15) {
        addLogMessage("Vous n'avez pas assez de mana pour lancer un sort.");
        return;
    }
    
    socket.emit('gameAction', {
        gameId: currentGameId,
        action: { type: 'useSpell' }
    });
}

// Fonction pour utiliser un objet
function useItem(itemId) {
    if (!currentGameId || !currentPlayer) {
        return;
    }
    
    const selectedItem = currentPlayer.inventory.find(item => item.id === itemId);
    if (!selectedItem) {
        addLogMessage("Objet non trouvé dans votre inventaire.");
        return;
    }
    
    socket.emit('gameAction', {
        gameId: currentGameId,
        action: { type: 'useItem' },
        itemId: itemId
    });
}

// Fonction pour utiliser le pouvoir du personnage
function usePower(targetId) {
    if (!currentGameId || !currentPlayer || 
        (currentGameState && currentGameState.playerStates[currentGameState.currentPlayerIndex].id !== socket.id)) {
        console.log("Ce n'est pas votre tour");
        return;
    }
    
    if (currentPlayer.mana < 15) {
        addLogMessage("Vous n'avez pas assez de mana pour utiliser votre pouvoir.");
        return;
    }
    
    socket.emit('usePower', {
        gameId: currentGameId,
        targetId: targetId // peut être null, le serveur gèrera ce cas
    });
}

// Fonction pour attaquer un démon
function attackDemon() {
    if (!currentGameId || !currentPlayer || 
        (currentGameState && currentGameState.playerStates[currentGameState.currentPlayerIndex].id !== socket.id)) {
        console.log("Ce n'est pas votre tour");
        return;
    }
    
    if (!currentGameState || !currentGameState.activeDemon) {
        addLogMessage("Aucun démon à attaquer.");
        return;
    }
    
    socket.emit('combat', {
        gameId: currentGameId,
        action: 'attack'
    });
}

// Fonction pour fuir un combat
function fleeCombat() {
    if (!currentGameId || !currentPlayer || 
        (currentGameState && currentGameState.playerStates[currentGameState.currentPlayerIndex].id !== socket.id)) {
        console.log("Ce n'est pas votre tour");
        return;
    }
    
    if (!currentGameState || !currentGameState.activeDemon) {
        addLogMessage("Aucun combat en cours.");
        return;
    }
    
    socket.emit('combat', {
        gameId: currentGameId,
        action: 'flee'
    });
}

// Initialisation des écouteurs d'événements pour les contrôles du jeu
function initGameControls() {
    // Contrôles de base
    document.getElementById('roll-dice-btn').addEventListener('click', rollDice);
    document.getElementById('use-spell-btn').addEventListener('click', useSpell);
    document.getElementById('view-inventory-btn').addEventListener('click', () => {
        if (currentPlayer) {
            showInventory(currentPlayer);
        }
    });
    document.getElementById('use-power-btn').addEventListener('click', () => {
        if (currentPlayer) {
            usePower();
        }
    });
    
    // Contrôles de combat
    document.getElementById('attack-btn').addEventListener('click', attackDemon);
    document.getElementById('flee-btn').addEventListener('click', fleeCombat);
    document.getElementById('combat-use-item-btn').addEventListener('click', () => {
        if (currentPlayer) {
            showInventory(currentPlayer);
        }
    });
    document.getElementById('combat-use-power-btn').addEventListener('click', () => {
        if (currentPlayer) {
            usePower();
        }
    });
}

// Ajouter un message au journal du jeu
function addLogMessage(message) {
    const logContainer = document.getElementById('game-log');
    if (!logContainer) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
} 