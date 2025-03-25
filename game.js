// Initialisation du jeu
const game = {
    players: [
        { name: "Piper", color: "piper", health: 100, mana: 50, position: 0, inventory: [] },
        { name: "Phoebe", color: "phoebe", health: 100, mana: 50, position: 0, inventory: [] },
        { name: "Prue", color: "prue", health: 100, mana: 50, position: 0, inventory: [] },
        { name: "Paige", color: "paige", health: 100, mana: 50, position: 0, inventory: [] }
    ],
    currentPlayerIndex: 0,
    board: [],
    diceValue: 0,
    gameStarted: false,
    gameOver: false,
    
    // Initialisation du jeu
    init: function() {
        this.createBoard();
        this.renderPlayers();
        this.setupEventListeners();
        this.addLogEntry("Bienvenue dans Charmed - Le Jeu! Cliquez sur 'Lancer le dé' pour commencer.");
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
            
            // Ajouter quelques cases spéciales aléatoirement
            if (i % 7 === 0) {
                cell.classList.add('special-cell');
                cell.innerHTML = '<i class="fas fa-magic"></i>';
            } else if (i % 13 === 0) {
                cell.classList.add('demon-cell');
                cell.innerHTML = '<i class="fas fa-skull"></i>';
            } else if (i % 11 === 0) {
                cell.classList.add('trap-cell');
                cell.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            }
            
            gameBoard.appendChild(cell);
            this.board.push({
                index: i,
                type: i % 7 === 0 ? 'special' : (i % 13 === 0 ? 'demon' : (i % 11 === 0 ? 'trap' : 'normal'))
            });
        }
    },
    
    // Afficher les joueurs
    renderPlayers: function() {
        const playerInfo = document.getElementById('playerInfo');
        playerInfo.innerHTML = '';
        
        // Créer la carte de chaque joueur
        this.players.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.className = `player-card ${index === this.currentPlayerIndex ? 'current-player' : ''}`;
            
            playerCard.innerHTML = `
                <h3>${player.name} <span class="player-marker ${player.color}"></span></h3>
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
                        ${player.inventory.map(item => `
                            <div class="inventory-item">
                                <img src="${item.icon}" alt="${item.name}">
                                <div class="inventory-item-name">${item.name}</div>
                            </div>
                        `).join('') || '<p>Inventaire vide</p>'}
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
        // Supprimer toutes les représentations de joueurs existantes
        document.querySelectorAll('.player').forEach(el => el.remove());
        
        // Ajouter les joueurs à leurs positions respectives
        this.players.forEach(player => {
            if (player.position < 64) {
                const cell = document.querySelector(`.cell[data-index="${player.position}"]`);
                const playerMarker = document.createElement('div');
                playerMarker.className = `player ${player.color}`;
                playerMarker.innerHTML = player.name[0];
                cell.appendChild(playerMarker);
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
        player.position += this.diceValue;
        
        if (player.position >= 63) {
            player.position = 63;
            this.gameOver = true;
            this.addLogEntry(`${player.name} a atteint la fin du plateau et gagné la partie!`);
            this.showModal('Victoire!', 'images/victory.jpg', `${player.name} a vaincu tous les démons et sauvé le monde!`);
        } else {
            this.addLogEntry(`${player.name} avance à la case ${player.position}.`);
            this.checkCellEvent();
        }
        
        this.updatePlayerPositions();
        this.renderPlayers();
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
        const player = this.players[this.currentPlayerIndex];
        const demonHealth = 50 + Math.floor(Math.random() * 50);
        const demonName = this.getRandomDemonName();
        
        this.showModal(
            'Combat contre un démon!',
            'images/demon.jpg',
            `
                <div class="combat-ui">
                    <div class="combatant">
                        <img src="images/${player.color}.jpg" style="border-color: ${this.getPlayerColor(player.color)};">
                        <h3>${player.name}</h3>
                        <div class="health-bar">
                            <div class="health-fill" style="width: 100%;"></div>
                        </div>
                        <p>Santé: ${player.health}</p>
                    </div>
                    <div class="combatant">
                        <img src="images/demon.jpg" style="border-color: #ff0000;">
                        <h3>${demonName}</h3>
                        <div class="health-bar">
                            <div class="health-fill" id="demonHealth" style="width: 100%;"></div>
                        </div>
                        <p>Santé: <span id="demonHealthText">${demonHealth}</span></p>
                    </div>
                </div>
                <div class="combat-actions">
                    <button class="spell-button" id="attackSpell">
                        <i class="spell-icon fas fa-fire"></i>
                        Attaque
                    </button>
                    <button class="spell-button" id="healSpell">
                        <i class="spell-icon fas fa-heart"></i>
                        Soin
                    </button>
                    <button class="spell-button" id="fleeSpell">
                        <i class="spell-icon fas fa-running"></i>
                        Fuir
                    </button>
                </div>
            `
        );
        
        // Stocker les données de combat pour les utiliser lors des actions
        this.combatData = {
            demonName,
            demonHealth,
            playerBeforeHealth: player.health
        };
        
        // Ajouter des écouteurs d'événements pour les boutons de combat
        document.getElementById('attackSpell').addEventListener('click', () => this.attackDemon());
        document.getElementById('healSpell').addEventListener('click', () => this.healPlayer());
        document.getElementById('fleeSpell').addEventListener('click', () => this.fleeCombat());
    },
    
    // Attaquer le démon
    attackDemon: function() {
        const player = this.players[this.currentPlayerIndex];
        const damage = 10 + Math.floor(Math.random() * 20);
        
        this.combatData.demonHealth -= damage;
        
        if (this.combatData.demonHealth <= 0) {
            this.combatData.demonHealth = 0;
            this.addLogEntry(`${player.name} a vaincu ${this.combatData.demonName}!`);
            
            // Donner une récompense
            const reward = {
                name: "Amulette de protection",
                icon: "images/amulet.jpg",
                effect: "Protège contre les pièges"
            };
            player.inventory.push(reward);
            
            this.closeModal();
            this.renderPlayers();
        } else {
            const demonAttack = 5 + Math.floor(Math.random() * 10);
            player.health -= demonAttack;
            
            if (player.health <= 0) {
                player.health = 1;
                this.addLogEntry(`${player.name} a été gravement blessé par ${this.combatData.demonName}!`);
                this.closeModal();
                this.renderPlayers();
            } else {
                document.getElementById('demonHealth').style.width = `${(this.combatData.demonHealth / 50) * 100}%`;
                document.getElementById('demonHealthText').textContent = this.combatData.demonHealth;
                this.addLogEntry(`${player.name} inflige ${damage} de dégâts à ${this.combatData.demonName} et reçoit ${demonAttack} de dégâts.`);
            }
        }
    },
    
    // Soigner le joueur
    healPlayer: function() {
        const player = this.players[this.currentPlayerIndex];
        if (player.mana >= 10) {
            const healing = 20 + Math.floor(Math.random() * 10);
            player.health += healing;
            player.mana -= 10;
            
            if (player.health > 100) player.health = 100;
            
            this.addLogEntry(`${player.name} utilise un sort de soin et récupère ${healing} points de vie.`);
            
            const demonAttack = 5 + Math.floor(Math.random() * 10);
            player.health -= demonAttack;
            
            this.addLogEntry(`${this.combatData.demonName} inflige ${demonAttack} de dégâts à ${player.name}.`);
            
            if (player.health <= 0) {
                player.health = 1;
                this.addLogEntry(`${player.name} a été gravement blessé par ${this.combatData.demonName}!`);
                this.closeModal();
                this.renderPlayers();
            }
        } else {
            this.addLogEntry(`${player.name} n'a pas assez de mana pour lancer ce sort.`);
        }
    },
    
    // Fuir le combat
    fleeCombat: function() {
        const player = this.players[this.currentPlayerIndex];
        const success = Math.random() > 0.5;
        
        if (success) {
            this.addLogEntry(`${player.name} a réussi à fuir le combat contre ${this.combatData.demonName}!`);
            player.position -= 3;
            if (player.position < 0) player.position = 0;
            this.updatePlayerPositions();
            this.closeModal();
        } else {
            const demonAttack = 10 + Math.floor(Math.random() * 15);
            player.health -= demonAttack;
            
            this.addLogEntry(`${player.name} n'a pas réussi à fuir et ${this.combatData.demonName} inflige ${demonAttack} de dégâts.`);
            
            if (player.health <= 0) {
                player.health = 1;
                this.addLogEntry(`${player.name} a été gravement blessé par ${this.combatData.demonName}!`);
                this.closeModal();
                this.renderPlayers();
            }
        }
    },
    
    // Obtenir un nom aléatoire de démon
    getRandomDemonName: function() {
        const demonNames = [
            "Zankou", "Balthazar", "Barbas", "Shax", "La Source", "Belthazor",
            "Le Nécromancien", "Tempus", "L'Oracle", "La Seer", "L'Alchimiste"
        ];
        return demonNames[Math.floor(Math.random() * demonNames.length)];
    },
    
    // Obtenir la couleur CSS correspondant à un joueur
    getPlayerColor: function(color) {
        const colors = {
            piper: "#e74c3c",
            phoebe: "#3498db",
            prue: "#2ecc71",
            paige: "#f39c12"
        };
        return colors[color] || "#ffffff";
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
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.addLogEntry(`C'est au tour de ${this.players[this.currentPlayerIndex].name}.`);
        this.renderPlayers();
        
        document.getElementById('rollDice').disabled = false;
        document.getElementById('useSpell').disabled = true;
        document.getElementById('endTurn').disabled = true;
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
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalImage').src = image;
        document.getElementById('modalContent').innerHTML = content;
        
        // Afficher les boutons appropriés
        document.getElementById('modalConfirm').style.display = 'inline-block';
        document.getElementById('modalCancel').style.display = 'none';
        
        modal.style.display = 'flex';
    },
    
    // Fermer la fenêtre modale
    closeModal: function() {
        document.getElementById('eventModal').style.display = 'none';
    },
    
    // Gérer la confirmation dans la fenêtre modale
    handleModalConfirm: function() {
        this.closeModal();
    }
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    game.init();
});