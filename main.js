/* Robert Mangrum
 * TCSS 491 Winter 2020
 * Assignment 2
 * Interaction
 * 
 * This program simulates a simplistic space battle between two opposing forces from the original Mobile Suit Gundam anime.
 * Earth Federation forces have slightly superior technology, but less skilled pilots than their counterparts from 
 * the Principality of Zeon.  Each side consists of regular pilots, with a handful of elite pilots, and one Ace.
 */

function Animation(spriteSheet, startX, startY, frameWidth, frameHeight, frameDuration, frames, loop, reverse) {
    this.spriteSheet = spriteSheet;
    this.startX = startX;
    this.startY = startY;
    this.frameWidth = frameWidth;
    this.frameDuration = frameDuration;
    this.frameHeight = frameHeight;
    this.frames = frames;
    this.totalTime = frameDuration * frames;
    this.elapsedTime = 0;
    this.loop = loop;
    this.reverse = reverse;
}

Animation.prototype.drawFrame = function (tick, ctx, x, y, scaleBy) {
    var scaleBy = scaleBy || 1;
    this.elapsedTime += tick;
    if (this.loop) {
        if (this.isDone()) {
            this.elapsedTime = 0;
        }
    } else if (this.isDone()) {
        return;
    }
    var index = this.reverse ? this.frames - this.currentFrame() - 1 : this.currentFrame();
    var vindex = 0;
    if ((index + 1) * this.frameWidth + this.startX > this.spriteSheet.width) {
        index -= Math.floor((this.spriteSheet.width - this.startX) / this.frameWidth);
        vindex++;
    }
    while ((index + 1) * this.frameWidth > this.spriteSheet.width) {
        index -= Math.floor(this.spriteSheet.width / this.frameWidth);
        vindex++;
    }

    var locX = x;
    var locY = y;
    var offset = vindex === 0 ? this.startX : 0;
    ctx.drawImage(this.spriteSheet,
                  index * this.frameWidth + offset, vindex * this.frameHeight + this.startY,  // source from sheet
                  this.frameWidth, this.frameHeight,
                  locX, locY,
                  this.frameWidth * scaleBy,
                  this.frameHeight * scaleBy);
}

Animation.prototype.currentFrame = function () {
    return Math.floor(this.elapsedTime / this.frameDuration);
}

Animation.prototype.isDone = function () {
    return (this.elapsedTime >= this.totalTime);
}

function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function collision(a, b) {
    return distance(a, b) < a.radius + b.radius;
}

function shoot(attacker, defender) {
    var hit = false;
    if ((attacker.stats.rangeAtk - defender.stats.defense) * 0.1 + Math.random() > 0.5) {
        hit = true;
        if (attacker.stats.rangeDmg > defender.stats.armor) {
            defender.hitPoints -= attacker.stats.rangeDmg - defender.stats.armor;
        } 
    }
    return hit;
}

function melee(attacker, defender) {
    var meleeDiff = attacker.stats.meleeAtk - defender.stats.meleeAtk;
    if ((attacker.stats.meleeAtk  + meleeDiff - defender.stats.defense) * 0.1 + Math.random() > 0.5) {
        if (attacker.stats.meleeDmg > defender.stats.armor) {
            defender.hitPoints -= attacker.stats.meleeDmg - defender.stats.armor;
        }
    }
    if ((defender.stats.meleeAtk - meleeDiff - attacker.stats.defense) * 0.1 + Math.random() > 0.4) {
        if (defender.stats.meleeDmg > attacker.stats.armor) {
            attacker.hitPoints -= defender.stats.meleeDmg - attacker.stats.armor;
        } 
    }
}

class Position {
    constructor(x, y) {
        this.radius = 7;
        this.x = x;
        this.y = y;
    }
}

function ZeonMobileSuit(game, position, stats, icon, type) {
    this.velocityX = 0;
    this.velocityY = 0;
    this.game = game;
    this.position = position;
    this.stats = stats;
    this.hitPoints = stats.hitPoints;
    this.icon = icon;
    this.type = type;
    this.lastShot = null;
    this.shotCooldown = 0;
    this.explosion = new Animation(AM.getAsset("./img/explosion.png"), 0, 0, 64, 64, 0.04, 39, false, false);
    this.name;
    if (type === 'Ace') this.name = "Char's Gelgoog";
    else if (type === 'Elite') this.name = 'Rick Dom';
    else this.name = 'Zaku II';
}

