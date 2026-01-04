const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');
const CANNON = require('./cannon.min.js');
const Icon = require('./icon.png');



/**
 * Class for 3d Physics blocks
 */
class Fr3DBlocks {
    constructor(runtime) {
    /**
     * The runtime instantiating this block package.
     */
    this.runtime = runtime;
    this.CANNON = CANNON
    // Create the Cannon.js world before initializing other properties
    this.world = new this.CANNON.World();

    this._3d = {};
    this.Three = {};

    if (!vm.runtime.ext_jg3d) {
      vm.extensionManager.loadExtensionURL('jg3d')
        .then(() => {
          this._3d = vm.runtime.ext_jg3d;
          this.Three = this._3d.three;
        })
    } else {
      this._3d = vm.runtime.ext_jg3d;
      this.Three = this._3d.three;
    }
  }
    /**
     * metadata for this extension and its blocks.
     * @returns {object} -
     */
    getInfo() {
        return {
            id: 'fr3d',
            name: '3D Physics',
            color1: '#D066FE',
            color2: '#8000BC',
            blockIconURI: Icon,
            blocks: [
                {
                    opcode: 'step',
                    text: 'step simulation',
                    blockType: BlockType.COMMAND,
                },
                {
                    opcode: 'addp',
                    text: 'enable physics for [NAME1]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME1: { type: ArgumentType.STRING, defaultValue: "Object1" }
                    }
                },
                {
                    opcode: 'rmp',
                    text: 'disable physics for [NAME1]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME1: { type: ArgumentType.STRING, defaultValue: "Object1" }
                    }
                }
            ]
        };
    }
    createShapeFromGeometry(geometry) {
        if (geometry instanceof this.Three.BufferGeometry) {
            const vertices = geometry.attributes.position.array;
            const indices = [];

            for (let i = 0; i < vertices.length / 3; i++) {
            indices.push(i);
            }

            return new this.CANNON.Trimesh(vertices, indices);
        } else if (geometry instanceof this.Three.Geometry) {
            return new this.CANNON.ConvexPolyhedron(
            geometry.vertices.map((v) => new this.CANNON.Vec3(v.x, v.y, v.z)),
            geometry.faces.map((f) => [f.a, f.b, f.c]),
            );
        } else {
            console.warn('Unsupported geometry type for collision shape creation:', geometry.type);
            return null;
        }
    }

    enablePhysicsForObject(objectName) {
    if (!this._3d.scene) return;
    const object = this._3d.scene.getObjectByName(objectName);
    if (!object || !this._3d.scene) return;

    const shape = this.createShapeFromGeometry(object.geometry);

    if (!shape) {
      console.warn('Failed to create a valid shape for the object:', object.name);
      return;
    }

    const body = new this.CANNON.Body({
      mass: 1, // You might want to adjust mass based on object size/type
    });

    body.addShape(shape);
    this.world.addBody(body); // Add the body to the Cannon.js world

    object.userData.physicsBody = body;
  }

  disablePhysicsForObject(objectName) {
    const object = this._3d.scene.getObjectByName(objectName);
    if (!object || !object.userData || !object.userData.physicsBody) return;

    this.world.removeBody(object.userData.physicsBody); // Remove from world
    delete object.userData.physicsBody;
  }
    step() {
    // Step the Cannon.js world to simulate physics
    this.world.step(1/60); // Update at 60 fps (adjust timestep as needed)

    // Update Three.js object positions and rotations from physics bodies
    this._3d.scene.traverse((object) => {
      if (object.userData && object.userData.physicsBody) {
        object.position.copy(object.userData.physicsBody.position);
        object.quaternion.copy(object.userData.physicsBody.quaternion);
      }
    });
  }
    addp(args) {
        this.enablePhysicsForObject(Cast.toString(args.NAME1))
    }
    
    rmp(args) {
        this.disablePhysicsForObject(Cast.toString(args.NAME1))
    }
}

module.exports = Fr3DBlocks;
