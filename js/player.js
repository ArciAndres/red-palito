/* globals $, THREE, Character, weapons, characterGeometry,
playerMaterial, player, enemyAmount, enemies,
getNextBullet, gunFlare, gunFlareColor, game, updateUI*/

/**
 * Single class meant to be used by players and enemies alike.
 * It has a THREE.Geometry, THREE.Material and THREE.Mesh among others.
 */
class Player extends Character { // eslint-disable-line no-unused-vars
	/**
     *
     * @param {string} charType - Type of character it is.
     */
	constructor() {
		super();
		this.isPlayer = true;
		this.isDead = false;
		this.moveSpeed = 10;
		this.color = 0xF44336;
		this.initialHP = 10;
		this.ownedWeapons = [];
		this.weaponsAmmo = [];
		for (var i = 0; i < weapons.length; ++i) {
			this.ownedWeapons.push(false);
			this.weaponsAmmo.push(0);
		}
		this.currentWeapon = 0;
		this.geometry = characterGeometry;
		this.material = playerMaterial;
		super.init();
		this.attackSpeed = [];
		this.attackCounter = [0, 0, 0, 0];
		this.accuracy = 0.5;
		this.damage = 2;
		this.onWeaponAnim = false;
		this.acquireWeapon(0);
		this.updateWeaponStats();
		this.raycaster = new THREE.Raycaster(new THREE.Vector3(this.position.x, 1, this.position.z), THREE.Vector3(0, 1, 0));
		this.isPlayingHealAnimation = false;
		this.healAnimationTime = 0.3;
	}

	/** Set new player  */
	reset() {
		this.HP = this.initialHP;
		this.isDead = false;
		this.ownedWeapons = [];
		this.weaponsAmmo = [];
		for (var i = 0; i < weapons.length; ++i) {
			this.ownedWeapons.push(false);
			this.weaponsAmmo.push(0);
		}
		this.currentWeapon = 0;
		this.Mesh.material = playerMaterial;
		this.attackSpeed = [];
		this.attackCounter = [0, 0, 0, 0];
		this.accuracy = 0.5;
		this.damage = 2;
		this.acquireWeapon(0);
		this.updateWeaponStats();

		this.position.x = 0;
		this.position.z = 0;
		this.Mesh.rotation.y = 0;
	}

	/** Change current weapon to next owned weapon */
	nextWeapon() {
		// // DEBUG
		// var w = 1;
		// if (!this.ownedWeapons[w]) {
		//     console.log("DEBUG: add " + weapons[w].name);
		//     this.acquireWeapon(w);
		// }
		if (!this.onWeaponAnim) {
			this.triggerWeaponChangeAnim();
			this.onWeaponAnim = true;
			// Update stats
			setTimeout(function () {
				do {
					// Using "player" instead of "this" because it's a callback
					player.currentWeapon = player.currentWeapon < player.ownedWeapons.length - 1 ? player.currentWeapon + 1 : 0;
				} while (!player.ownedWeapons[player.currentWeapon] || player.weaponsAmmo[player.currentWeapon] === 0);
				player.updateWeaponStats();
				player.onWeaponAnim = false;
				updateUI();
			}, 200);
		}
	}

	/** Set stats to those of the weapon */
	updateWeaponStats() {
		this.attackSpeed[this.currentWeapon] = weapons[this.currentWeapon].recharge;
		this.accuracy = weapons[this.currentWeapon].accuracy;
		this.damage = weapons[this.currentWeapon].damage;
	}

	/**
     * Add weapon index to the owned weapons
     * @param {number} index - Weapon number to add
     */
	acquireWeapon(index) {
		if (index != 0) {
			Audio.pickupSound.play();
		}
		if (!this.ownedWeapons[index]) {
			this.ownedWeapons[index] = true;
		}
		if (this.weaponsAmmo[index] >= 0 && weapons[index].ammo > 0) {
			this.weaponsAmmo[index] += weapons[index].ammo;
		}
		else {
			this.weaponsAmmo[index] = weapons[index].ammo;
		}
	}

	/** Attack whatever is ahead */
	attack() {
		if (this.weaponsAmmo[this.currentWeapon] == 0) {
			//this.weaponsAmmo.slice(this.ownedWeapons[this.currentWeapon], 1);
			//this.ownedWeapons.slice(this.currentWeapon, 1);
			this.nextWeapon();
		}
		else if (this.attackCounter[this.currentWeapon] <= 0) {
			if (this.weaponsAmmo[this.currentWeapon] > 0)
				this.weaponsAmmo[this.currentWeapon]--;
			this.triggerBulletAnim();
			this.useWeapon();
			Audio.weaponSounds[this.currentWeapon].play();
			this.attackCounter[this.currentWeapon] = this.attackSpeed[this.currentWeapon];
			updateUI();
		}
	}

	/**
     * Reduce HP by amount
     * @param {number} damageDealt - Total damage received
     */
	receiveDamage(damageDealt) {
		this.HP -= damageDealt;
		this.triggerLostHPAnim();
		if (this.HP <= 0) {
			this.die();
		} else {
			Audio.playerHitSounds[Math.randomInterval(0, Audio.playerHitSoundsLength - 1)].play();
		}
	}

