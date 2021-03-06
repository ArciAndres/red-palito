/* globals Enemy,
bigZombieGeometry, bigZombieMaterial */

/**
 * Big enemy class (A.K.A. Biggies)
 */
class BigZombie extends Enemy { // eslint-disable-line no-unused-vars

	constructor() {
		super();
		this.moveSpeed = 2;// + Math.random();
		this.color = 0x724CAE;
		this.initialHP = 15;
		this.initialSpawnCountDown = Math.random();
		this.shouldSpawn = true;
		this.radius = 1;
		this.startingYPos = 2;
		this.sightDistance = 30;
		this.damage = 5;
		this.geometry = bigZombieGeometry;
		this.originalMaterial = bigZombieMaterial;
		this.material = this.originalMaterial;
		super.init();
	}

	/**
	 *
	 */
	playSound() {
		this.soundCounter = Math.randomInterval(2, 8);
		Audio.bigEnemySounds[Math.randomInterval(0, Audio.bigEnemySoundsLength - 1)].play();
	}
}