ZeonMobileSuit.prototype.update = function() {
    this.lastShot = null;
    var closestEnemy = null;
    if (this.shotCooldown > 0) this.shotCooldown -= this.game.clockTick;

    if(this.stats.hitPoints <= 0) { // Check if died
        this.dead = true;
        this.velocityX = 0;
        this.velocityY = 0;
    } else { // If not dead
        // Check for the closest enemy
        for (var i = 0; i < this.game.fedForces.length; i++) {
            if (closestEnemy === null) closestEnemy = this.game.fedForces[i];
            else if (distance(this.position, this.game.fedForces[i].position) < distance(this.position, closestEnemy.position) && 
                        !this.game.fedForces[i].dead && !this.game.fedForces[i].removeFromWorld) {
                closestEnemy = this.game.fedForces[i];
            }
        }
        if (closestEnemy !== null) {
            // If the closest enemy is in range, shoot and advance toward them
            if (distance(this.position, closestEnemy.position) < this.stats.sightRadius) {
                if (this.shotCooldown <= 0) {
                    if (shoot(this, closestEnemy)) {
                        this.lastShot = closestEnemy;
                        if (closestEnemy.stats.hitPoints <= 0) console.log(`${this.name} shot down ${closestEnemy.name}`);
                    }
                    this.shotCooldown = 3;
                }
                var angle = Math.atan((this.position.y - closestEnemy.position.y) / (this.position.x - closestEnemy.position.x));
                this.velocityX = Math.cos(angle) * this.stats.speed * -1;
                this.velocityY = Math.sin(angle) * this.stats.speed * -1;
            } else if (this.position.x > 50) { // If no one is in range, move left unless close to the edge
                this.velocityX = this.stats.speed * -1;
                this.velocityY = 0;
            } else { // Otherwise move to the closest ally
                var closestAlly = null;
                for (var i = 0; i < this.game.zeonForces.length; i++) {
                    if (closestAlly === null) closestAlly = this.game.zeonForces[i];
                    if (distance(this.position, this.game.zeonForces[i].position) < distance(this.position, closestAlly.position)) {
                        closestAlly = this.game.zeonForces[i];
                    }
                }
                var angle = Math.atan((this.position.y - closestAlly.position.y) / (this.position.x - closestAlly.position.x));
                this.velocityX = Math.cos(angle) * this.stats.speed;
                this.velocityY = Math.sin(angle) * this.stats.speed;
            }
        }
    }
    // Move based on velocity
    this.position.x += this.velocityX * this.game.clockTick;
    this.position.y += this.velocityY * this.game.clockTick;
    // Collision check
    for (var i = 0; i < this.game.fedForces.length; i++) {
        if(collision(this.position, this.game.fedForces[i].position) && !this.dead && !this.game.fedForces[i].dead) {
            // Melee attacks
            melee(this, this.game.fedForces[i]);
            if (this.game.fedForces[i].stats.hitPoints <= 0) console.log(`${this.name} destroyed ${this.game.fedForces[i].name} in close combat`);
            if (this.stats.hitPoints <=0) console.log(`${this.game.fedForces[i].name} destroyed ${this.name} in close combat`);
            // Bounce
            var tempX = this.velocityX;
            var tempY = this.velocityY;
            this.velocityX = this.game.fedForces[i].velocityX;
            this.velocityY = this.game.fedForces[i].velocityY;
            this.game.fedForces[i].velocityX = tempX;
            this.game.fedForces[i].velocityY = tempY;
            this.position.x += this.velocityX * this.game.clockTick;
            this.position.y += this.velocityY * this.game.clockTick;
            this.game.fedForces[i].position.x += this.velocityX * this.game.clockTick;
            this.game.fedForces[i].position.y += this.velocityY * this.game.clockTick;
        }
    }
    if (this.position.x < this.position.radius) this.position.x = this.position.radius;
    if (this.position.x > 1000 - this.position.radius) this.position.x = 1000 - this.position.radius;
    if (this.position.y < this.position.radius) this.position.y = this.position.radius;
    if (this.position.y > 600 - this.position.radius) this.position.y = 600 - this.position.radius;
}

ZeonMobileSuit.prototype.draw = function(ctx) {
    if (this.dead) {
        (this.explosion.isDone()) ? this.removeFromWorld = true : 
            this.explosion.drawFrame(this.game.clockTick, ctx, this.position.x - this.explosion.frameWidth * 0.5, this.position.y - this.explosion.frameHeight * 0.5, 1);
    } else {
        ctx.drawImage(this.icon, this.position.x - this.position.radius, this.position.y - this.position.radius, this.position.radius * 2, this.position.radius * 2);
        if (this.lastShot !== null) {
            ctx.save();
            ctx.strokeStyle = 'Yellow';
            if (this.type === 'Grunt') ctx.setLineDash([4, 2]);
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(this.lastShot.position.x, this.lastShot.position.y);
            ctx.stroke();
            ctx.restore();
        }
    }
}

