/*global THREE, Stats, $
parseJSONToVar, getRandomPosition, getNextHPDrop, getNextWeaponDrop
Bullet, Drop, Input, Menu, Player, Zombie, BigZombie, SmallZombie
*/

let clock, scene, camera, renderer;
let player;
const player180TurnSpeed = 600;
const playerColour = 0xF44336,
	planeColor = 0xFFFFFF;
let planeG, planeM, plane;
const planeSize = 50;

let light;
const lightsAmount = 4; // eslint-disable-line no-unused-vars
let frameTime;

let enemies = [];

const enemyAmount = 300,
	initialEnemyAmount = 3;
let currentEnemyAmount = initialEnemyAmount;

let game = {

	waveNumber: 1,
	enemiesKilled: 0,
	packagesReceived: 0,
	bulletsUsed: 0,
	statsUpdated: false,
	time: 0
};

let isWaveSpawning = true;

const lowHPAnimationThreshold = 4;

let bullets = [];
const bulletsAmount = 30;

let weapons = [];
const gunFlareFalloffTime = [10, 10, 10, 1, 1];
const gunFlareColor = [0xF7EFB1, 0xF7EFB1, 0xF7EFB1, 0x0000FF, 0x0]; // eslint-disable-line no-unused-vars
let gunFlare;

let listener, audioLoader; // eslint-disable-line no-unused-vars

let healthDropCounter, weaponDropCounter;
const healthDropTime = 30, weaponDropTime = 20;

let hpDrops = [],
	weaponDrops = [];
const hpDropAmount = 1,
	weaponDropAmount = 4;

const invisibleYPos = 100; // eslint-disable-line no-unused-vars

let lightFlickerCounter = 0; // eslint-disable-line no-unused-vars

let settings;
loadSettings();

/* Materials */
const playerMaterial = new THREE.MeshPhongMaterial({ color: playerColour, skinning: settings.modeslEnabled ? true : false }), // eslint-disable-line no-unused-vars
	zombieMaterial = new THREE.MeshPhongMaterial({ color: 0x4CAF50, skinning: settings.modeslEnabled ? true : false }), // eslint-disable-line no-unused-vars
	bigZombieMaterial = new THREE.MeshPhongMaterial({ color: 0x724CAE, skinning: settings.modeslEnabled ? true : false }), // eslint-disable-line no-unused-vars
	smallZombieMaterial = new THREE.MeshPhongMaterial({ color: 0xD1B829, skinning: settings.modeslEnabled ? true : false }), // eslint-disable-line no-unused-vars
	smallZombiePrepareMaterial = new THREE.MeshPhongMaterial({ color: 0xD16729, skinning: settings.modeslEnabled ? true : false }), // eslint-disable-line no-unused-vars
	smallZombieDashMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000, skinning: settings.modeslEnabled ? true : false }), // eslint-disable-line no-unused-vars
	damagedMaterial = new THREE.MeshPhongMaterial({ color: 0xB30000, skinning: settings.modelsEnabled ? true : false }), // eslint-disable-line no-unused-vars
	weaponDropMaterial = new THREE.MeshPhongMaterial({ color: 0xFF5722 }), // eslint-disable-line no-unused-vars
	hpDropMaterial = new THREE.MeshPhongMaterial({ color: 0x4CAF50 }), // eslint-disable-line no-unused-vars
	planeMaterial = new THREE.MeshPhongMaterial({ color: planeColor }); // eslint-disable-line no-unused-vars

/* Geometries */
let characterGeometry = new THREE.BoxBufferGeometry(1, 2, 1), // eslint-disable-line no-unused-vars
	zombieGeometry = new THREE.BoxBufferGeometry(1, 2, 1), // eslint-disable-line no-unused-vars
	bigZombieGeometry = new THREE.BoxBufferGeometry(2, 4, 2), // eslint-disable-line no-unused-vars
	smallZombieGeometry = new THREE.BoxBufferGeometry(1, 1, 1), // eslint-disable-line no-unused-vars
	dropGeometry = new THREE.BoxBufferGeometry(1, 1, 1); // eslint-disable-line no-unused-vars

let stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
if (settings.isDev) document.body.appendChild(stats.dom);
if (!settings.isMobile) $("#mobile-controller").css("display", "none");

let modelLoader = new THREE.JDLoader();
let textureLoader = new THREE.TextureLoader();

let healParticlesTexture = textureLoader.load("textures/heal-particle.png");
let bloodParticlesTexture = textureLoader.load("textures/blood-particle.png");

