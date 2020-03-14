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
        var dmg = attacker.stats.rangeDmg - defender.stats.armor;
        if (dmg > 0) {
            defender.hitPoints -= dmg;
            console.log(`${attacker.name} shot ${defender.name} for ${dmg}(${defender.hitPoints} remaining)`);
        } 
    } else console.log(`${attacker.name} shot ${defender.name} but missed`);
    return hit;
}

function melee(attacker, defender) {
    var meleeDiff = attacker.stats.meleeAtk - defender.stats.meleeAtk;
    if (attacker.meleeCooldown > 0) {
        // Do nothing
    } else if ((attacker.stats.meleeAtk  + meleeDiff - defender.stats.defense) * 0.1 + Math.random() > 0.5) {
        var dmg = attacker.stats.meleeDmg - defender.stats.armor;
        if (dmg > 0) {
            defender.hitPoints -= dmg;
            console.log(`${attacker.name} hit ${defender.name} for ${dmg}(${defender.hitPoints} remaining)`);
        }

    } else console.log(`${attacker.name} missed ${defender.name} in melee`);

    if (defender.meleeCooldown > 0) {
        // Do nothing
    } else if ((defender.stats.meleeAtk - meleeDiff - attacker.stats.defense) * 0.1 + Math.random() > 0.4) {
        var dmg = defender.stats.meleeDmg - attacker.stats.armor;
        if (dmg > 0) {
            attacker.hitPoints -= dmg;
            console.log(`${attacker.name} hit ${defender.name} for ${dmg}(${defender.hitPoints} remaining)`);
        } 
    } else console.log(`${defender.name} missed ${attacker.name} in melee`);
}

class Position {
    constructor(x, y) {
        this.radius = 7;
        this.x = x;
        this.y = y;
    }

    getVector(dest) {
        var deltaX = Math.abs(this.x - dest.x);
        var deltaY = Math.abs(this.y - dest.y);
        var xRate = deltaX / (deltaX + deltaY);
        var yRate = deltaY / (deltaX + deltaY);
        if (this.x > dest.x) xRate *= -1;
        if (this.y > dest.y) yRate *= -1;
        return {xRate, yRate};
    }
}

function ZeonMobileSuit(game, position, type) {
    this.velocityX = 0;
    this.velocityY = 0;
    this.game = game;
    this.position = position;
    this.stats = null;
    this.icon = null;
    this.type = type;
    this.lastShot = null;
    this.shotCooldown = 0;
    this.meleeCooldown = 0;
    this.explosion = new Animation(AM.getAsset("./img/explosion.png"), 0, 0, 64, 64, 0.04, 39, false, false);
    this.name = null;
    if (type === 'Ace') {
        this.name = "Char's Gelgoog";
        this.stats = {speed: 225, meleeAtk: 5, meleeDmg: 7, rangeAtk: 4, rangeDmg: 6, defense: 6, armor: 2, hitPoints: 20, sightRadius: 300};
        this.icon = AM.getAsset("./img/RedComet.png");
        this.launchTimer = 3;
    } else if (type === 'Elite') {
        this.name = 'Rick Dom';
        this.stats = {speed: 125, meleeAtk: 4, meleeDmg: 3, rangeAtk: 1, rangeDmg: 3, defense: 3, armor: 1, hitPoints: 8, sightRadius: 250};
        this.icon = AM.getAsset("./img/ZeonElite.png");
        this.launchTimer = 2;
    } else {
        this.name = 'Zaku II';
        this.stats = {speed: 75, meleeAtk: 3, meleeDmg: 3, rangeAtk: 1, rangeDmg: 2, defense: 2, armor: 0, hitPoints: 3, sightRadius: 200};
        this.icon = AM.getAsset("./img/ZeonGrunt.png");
    } 

    this.hitPoints = this.stats.hitPoints;
}

