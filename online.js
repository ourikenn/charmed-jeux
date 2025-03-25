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
        // Liste des personnages du jeu
        const characters = [
            { name: "Piper", color: "piper", image: "https://th.bing.com/th/id/R.e418e2e82e7d024893b72962bfa1fb03?rik=0qM8%2fp3Dzkr63A&riu=http%3a%2f%2fimages5.fanpop.com%2fimage%2fphotos%2f25500000%2fPiper-Halliwell-charmed-25593462-1912-2560.jpg&ehk=rxkknJzYQe06CdLUufNRS94f9bGVAWedZ7yJeX3j2Us%3d&risl=&pid=ImgRaw&r=0" },
            { name: "Phoebe", color: "phoebe", image: "https://usercontent2.hubstatic.com/14340833_f520.jpg" },
            { name: "Prue", color: "prue", image: "https://th.bing.com/th/id/R.9898bd81a60bd0fb240e5c8a3ed8ec85?rik=QHMl3HpnNXX5Kg&riu=http%3a%2f%2fimages5.fanpop.com%2fimage%2fphotos%2f25500000%2fPrue-Halliwell-charmed-25593840-2141-2560.jpg&ehk=5FdgnbZowUevZ4QwBVZXNyZF7eSUZwcZb1MbS9MvcOg%3d&risl=&pid=ImgRaw&r=0" },
            { name: "Paige", color: "paige", image: "https://images.saymedia-content.com/.image/ar_3:2%2Cc_limit%2Ccs_srgb%2Cfl_progressive%2Cq_auto:eco%2Cw_1400/MTc1MTE0NzE2OTA0MjM2MTI3/the-hairvolution-of-paige-halliwell-from-charmed.jpg" },
            { name: "Leo", color: "leo", image: "https://vignette.wikia.nocookie.net/charmed/images/c/c3/7x17-Leo.jpg/revision/latest?cb=20110125004234" },
            { name: "Cole", color: "cole", image: "https://th.bing.com/th/id/R.c8f0eba9a7ba1a10dd8d500b556f3b38?rik=7kuy7xFys9fDcg&riu=http%3a%2f%2fimg2.wikia.nocookie.net%2f__cb20110925135650%2fcharmed%2fimages%2f7%2f72%2fSeason-4-cole-05.jpg&ehk=6EIaa%2bvcITIVyCyaDptIuIOvBHDYY8KoihtCUv5nk0U%3d&risl=&pid=ImgRaw&r=0" }
        ];
        
        // Obtenir les personnages déjà sélectionnés
        const selectedCharacters = this.players
            .filter(player => player.character)
            .map(player => player.character);
        
        // Trouver mon joueur
        const myPlayer = this.players.find(player => player.id === this.socket.id);
        const myCharacter = myPlayer ? myPlayer.character : null;
        
        // Remplir la grille des personnages
        const charactersGrid = document.getElementById('characters-grid-online');
        charactersGrid.innerHTML = '';
        
        characters.forEach(character => {
            const isSelected = selectedCharacters.includes(character.name);
            const isMyCharacter = myCharacter === character.name;
            
            const characterCard = document.createElement('div');
            characterCard.className = `character-card ${isSelected ? 'selected' : ''} ${isMyCharacter ? 'my-selection' : ''}`;
            characterCard.dataset.character = character.name;
            
            // Désactiver les personnages déjà pris par d'autres joueurs
            if (isSelected && !isMyCharacter) {
                characterCard.classList.add('disabled');
            }
            
            characterCard.innerHTML = `
                <img src="${character.image}" alt="${character.name}">
                <div class="character-name">${character.name}</div>
                ${isSelected && !isMyCharacter ? '<div class="taken-badge">Pris</div>' : ''}
            `;
            
            // Ajouter l'événement de clic seulement si le personnage n'est pas déjà pris
            if (!isSelected || isMyCharacter) {
                characterCard.addEventListener('click', () => {
                    this.selectCharacter(character.name);
                });
            }
            
            charactersGrid.appendChild(characterCard);
        });
    },
    
    // Sélectionner un personnage
    selectCharacter: function(characterName) {
        // Envoyer la sélection au serveur
        this.socket.emit('selectCharacter', characterName);
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