let bloodParticleSystem = new THREE.GPUParticleSystem({ maxParticles: 25000, particleSpriteTex: bloodParticlesTexture, blending: THREE.NormalBlending });
let healParticleSystem = new THREE.GPUParticleSystem({ maxParticles: 25000, particleSpriteTex: healParticlesTexture, blending: THREE.AdditiveBlending });

/**
 * Window resize event handler
 */
window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}
if (settings.modelsEnabled) loadModels(init);
else init();
animate();

/** Reset game so that it can be started again */
function reset() {
	setupPlayer();
	currentEnemyAmount = initialEnemyAmount;
	game.waveNumber = 1;
	game.statsUpdated = false;
	game.bulletsUsed = game.enemiesKilled = game.packagesReceived = 0;
	game.time = 0;
	isWaveSpawning = true;

	// If we don't reset the particle system, users will see repetitions of previous particles
	scene.remove(bloodParticleSystem);
	bloodParticleSystem = new THREE.GPUParticleSystem({ maxParticles: 25000, particleSpriteTex: bloodParticlesTexture, blending: THREE.NormalBlending });
	scene.add(bloodParticleSystem);

	scene.remove(healParticleSystem);
	healParticleSystem = new THREE.GPUParticleSystem({ maxParticles: 25000, particleSpriteTex: healParticlesTexture, blending: THREE.AdditiveBlending });
	scene.add(healParticleSystem);

	healthDropCounter = healthDropTime;
	weaponDropCounter = weaponDropTime;
}

/**
 * Load models
 * @param {function} callback
 */
function loadModels(callback) {
	modelLoader.load("./models/enemy.jd", data => {
		characterGeometry = data.geometries[0];
		callback();
	});
}

/** Load weapon data from JSON */
function getWeapons() { // eslint-disable-line no-unused-vars
	let parseResult = parseJSONToVar("weapons.json", "weapons", weapons);
	parseResult.then(() => {
		Audio.loadWeaponSounds();
		Audio.loadPickupSounds();
		Audio.loadEnemySounds();
		Audio.loadPlayerSounds();
		listener.setMasterVolume(settings.masterVolume);
		setupPlayer();
		setGunFlare();

		player.Mesh.add(listener);
	});
}

