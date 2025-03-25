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
            
            // Afficher la salle d'attente
            document.getElementById('online-modal').style.display = 'none';
            document.getElementById('waiting-room-modal').style.display = 'block';
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
                    }
                });
            } else {
                alert('Veuillez remplir tous les champs');
            }
        });
        
        // Démarrer la partie en ligne
        document.getElementById('start-online-game').addEventListener('click', () => {
            if (this.isHost) {
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
            const characterInfo = player.character ? ` - ${player.character}` : '';
            li.innerHTML = `<span style="margin-right: 10px;">${icon}</span> ${player.name}${characterInfo}`;
            
            playersList.appendChild(li);
        });
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
}); 