function FederationMobileSuit(game, position, stats, icon, type) {
    this.velocityX = 0;
    this.velocityY = 0;
    this.game = game;
    this.position = position;
    this.stats = stats;
    this.hitPoints = stats.hitPoints;
    this.icon = icon;
    this.type = type;
    this.lastShot = null;
    this.shotCooldown = 0;
    this.explosion = new Animation(AM.getAsset("./img/explosion.png"), 0, 0, 64, 64, 0.04, 39, false, false);
    this.name;
    if (type === 'Ace') this.name = "Amuro's RX-78-2 Gundam";
    else if (type === 'Elite') this.name = 'GM Cannon';
    else this.name = 'GM';
}

FederationMobileSuit.prototype.update = function() {
    this.lastShot = null;
    var closestEnemy = null;
    if (this.shotCooldown > 0) this.shotCooldown -= this.game.clockTick;

    if(this.stats.hitPoints <= 0) { // Check if died
        this.dead = true;
        this.velocityX = 0;
        this.velocityY = 0;
    } else { // If not dead
        // Check for the closest enemy
        for (var i = 0; i < this.game.zeonForces.length; i++) {
            if (closestEnemy === null) closestEnemy = this.game.zeonForces[i];
            else if (distance(this.position, this.game.zeonForces[i].position) < distance(this.position, closestEnemy.position)  && 
                            !this.game.zeonForces[i].dead && !this.game.zeonForces[i].removeFromWorld) {
                    closestEnemy = this.game.zeonForces[i];
                }
            }

        if (closestEnemy !== null) {
            // If no one is in range, move right
            if (distance(this.position, closestEnemy.position) > this.stats.sightRadius) {
                this.velocityX = this.stats.speed;
                this.velocityY = 0;

            // If the closest enemy is in range, shoot at them
            } else if (distance(this.position, closestEnemy.position) < this.stats.sightRadius) {
                if (this.shotCooldown <= 0) {
                    if (shoot(this, closestEnemy)) {
                        if (closestEnemy.stats.hitPoints <= 0) console.log(`${this.name} shot down ${closestEnemy.name}`);
                        this.lastShot = closestEnemy;
                    }
                    this.shotCooldown = 3;
                }
                // If the closest enemy is within half of sight range
                if (distance(this.position, closestEnemy.position) < this.stats.sightRadius * 0.5) {
                    if (this.stats.meleeAtk > closestEnemy.stats.meleeAtk) { // Move toward them if better in combat
                        var angle = Math.atan((this.position.y - closestEnemy.position.y) / (this.position.x - closestEnemy.position.x));
                        this.velocityX = Math.cos(angle) * this.stats.speed * -1;
                        this.velocityY = Math.sin(angle) * this.stats.speed * -1;
                    } else { // Retreat left otherwise
                    this.velocityX = this.stats.speed * -1;
                    this.velocityY = 0;
                    }
                } else { // Stay still if between 1/2 and max range
                    this.velocityX = 0;
                    this.velocityY = 0;
                }
            }
        }
    }
    // Move based on velocity
    this.position.x += this.velocityX * this.game.clockTick;
    this.position.y += this.velocityY * this.game.clockTick;
    // Collision check
    for (var i = 0; i < this.game.zeonForces.length; i++) {
        if(collision(this.position, this.game.zeonForces[i].position) && !this.dead && !this.game.zeonForces[i].dead) {
            // Melee attacks
            melee(this, this.game.zeonForces[i]);
            if (this.game.fedForces[i].stats.hitPoints <= 0) console.log(`${this.name} destroyed ${this.game.fedForces[i].name} in close combat`);
            if (this.stats.hitPoints <=0) console.log(`${this.game.fedForces[i].name} destroyed ${this.name} in close combat`);
            // Bounce
            var tempX = this.velocityX;
            var tempY = this.velocityY;
            this.velocityX = this.game.zeonForces[i].velocityX;
            this.velocityY = this.game.zeonForces[i].velocityY;
            this.game.zeonForces[i].velocityX = tempX;
            this.game.zeonForces[i].velocityY = tempY;
            this.position.x += this.velocityX * this.game.clockTick;
            this.position.y += this.velocityY * this.game.clockTick;
            this.game.zeonForces[i].position.x += this.velocityX * this.game.clockTick;
            this.game.zeonForces[i].position.y += this.velocityY * this.game.clockTick;
        }
    }
    if (this.position.x < this.position.radius) this.position.x = this.position.radius;
    if (this.position.x > 1000 - this.position.radius) this.position.x = 1000 - this.position.radius;
    if (this.position.y < this.position.radius) this.position.y = this.position.radius;
    if (this.position.y > 600 - this.position.radius) this.position.y = 600 - this.position.radius;
}