/** Initialise scene */
function init() {
	clock = new THREE.Clock();
	frameTime = 0;

	//loadModels(getWeapons);


	healthDropCounter = healthDropTime;
	weaponDropCounter = weaponDropTime;
	Input.keyboardInit();
	Input.mobileControllerInit();

	scene = new THREE.Scene();

	// Camera
	camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
	camera.position.set(0, 40, -40);
	camera.rotateY(Math.degToRad(-180));
	camera.rotateX(Math.degToRad(-45));
	gunFlare = new THREE.PointLight(0x0, 0, 10, 2);

	listener = new THREE.AudioListener();
	audioLoader = new THREE.AudioLoader();

	// Load player asynchronously
	let parseResult = parseJSONToVar("weapons.json", "weapons", weapons);
	parseResult.then(function () {
		Audio.loadWeaponSounds();
		Audio.loadPickupSounds();
		Audio.loadEnemySounds();
		Audio.loadPlayerSounds();
		listener.setMasterVolume(settings.masterVolume);
		setupPlayer();
		setGunFlare();

		player.Mesh.add(listener);
		updateUI();
	});

	scene.add(bloodParticleSystem);

	// Models
	for (let i = 0; i < bulletsAmount; ++i) {
		bullets.push(new Bullet());
	}

	for (let i = 0; i < enemyAmount; ++i) {
		if (i !== 0 && i % 15 === 0) enemies.push(new BigZombie());
		else if (i !== 0 && i % 5 === 0) enemies.push(new SmallZombie());
		else enemies.push(new Zombie());

		enemies[enemies.length - 1].addToScene();
	}

	for (let i = 0; i < hpDropAmount; ++i) {
		hpDrops.push(new Drop("HP"));
	}
	for (let i = 0; i < weaponDropAmount; ++i) {
		weaponDrops.push(new Drop("weapon"));
	}

	planeG = new THREE.BoxGeometry(planeSize, planeSize / 2, planeSize);
	planeM = planeMaterial;
	plane = new THREE.Mesh(planeG, planeM);
	plane.material.side = THREE.BackSide;

	plane.castShadow = false;
	plane.receiveShadow = true;
	scene.add(plane);

	// Lights
	const lightIntensity = 2,
		lightColor = 0xFFFFFF;
	let ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.1);
	scene.add(ambientLight);

	light = new THREE.PointLight(lightColor, lightIntensity, 50, 2);
	light.castShadow = true;
	scene.add(light);
	light.position.set(0, 20, 0);

	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0x0, 1);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	document.body.appendChild(renderer.domElement);

	plane.translateY(planeSize / 4);

	// #region Button actions
	$("#start-button").click(() => {
		Menu.isMainMenu = false;
		Menu.showUI();
		if (settings.isMobile) Menu.showMobileController();
		reset();
		updateUI();
	});
	$("#resume-button").click(() => {
		Input.isPaused = false;
		Menu.showUI();
		if (settings.isMobile) Menu.showMobileController();
		updateUI();
	});
	$("#exit-button").click(() => {
		Menu.isMainMenu = true;
		Menu.hideMenu();
		Input.isPaused = false;
		Menu.hideUI();
		reset();
		updateUI();
	});

	$("#play-again-button").click(() => {
		Menu.isMainMenu = false;
		Menu.hideMenu();
		Input.isPaused = false;
		Menu.showUI();
		if (settings.isMobile) Menu.showMobileController();
		reset();
		updateUI();
	});

	$("#settings-button").click(() => {
		applySettings();
		Menu.isMainMenu = false;
		Menu.showMenu("settings");
		Input.isPaused = true;
		Menu.hideUI();
		updateUI();
	});

	$("#save-settings-button").click(() => {
		saveSettings();
		applySettings();
		$("#exit-button").click();
		updateUI();
	});

	$("#cancel-settings-button").click(() => {
		$("#exit-button").click();
	});

	$("#turn-direction-button").click(() => {
		settings.turn180TowardsRight = !settings.turn180TowardsRight;
		$("#turn-direction-button").val(settings.turn180TowardsRight ? "RIGHT" : "LEFT");
	});

	$("#mobile-controller-button").click(() => {
		settings.isMobile = !settings.isMobile;
		$("#mobile-controller-button").val(settings.isMobile ? "SHOW" : "HIDE");
	});

	$("#blood-button").click(() => {
		settings.showBlood = !settings.showBlood;
		$("#blood-button").val(settings.showBlood ? "ON" : "OFF");
	});

	// #endregion

	//requestAnimationFrame(animate);
	renderer.render(scene, camera);
	Menu.hideUI();
}

/** Save settings in settings object */
function saveSettings() {
	settings.masterVolume = parseFloat($("#volume-slider").val());

	localStorage.setItem("settings", JSON.stringify(settings));
}

/** Load settings from the storage or set default settings if empty */
function loadSettings() {
	settings = JSON.parse(localStorage.getItem("settings")); // eslint-disable-line no-global-assign
	if (!settings || $.isEmptyObject(settings)) {
		settings = {
			masterVolume: 0.2,
			ambientVolume: 1,
			turn180TowardsRight: true,
			showBlood: true,
			modelsEnabled: false,
			isMobile: false,
			isDev: true
		};
		saveSettings();
	}
}

/** Pass setting values to controls and game logic */
function applySettings() {
	listener.setMasterVolume(settings.masterVolume);
	$("#volume-slider").val(settings.masterVolume);
	$("#turn-direction-button").val(settings.turn180TowardsRight ? "RIGHT" : "LEFT");
	$("#mobile-controller-button").val(settings.isMobile ? "SHOW" : "HIDE");
	$("#blood-button").val(settings.showBlood ? "ON" : "OFF");
}

/** Prepare player for game */
function setupPlayer() {
	if (player === undefined) {
		player = new Player();
		player.addToScene();
		player.Mesh.add(camera);
	}

	player.reset();

	game.waveNumber = 0;
	currentEnemyAmount = initialEnemyAmount;

	hpDrops.forEach(drop => {
		drop.reset();
	});

	weaponDrops.forEach(drop => {
		drop.reset();
	});

	enemies.forEach(enemy => {
		enemy.reset();
	});
}

/** Set the position of the gun flare */
function setGunFlare() {
	gunFlare.position.add(new THREE.Vector3(0, 0.5, 1.3));
	gunFlare.rotateY();
	gunFlare.castShadow = true;
	player.Mesh.add(gunFlare);
}