	/**
     * Increase HP by amount
     * @param {number} hpHealed - Total HP gained
     */
	heal(hpHealed) {
		this.HP += hpHealed;
		player.isPlayingHealAnimation = true;
		player.healCounter = 0;
		this.triggerGainedHPAnim();
		Audio.gainHPSound.play();
	}

	/** Trigger CSS nimations */
	triggerLostHPAnim() {
		let element = $("#hp-bar")[0];
		element.classList.remove("gained-hp-anim");
		element.classList.remove("lost-hp-anim");
		void element.offsetWidth;
		element.classList.add("lost-hp-anim");
	}

	/** Trigger CSS nimations */
	triggerGainedHPAnim() {
		let element = $("#hp-bar")[0];
		element.classList.remove("gained-hp-anim");
		element.classList.remove("lost-hp-anim");
		void element.offsetWidth;
		element.classList.add("gained-hp-anim");
	}

	/** Trigger CSS nimations */
	triggerBulletAnim() {
		let element = $("#current-weapon-ammo")[0];
		element.classList.remove("changed-weapon-anim");
		element.classList.remove("used-bullet-anim");
		void element.offsetWidth;
		element.classList.add("used-bullet-anim");
	}

	/** Trigger CSS nimations */
	triggerWeaponChangeAnim() {
		let weapon = $("#current-weapon-stats")[0];
		weapon.classList.remove("changed-weapon-anim");
		void weapon.offsetWidth;
		weapon.classList.add("changed-weapon-anim");
	}

	/** Shoot/swing/bite/whatever */
	useWeapon() {
		this.weaponAnimation();
		this.gunFlareAnimation();
		game.bulletsUsed++;
	}


	/**
     * Check whether the bullet hit a target
     * @param {THREE.Vector3} dirVector - Target direction of bullet
     * @param {bool} resilient - Whether the bullet should go through enemies
     */
	bulletHitCheck(bullet, resilient = false) {
		let dirVector = bullet.direction;
		this.raycaster.set(new THREE.Vector3(this.position.x, 1, this.position.z), dirVector);
		let enemyMeshes = [];
		for (let e = 0; e < enemyAmount; ++e) {
			enemyMeshes.push(enemies[e].Mesh);
		}
		let intersects = this.raycaster.intersectObjects(enemyMeshes);

		if (intersects.length > 0) {

			if (resilient) {
				intersects.forEach(item => {
					enemies.forEach(enemy => {
						if (item.object.id === enemy.id && enemy.HP > 0) {
							enemy.receiveDamage(this.damage, item.point);
						}
					});
				});
			}
			else {
				enemies.forEach(enemy => {
					if (intersects[0].object.id === enemy.id && enemy.HP > 0) {
						enemy.receiveDamage(this.damage, intersects[0].point);
						bullet.setDestructionPoint(intersects[0].point);
					}
				});
			}
		}
	}

	/** Make the animation for the different weapons */
	weaponAnimation() {
		let bullet;
		let dirVector, randX, randY, randZ;
		let posOffset, laserBeamPos;
		switch (this.currentWeapon) {
			// Single shot weapons
			case 0: case 1:
				bullet = getNextBullet();
				bullet.prepareForWeapon(this.currentWeapon);
				bullet.spawn(this.position, this.facingVector, this.accuracy);
				this.bulletHitCheck(bullet);

				break;
			// Special cases

			// Shotgun: multiple shots in an outward direction
			case 2:

				for (let i = 0; i < 5; ++i) {
					bullet = getNextBullet();
					bullet.prepareForWeapon(this.currentWeapon);
					dirVector = this.facingVector;
					randX = (Math.random() / 5) - 0.1;
					randY = (Math.random() / 5) - 0.1;
					randZ = (Math.random() / 5) - 0.1;
					dirVector.add(new THREE.Vector3(randX, randY, randZ));
					bullet.spawn(this.position, dirVector, this.accuracy);
					this.bulletHitCheck(bullet);
				}
				break;
			// Laser: single, long ray. Damages everything in it's path
			case 3:
				bullet = getNextBullet();
				bullet.prepareForWeapon(this.currentWeapon);
				posOffset = bullet.Mesh.scale.y * 2;
				laserBeamPos = new THREE.Vector3(this.position.x + this.facingVector.x * posOffset, this.position.y + this.facingVector.y * posOffset, this.position.z + this.facingVector.z * posOffset);
				bullet.spawn(laserBeamPos, this.facingVector, this.accuracy, 0, 0.1);
				this.bulletHitCheck(bullet, true);
				break;
		}
	}

	/** Display gun flare */
	gunFlareAnimation() {
		gunFlare.intensity = 1;
		gunFlare.color.setHex(gunFlareColor[this.currentWeapon]);
	}

	/** Play sound of death */
	playDeathSound() {
		Audio.playerDeathSounds[Math.randomInterval(0, 2)].play();
	}

	/** 180 degree turn */
	turnAround() {
		this.isTurning = true;
		this.angleRotated = 0;
	}

	/** Die */
	die() {
		// TODO:
		// 1. Animation + sound
		this.playDeathSound();
		this.isDead = true;
		// 2. setTimeout(disappear, time);
	}
}