ZeonMobileSuit.prototype.update = function() {
    this.lastShot = null;
    var closestEnemy = null;
    if (this.shotCooldown > 0) this.shotCooldown -= this.game.clockTick;
    if (this.meleeCooldown > 0) this.meleeCooldown -= this.game.clockTick;

    if(this.hitPoints <= 0) { // Check if died
        this.dead = true;
        this.velocityX = 0;
        this.velocityY = 0;
    } else if (this.launchTimer && this.launchTimer > 0) {
        this.launchTimer -= this.game.clockTick;
    } else { // If not dead
        // Check for the closest enemy
        var theGundam = null;
        for (var i = 0; i < this.game.fedForces.length; i++) {
            if (this.game.fedForces[i].type === 'Ace') theGundam = this.game.fedForces[i];
            else if (closestEnemy === null) closestEnemy = this.game.fedForces[i];
            else if (distance(this.position, this.game.fedForces[i].position) < distance(this.position, closestEnemy.position) && 
                        !this.game.fedForces[i].dead && !this.game.fedForces[i].removeFromWorld) {
                closestEnemy = this.game.fedForces[i];
            }
        }
        // Ace only pursues Gundam; all others pursue Gundam only if no other enemies
        if (theGundam !== null && closestEnemy === null) closestEnemy = theGundam;
        if (theGundam !== null && this.type === 'Ace') closestEnemy = theGundam;

        if (closestEnemy !== null) {
            // If the closest enemy is in range, shoot them
            if (distance(this.position, closestEnemy.position) < this.stats.sightRadius) {
                if (this.shotCooldown <= 0) {
                    if (shoot(this, closestEnemy)) {
                        this.lastShot = closestEnemy;
                        if (closestEnemy.hitPoints <= 0) console.log(`${this.name} shot down ${closestEnemy.name}`);
                    }
                    this.shotCooldown = 3;
                }
                /** 
                 * var angle = Math.atan((this.position.y - closestEnemy.position.y) / (this.position.x - closestEnemy.position.x));
                 * this.velocityX = Math.cos(angle) * this.stats.speed * -1;
                 * this.velocityY = Math.sin(angle) * this.stats.speed * -1;
                */
            }
            // Advance toward closest enemy if melee ready, retreat otherwise
            if (this.meleeCooldown <= 0) {
                var vector = this.position.getVector(closestEnemy.position);
                this.velocityX = vector.xRate * this.stats.speed;
                this.velocityY = vector.yRate * this.stats.speed;
            } else {
                var vector = this.position.getVector(closestEnemy.position);
                this.velocityX = vector.xRate * this.stats.speed * -0.5;
                this.velocityY = vector.yRate * this.stats.speed * -0.5;
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
            if (this.meleeCooldown <= 0) {
                melee(this, this.game.fedForces[i]);
                if (this.game.fedForces[i].hitPoints <= 0) console.log(`${this.name} destroyed ${this.game.fedForces[i].name} in close combat`);
                if (this.hitPoints <=0) console.log(`${this.game.fedForces[i].name} destroyed ${this.name} in close combat`);
                this.meleeCooldown = 1.0;
            }   
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
    if (this.position.x < this.position.radius) this.position.x = this.position.radius * 1;
    if (this.position.x > 1000 - this.position.radius) this.position.x = 1000 - this.position.radius;
    if (this.position.y < this.position.radius) this.position.y = this.position.radius * 1;
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
            ctx.beginPath();
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(this.lastShot.position.x, this.lastShot.position.y);
            ctx.stroke();
            ctx.closePath();
            ctx.restore();
        }
    }
}

function FederationMobileSuit(game, position, type) {
    this.velocityX = 0;
    this.velocityY = 0;
    this.game = game;
    this.position = position;
    this.stats = null;
    this.icon = null;
    this.type = type;
    this.lastShot = null;
    this.shotCooldown = 0;
    this.meleeCooldown = 0;
    this.explosion = new Animation(AM.getAsset("./img/explosion.png"), 0, 0, 64, 64, 0.04, 39, false, false);
    this.name;
    if (type === 'Ace') {
        this.name = "Amuro's RX-78-2 Gundam";
        this.stats = {speed: 125, meleeAtk: 4, meleeDmg: 7, rangeAtk: 5, rangeDmg: 7, defense: 5, armor: 3, hitPoints: 20, sightRadius: 400};
        this.icon = AM.getAsset("./img/Gundam.png");
        this.launchTimer = 2;
    } 
    else if (type === 'Elite') {
        this.name = 'GM Cannon';
        this.stats = {speed: 50, meleeAtk: 1, meleeDmg: 4, rangeAtk: 3, rangeDmg: 5, defense: 1, armor: 1, hitPoints: 8, sightRadius: 300};
        this.icon = AM.getAsset("./img/FedElite.png");
    } else {
        this.name = 'GM';
        this.stats = {speed: 75, meleeAtk: 1, meleeDmg: 4, rangeAtk: 2, rangeDmg: 3, defense: 1, armor: 0, hitPoints: 3, sightRadius: 225};
        this.icon = AM.getAsset("./img/FedGrunt.png");
    }
    this.hitPoints = this.stats.hitPoints;
}

FederationMobileSuit.prototype.update = function() {
    this.lastShot = null;
    var closestEnemy = null;
    if (this.shotCooldown > 0) this.shotCooldown -= this.game.clockTick;
    if (this.meleeCooldown > 0) this.meleeCooldown -= this.game.clockTick;

    if(this.hitPoints <= 0) { // Check if died
        this.dead = true;
        this.velocityX = 0;
        this.velocityY = 0;
    } else if (this.launchTimer && this.launchTimer > 0) {
        this.launchTimer -= this.game.clockTick;
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
            // If no one is in range, move toward the center of the canvas
            if (distance(this.position, closestEnemy.position) > this.stats.sightRadius) {
                var vector = this.position.getVector(new Position(500, 300));
                this.velocityX = vector.xRate * this.stats.speed;
                this.velocityY = vector.yRate * this.stats.speed;
                /*
                var angle = Math.atan((this.position.y - this.game.ctx.canvas.height * 0.5) / (this.position.x - this.game.ctx.canvas.width * 0.5));
                if (this.x < this.game.ctx.canvas.width * 0.5) {
                    this.velocityX = Math.cos(angle) * this.stats.speed * 1;
                    this.velocityY = Math.sin(angle) * this.stats.speed * -1;
                } else {
                    this.velocityX = Math.cos(angle) * this.stats.speed * 1;
                    this.velocityY = Math.sin(angle) * this.stats.speed * 1;
                }
                */
            // If the closest enemy is in range, shoot at them
            } else if (distance(this.position, closestEnemy.position) < this.stats.sightRadius) {
                if (this.shotCooldown <= 0) {
                    if (shoot(this, closestEnemy)) {
                        if (closestEnemy.hitPoints <= 0) console.log(`${this.name} shot down ${closestEnemy.name}`);
                        this.lastShot = closestEnemy;
                    }
                    this.shotCooldown = 3;
                }
                // If the closest enemy is within half of sight range and melee off cooldown
                if (distance(this.position, closestEnemy.position) < this.stats.sightRadius * 0.5) {
                    var vector = this.position.getVector(closestEnemy.position);
                    if (this.stats.meleeAtk >= closestEnemy.stats.meleeAtk && this.meleeCooldown <= 0) { // Move toward them if as good or better in combat
                        this.velocityX = vector.xRate * this.stats.speed;
                        this.velocityY = vector.yRate * this.stats.speed;
                        /*
                        var angle = Math.atan((this.position.y - closestEnemy.position.y) / (this.position.x - closestEnemy.position.x));
                        this.velocityX = Math.cos(angle) * this.stats.speed * -1;
                        this.velocityY = Math.sin(angle) * this.stats.speed * -1;
                        */
                    } else { // Retreat otherwise
                        this.velocityX = vector.xRate * this.stats.speed * -0.5;
                        this.velocityY = vector.yRate * this.stats.speed * -0.5;
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
            if (this.meleeCooldown <= 0) {
                melee(this, this.game.zeonForces[i]);
                if (this.game.zeonForces[i].hitPoints <= 0) console.log(`${this.name} destroyed ${this.game.zeonForces[i].name} in close combat`);
                if (this.hitPoints <=0) console.log(`${this.game.zeonForces[i].name} destroyed ${this.name} in close combat`);
                if (this.type === 'Ace') this.meleeCooldown = 1;
                else this.meleeCooldown = 3;
            }
                
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
    if (this.position.x < this.position.radius) this.position.x = this.position.radius * 1;
    if (this.position.x > 1000 - this.position.radius) this.position.x = 1000 - this.position.radius;
    if (this.position.y < this.position.radius) this.position.y = this.position.radius * 1;
    if (this.position.y > 600 - this.position.radius) this.position.y = 600 - this.position.radius;
}

FederationMobileSuit.prototype.draw = function(ctx) {
    if(this.dead) {
        (this.explosion.isDone()) ? this.removeFromWorld = true : 
            this.explosion.drawFrame(this.game.clockTick, ctx, this.position.x - this.explosion.frameWidth * 0.5, this.position.y - this.explosion.frameHeight * 0.5, 1);
    } else {
        ctx.drawImage(this.icon, this.position.x - this.position.radius, this.position.y - this.position.radius, this.position.radius * 2, this.position.radius * 2);
        if (this.lastShot !== null) {
            ctx.save();
            ctx.strokeStyle = 'Pink';
            if (this.type === 'Grunt') ctx.setLineDash([4, 2]);
            ctx.beginPath()
            ctx.moveTo(this.position.x, this.position.y);
            ctx.lineTo(this.lastShot.position.x, this.lastShot.position.y);
            ctx.stroke();
            ctx.closePath();
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
    gameEngine.addFed(new FederationMobileSuit(gameEngine, new Position(15, 200), "Ace"));
    gameEngine.addZeon(new ZeonMobileSuit(gameEngine, new Position(985, 400), "Ace"));

    for(var i = 1; i <= 10; i++) {
        gameEngine.addFed(new FederationMobileSuit(gameEngine, new Position(i * 15 + 20, i * 30), "Grunt"));
        gameEngine.addFed(new FederationMobileSuit(gameEngine, new Position(i * 15 + 20, 600 - i * 30), "Grunt"));
        gameEngine.addZeon(new ZeonMobileSuit(gameEngine, new Position(1000 - i * 15 - 30, i * 30), "Grunt"));
        gameEngine.addZeon(new ZeonMobileSuit(gameEngine, new Position(1000 - i * 15 - 30, 600 - i * 30), "Grunt"));
    }

    for(var i = 0; i < 5; i++) {
        gameEngine.addFed(new FederationMobileSuit(gameEngine, new Position(i * 15, i * 60), "Elite"));
        gameEngine.addFed(new FederationMobileSuit(gameEngine, new Position(i * 15, 600 - i * 60), "Elite"));
        gameEngine.addFed(new FederationMobileSuit(gameEngine, new Position(i * 15 + 10, i * 60), "Grunt"));
        gameEngine.addFed(new FederationMobileSuit(gameEngine, new Position(i * 15 + 10, 600 - i * 60), "Grunt"));
        gameEngine.addZeon(new ZeonMobileSuit(gameEngine, new Position(1000 - i * 15, i * 60), "Elite"));
        gameEngine.addZeon(new ZeonMobileSuit(gameEngine, new Position(1000 - i * 15, 600 - i * 60), "Elite"));
        gameEngine.addZeon(new ZeonMobileSuit(gameEngine, new Position(1000 - i * 15, i * 60),  "Grunt"));
        gameEngine.addZeon(new ZeonMobileSuit(gameEngine, new Position(1000 - i * 15, 600 - i * 60), "Grunt"));
    }

    gameEngine.init(ctx);
    gameEngine.start();
});