/** Animate scene */
function animate() {
	//stats.begin();
	requestAnimationFrame(animate);

	if (player !== undefined) {

		//updateUI();

		Input.resolveInput();

		if (!Input.isPaused && !Menu.isMainMenu) {

			updateAttackCounters();

			updateSoundCounters();

			updateBullet();

			if (settings.modelsEnabled) updateAnimationMixers();

			//updateLightFlicker();

			if (player.isTurning) {
				settings.turn180TowardsRight ? player.rotateRight(player180TurnSpeed) : player.rotateLeft(player180TurnSpeed);
				if (player.angleRotated >= 170) player.isTurning = false;
			}

			moveEnemies();
			animateEnemies();
			updateSpawnCounters();
			collisions();

			animateLowHPBackdrop();

			updateDropCounters();

			if (!enemyAlive() && !isWaveSpawning) {
				spawnWave();
			}
		} if (player.isDead && !game.statsUpdated) {
			$("#hp-bar")[0].innerHTML = player.HP;
			Menu.showMenu("end");
			Input.isPaused = true;
			$("#wave-num-stat").html(game.waveNumber);
			$("#enemies-killed-stat").html(game.enemiesKilled);
			$("#packages-received-stat").html(game.packagesReceived);
			$("#bullets-used-stat").html(game.bulletsUsed);
			game.statsUpdated = true;
		}
		renderer.render(scene, camera);
		frameTime = clock.getDelta();
		game.time += frameTime;
	}
	stats.end();
}

/** Update state of low HP backdrop depending on player HP */
function updateLowHPBackdrop() {
	if (player.HP <= lowHPAnimationThreshold) {
		Menu.showLowHPBackdrop();
	} else {
		Menu.hideLowHPBackdrop();
	}
}

/** Update elements from the UI */
function updateUI() {
	if (Menu.isMainMenu && !Menu.isShowingMenu) {
		Menu.showMenu("main");
	} else if (Input.isPaused && !Menu.isShowingMenu) {
		Menu.showMenu("pause");
	} else if (!Input.isPaused && !Menu.isMainMenu) {
		Menu.hideMenu();
		Menu.showUI();
		if (settings.isMobile) Menu.showMobileController();
		if (game.waveNumber > 0) {
			$("#wave-number")[0].innerHTML = game.waveNumber;
		}
		if (player.HP >= 0) {
			$("#hp-bar")[0].innerHTML = player.HP;
		}
		if (weapons[1]) {
			$("#current-weapon-name")[0].innerHTML = weapons[player.currentWeapon].name;
			$("#current-weapon-ammo")[0].innerHTML = player.weaponsAmmo[player.currentWeapon];
		}
	}
}

/** Decrease attack cooldowns */
function updateAttackCounters() {
	enemies.forEach(e => {
		if (e.isSpawned && e.attackCounter > 0) {
			e.attackCounter -= frameTime;
		}
	});
	for (let i = 0; i < weapons.length; ++i) {
		if (player.attackCounter[i] > 0) {
			player.attackCounter[i] -= frameTime;
		}
	}
}

/** Decrease sound cooldowns */
function updateSoundCounters() {
	enemies.forEach(e => {
		if (e.isSpawned) {
			if (e.soundCounter > 0) {
				e.soundCounter -= frameTime;
			} else if (e.soundCounter < 0) {
				e.playSound();
			}
		}
	});

}

/** Decrease bullet lifetime and dispose of bullets */
function updateBullet() {
	bullets.forEach(b => {
		if (b.isAlive) {
			b.lifeTime -= frameTime;
			let oldPosition = b.position.clone();
			b.position.add(b.direction.multiplyScalar(b.speed));

			// Check if the destruction point is between the current position and the next position
			// It's actually checking if the three points form a triangle (but we can assume that the destruction point
			// is between the 2 other points since we calculated the destruction point as a point in the line defined
			// by the direction vector)
			if (b.destructionPoint) {
				let la = oldPosition.distanceTo(b.position);
				let lb = b.position.distanceTo(b.destructionPoint);
				let lc = b.destructionPoint.distanceTo(oldPosition);

				// Pythagoras theorem
				if (la * la + lb * lb >= lc * lc && la * la + lc * lc >= lb * lb) b.reset();
			}


			//console.log(bullets[i].position);
		}
		if (b.lifeTime < 0 || (b.destructionPoint && b.position.distanceTo(b.destructionPoint) < 3)) {
			b.reset();
		}
	});

	if (gunFlare.intensity > 0) {
		gunFlare.intensity -= frameTime * gunFlareFalloffTime[player.currentWeapon];
		if (gunFlare.intensity < 0) gunFlare.intensity = 0;
	}
}