FederationMobileSuit.prototype.draw = function(ctx) {
    if(this.dead) {
        (this.explosion.isDone()) ? this.removeFromWorld = true : 
            this.explosion.drawFrame(this.game.clockTick, ctx, this.position.x - this.explosion.frameWidth * 0.5, this.position.x - this.explosion.frameHeight * 0.5, 1);
    } else {
        ctx.drawImage(this.icon, this.position.x - this.position.radius, this.position.y - this.position.radius, this.position.radius * 2, this.position.radius * 2);
        if (this.lastShot !== null) {
            ctx.save();
            ctx.strokeStyle = 'Pink';
            if (this.type === 'Grunt') ctx.setLineDash([4, 2]);
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(this.lastShot.position.x, this.lastShot.position.y);
            ctx.stroke();
            ctx.restore();
        }
    }
}

function FederationVictory() {
}

FederationVictory.prototype.update = function() {
}

FederationVictory.prototype.draw = function(ctx) {
    ctx.drawImage(AM.getAsset("./img/federationWin.jpg"), 0, 0);
}

function ZeonVictory() {
}

ZeonVictory.prototype.update = function() {
}

ZeonVictory.prototype.draw = function(ctx) {
    ctx.drawImage(AM.getAsset("./img/zeonWin.jpg"), 0, 0);
}

// Begin Main Code
var zeonGrunt = {speed: 50, meleeAtk: 3, meleeDmg: 3, rangeAtk: 1, rangeDmg: 2, defense: 2, armor: 0, hitPoints: 3, sightRadius: 200};
var zeonElite = {speed: 100, meleeAtk: 4, meleeDmg: 3, rangeAtk: 1, rangeDmg: 3, defense: 3, armor: 1, hitPoints: 5, sightRadius: 250};
var redComet = {speed: 150, meleeAtk: 5, meleeDmg: 6, rangeAtk: 4, rangeDmg: 5, defense: 4, armor: 2, hitPoints: 10, sightRadius: 300};
var fedGrunt = {speed: 75, meleeAtk: 1, meleeDmg: 4, rangeAtk: 2, rangeDmg: 3, defense: 1, armor: 0, hitPoints: 3, sightRadius: 225};
var fedElite = {speed: 50, meleeAtk: 1, meleeDmg: 4, rangeAtk: 3, rangeDmg: 5, defense: 2, armor: 1, hitPoints: 4, sightRadius: 300};
var gundam = {speed: 125, meleeAtk: 4, meleeDmg: 7, rangeAtk: 5, rangeDmg: 7, defense: 5, armor: 3, hitPoints: 15, sightRadius: 400};
var AM = new AssetManager();

AM.queueDownload("./img/FedElite.png");
AM.queueDownload("./img/FedGrunt.png");
AM.queueDownload("./img/Gundam.png");
AM.queueDownload("./img/ZeonElite.png");
AM.queueDownload("./img/ZeonGrunt.png");
AM.queueDownload("./img/RedComet.png");
AM.queueDownload("./img/explosion.png");
AM.queueDownload("./img/federationWin.jpg");
AM.queueDownload("./img/zeonWin.jpg");

AM.downloadAll(function () {
    
    console.log("Mobile Suit squads launching");
    var canvas = document.getElementById('gameWorld');
    var ctx = canvas.getContext('2d');

    var gameEngine = new GameEngine();
    // var circle = new Circle(gameEngine);
    // circle.setIt();
    // gameEngine.addEntity(circle);
    // for (var i = 0; i < 12; i++) {
    //     circle = new Circle(gameEngine);
    //     gameEngine.addEntity(circle);
    // }
    gameEngine.fedVictory = new FederationVictory();
    gameEngine.zeonVictory = new ZeonVictory();
    // gameEngine.addFed(new FederationMobileSuit(gameEngine, new Position(15, 100), gundam, AM.getAsset("./img/Gundam.png"), "Ace"));
    // gameEngine.addZeon(new ZeonMobileSuit(gameEngine, new Position(985, 500), redComet, AM.getAsset("./img/RedComet.png"), "Ace"));

    for(var i = 0; i < 5; i++) {
        gameEngine.addFed(new FederationMobileSuit(gameEngine, new Position(15, i * 100 + 10), fedGrunt, AM.getAsset("./img/FedGrunt.png"), "Grunt"));
        gameEngine.addZeon(new ZeonMobileSuit(gameEngine, new Position(985, i * 100 + 10), zeonGrunt, AM.getAsset("./img/ZeonGrunt.png"), "Grunt"));
    }

    for(var i = 0; i < 2; i++) {
        gameEngine.addFed(new FederationMobileSuit(gameEngine, new Position(15, i * 100 + 60), fedElite, AM.getAsset("./img/FedElite.png"), "Elite"));
        gameEngine.addZeon(new ZeonMobileSuit(gameEngine, new Position(985, i * 100 + 60), zeonElite, AM.getAsset("./img/ZeonElite.png"), "Elite"));
    }

    gameEngine.init(ctx);
    gameEngine.start();
});