/** Go through all mixers and update their state */
function updateAnimationMixers() {
	player.animationMixer.update(frameTime);
	enemies.forEach(e => {
		if (e.isSpawned) e.animationMixer.update(frameTime);
	});
}

/** Move enemies */
function moveEnemies() {
	enemies.forEach(e => {
		if (e.isSpawned && e.HP > 0 && !e.isPlayingSpawnAnimation) {
			if (e.position.distanceTo(player.position) <= e.sightDistance || e.isDashing) {
				// I can see the player
				e.moveTowardPlayer();
			} else if (e.position.distanceTo(e.targetPosition) <= (e.radius * 10)) {
				// I arrived to where I was going
				e.targetPosition = getRandomPosition();
			} else {
				// Let's go somewhere else
				e.lookAtPosition(e.targetPosition);
				e.moveForward();
			}
		}
		else if (e.HP <= 0 && e.isSpawned) {
			e.die();
		}
	});
}

/** Perform all calculations and animations that happen on particles */
function animateEnemies() {
	// Blood enemies
	enemies.forEach(e => {
		if (e.isPlayingBloodAnimation) {
			e.bloodCounter += frameTime;
			if (e.bloodCounter > e.bloodAnimationTime) {
				e.isPlayingBloodAnimation = false;
				e.bloodCounter = 0;
			} else if (e.bloodCounter > e.bloodEmissionTime) {
				e.Mesh.material = e.originalMaterial;
			} else if (settings.showBlood) {
				for (let i = 0; i < 50; ++i) {
					bloodParticleSystem.spawnParticle({
						position: e.pointOfImpact,
						positionRandomness: 0.2,
						velocity: new THREE.Vector3().subVectors(player.position, e.pointOfImpact).normalize(),
						velocityRandomness: 2.15,
						color: 0xb30000,
						colorRandomness: 0.1,
						turbulence: 0.05,
						lifetime: 0.2,
						size: 10,
						sizeRandomness: 5
					});
				}
			}
		}
	});

	// Player heal
	if (player.isPlayingHealAnimation) {
		player.healCounter += frameTime;
		if (player.healCounter > player.healAnimationTime) {
			player.isPlayingHealAnimation = false;
			player.healCounter = 0;
		} else {
			for (let i = 0; i < 10; ++i) {
				healParticleSystem.spawnParticle({
					position: player.position,
					positionRandomness: 2,
					velocity: new THREE.Vector3(),
					velocityRandomness: 0.2,
					color: 0x4fff4d,
					colorRandomness: 0.2,
					turbulence: 0,
					lifetime: 5,
					size: 10,
					sizeRandomness: 10
				});
			}
		}
	}

	bloodParticleSystem.update(game.time);
	healParticleSystem.update(game.time);
}

let lowHPAnimationCounter = 0.5;

/** Make pump animation of low HP backdrop */
function animateLowHPBackdrop() {
	if (player.HP <= lowHPAnimationThreshold) {
		lowHPAnimationCounter += frameTime * 2 / player.HP;
		if (lowHPAnimationCounter > 1) {
			lowHPAnimationCounter = 0;
		} else if (lowHPAnimationCounter > 0.5) {
			$("#low-hp-backdrop").css("opacity", (1 / Math.sin(lowHPAnimationCounter) / 5) + (1 / (player.HP * 2)));
			$("#low-hp-veins").css("opacity", (1 / Math.sin(lowHPAnimationCounter) / 5)/* + (1 / (player.HP * 2))*/);
		}
	}
}

/** Prepare enemies for spawn */
function updateSpawnCounters() {
	for (let i = 0; i < currentEnemyAmount; ++i) {
		if (enemies[i].shouldSpawn) {
			enemies[i].spawnCountDown -= frameTime;

			if (enemies[i].spawnCountDown < 0) {
				enemies[i].spawn();
				if (isWaveSpawning && i == currentEnemyAmount - 1) {
					isWaveSpawning = false;
				}
			}
		} else if (enemies[i].isPlayingSpawnAnimation && enemies[i].position.y < enemies[i].startingYPos) {
			enemies[i].Mesh.translateY(0.2);
			if (enemies[i].position.y > enemies[i].startingYPos) {
				enemies[i].position.y = enemies[i].startingYPos;
				enemies[i].isPlayingSpawnAnimation = false;
			}
		}
	}
}

/** Detect and resolve collisions between models */
function collisions() {
	enemyCollisions();
	objectCollisions();
	wallCollisions();
}

/** Collisions between enemy and player models */
function enemyCollisions() {
	// Check every active enemy...
	enemies.forEach(a => {
		if (a.isSpawned) {
			enemies.forEach(b => {
				if (b.isSpawned) {
					if (b.position.distanceTo(a.position) < (a.radius + b.radius)) {
						let direction = a.position.clone().sub(b.position).normalize();
						a.position.add(direction.clone().multiplyScalar(a.moveSpeed * frameTime));
						b.position.add(direction.clone().multiplyScalar(-b.moveSpeed * frameTime));
					}
				}
			});
			while (a.position.distanceTo(player.position) < (a.radius + player.radius)) {
				let direction = a.position.clone().sub(player.position).normalize();
				a.position.add(direction.clone().multiplyScalar(a.moveSpeed * frameTime));
				//player.position.add(direction.clone().multiplyScalar(-player.radius / 10));
				a.attack();
				updateLowHPBackdrop();
				updateUI();
			}
		}
	});
}

/** Collisions between characters and objects */
function objectCollisions() {
	// TODO: Health packs, weapon drops, walls, etc

	// Check each object against the player
	hpDrops.forEach(d => {
		if (d.isSpawned) {
			if (d.position.distanceTo(player.position) < (player.radius * 2)) {
				player.heal(d.value);
				d.unspawn();
				game.packagesReceived++;
				updateLowHPBackdrop();
				updateUI();
			}
		}
	});
	weaponDrops.forEach(d => {
		if (d.isSpawned) {
			if (d.position.distanceTo(player.position) < (player.radius * 2)) {
				player.acquireWeapon(d.value);
				d.unspawn();
				game.packagesReceived++;
			}
		}
	});
}

/** Check if character against the walls */
function wallCollisions() {

}

/** Decrease weapon and health drop counters */
function updateDropCounters() {
	weaponDrops.forEach(function (v) {
		v.Mesh.rotateY(0.1);
	});

	hpDrops.forEach(function (v) {
		v.Mesh.rotateY(0.1);
	});

	if (Drop.weaponDropSpawnedThisWave) {
		weaponDropCounter -= frameTime;
	}
	if (player.HP < 10 && Drop.wavesSinceHPDrop >= Drop.wavesBetweenHPDrop) {
		healthDropCounter -= frameTime;
	}

	if (healthDropCounter < 0) {
		healthDropCounter = healthDropTime;
		makeDrop("HP");
	}
	if (weaponDropCounter < 0) {
		weaponDropCounter = weaponDropTime;
		makeDrop("weapon");
		Drop.weaponDropSpawnedThisWave = true;
	}
}

/**
 * Make a drop from the specified type
 * @param {string} type - Type of drop to be made
 */
function makeDrop(type) {
	// 1. Calculate random position
	const position = getRandomPosition();
	// 2. Set drop to position and calculate random index if weapon
	if (type == "weapon") {
		const value = Math.randomInterval(1, weapons.length - 1);
		let weapon = getNextWeaponDrop();
		if (!weapon.isSpawned) {
			weapon.spawn(position, value);
		}
	}

	if (type == "HP") {
		let hp = getNextHPDrop();
		if (!hp.isSpawned) {
			Drop.wavesSinceHPDrop = 0;
			hp.spawn(position, 2);
		}
	}
}

/** Trigger CSS animations */
function triggerIncomingWaveAnim() {
	let wave = $("#wave-number")[0];
	wave.classList.remove("incoming-wave-anim");
	void wave.offsetWidth;
	wave.classList.add("incoming-wave-anim");
}

/**
 * Check if there's any enemy alive
 * @returns {bool} Whether any enemy is alive
 */
function enemyAlive() {
	for (let i = 0; i < currentEnemyAmount; ++i) {
		if (enemies[i].isSpawned) {
			return true;
		}
	}
	return false;
}

/** Start spawning a new wave and prepare everything for the next wave*/
function spawnWave() {
	triggerIncomingWaveAnim();
	Audio.waveChangeSound.play();
	isWaveSpawning = true;
	game.waveNumber++;

	if (!Drop.weaponDropSpawnedThisWave) {
		makeDrop("weapon");
	}
	Drop.weaponDropSpawnedThisWave = false;
	Drop.wavesSinceHPDrop++;

	// Increase number of enemies to spawn
	currentEnemyAmount += 2;

	for (let i = 0; i < currentEnemyAmount; ++i) {
		enemies[i].shouldSpawn = true;
	}
}
